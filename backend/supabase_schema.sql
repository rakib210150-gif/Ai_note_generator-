-- ==============================================================================
-- BRAIN NEST - COMPLETE SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TRIGGER HELPER FUNCTION: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABLES DEFINITION
-- ==============================================================================

-- 3.1 PROFILES TABLE
-- Linked with Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    coins INTEGER NOT NULL DEFAULT 500,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'mastery')),
    subscription_expires_at TIMESTAMPTZ,
    last_daily_bonus_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile upon auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, coins, subscription_tier)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        500,
        'free'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3.2 DOCUMENTS TABLE
-- Uploaded study documents, lecture slides, PDFs, etc.
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    extracted_text TEXT,
    char_count INTEGER NOT NULL DEFAULT 0,
    subject TEXT,
    chapter TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.3 NOTES TABLE
-- AI-generated revision notes and study sheets
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    chapter TEXT,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    output_type TEXT NOT NULL DEFAULT 'summary',
    language TEXT NOT NULL DEFAULT 'en',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    coin_cost INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.4 QUIZZES TABLE
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    chapter TEXT,
    title TEXT NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 5,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    coin_cost INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 3.5 QUIZ QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 3.6 QUIZ ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 3.7 TUTOR CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.tutor_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    subject TEXT,
    academic_level TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_tutor_conversations_updated_at
BEFORE UPDATE ON public.tutor_conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3.8 TUTOR MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.tutor_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.tutor_conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'tutor')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 3.9 QUESTION ANALYSES TABLE (Exam Intelligence / Past Questions)
CREATE TABLE IF NOT EXISTS public.question_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    chapter TEXT,
    board_or_exam TEXT,
    years_covered TEXT,
    top_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    repeated_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    predicted_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 3.10 REVISION SHEETS TABLE
CREATE TABLE IF NOT EXISTS public.revision_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    chapter TEXT,
    title TEXT NOT NULL,
    key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    formulas JSONB NOT NULL DEFAULT '[]'::jsonb,
    memory_aids JSONB NOT NULL DEFAULT '[]'::jsonb,
    quick_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    coin_cost INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 3.11 WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount INTEGER NOT NULL,
    action TEXT NOT NULL,
    reference_id UUID,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==============================================================================
-- 4. ATOMIC COIN FUNCTIONS (RPC)
-- ==============================================================================

-- 4.1 DEDUCT COINS ATOMICALLY
CREATE OR REPLACE FUNCTION public.deduct_coins_atomic(
    p_user_id UUID,
    p_amount INTEGER,
    p_action TEXT,
    p_ref_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_coins INTEGER;
    v_new_coins INTEGER;
    v_tx_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
    END IF;

    -- Row lock profile row to avoid race conditions
    SELECT coins INTO v_current_coins
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    IF v_current_coins < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient coins',
            'required', p_amount,
            'current', v_current_coins
        );
    END IF;

    v_new_coins := v_current_coins - p_amount;

    -- Update profile
    UPDATE public.profiles
    SET coins = v_new_coins
    WHERE id = p_user_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (
        user_id,
        type,
        amount,
        action,
        reference_id,
        balance_before,
        balance_after
    ) VALUES (
        p_user_id,
        'debit',
        p_amount,
        p_action,
        p_ref_id,
        v_current_coins,
        v_new_coins
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_coins,
        'new_balance', v_new_coins,
        'transaction_id', v_tx_id
    );
END;
$$;


-- 4.2 ADD COINS ATOMICALLY
CREATE OR REPLACE FUNCTION public.add_coins_atomic(
    p_user_id UUID,
    p_amount INTEGER,
    p_action TEXT,
    p_ref_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_coins INTEGER;
    v_new_coins INTEGER;
    v_tx_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
    END IF;

    -- Row lock profile row
    SELECT coins INTO v_current_coins
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    v_new_coins := v_current_coins + p_amount;

    -- Update profile
    UPDATE public.profiles
    SET coins = v_new_coins
    WHERE id = p_user_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (
        user_id,
        type,
        amount,
        action,
        reference_id,
        balance_before,
        balance_after
    ) VALUES (
        p_user_id,
        'credit',
        p_amount,
        p_action,
        p_ref_id,
        v_current_coins,
        v_new_coins
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_coins,
        'new_balance', v_new_coins,
        'transaction_id', v_tx_id
    );
END;
$$;


-- ==============================================================================
-- 5. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_document_id ON public.notes(document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_user_id ON public.tutor_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_messages_conversation_id ON public.tutor_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_question_analyses_user_id ON public.question_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_revision_sheets_user_id ON public.revision_sheets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);


-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: users read & update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Documents
DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;
CREATE POLICY "Users can manage own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);

-- Notes
DROP POLICY IF EXISTS "Users can manage own notes" ON public.notes;
CREATE POLICY "Users can manage own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);

-- Quizzes
DROP POLICY IF EXISTS "Users can manage own quizzes" ON public.quizzes;
CREATE POLICY "Users can manage own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);

-- Quiz Questions (accessible if user owns the parent quiz)
DROP POLICY IF EXISTS "Users can manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can manage quiz questions" ON public.quiz_questions FOR ALL
USING (EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_questions.quiz_id AND user_id = auth.uid()));

-- Quiz Attempts
DROP POLICY IF EXISTS "Users can manage own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can manage own attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = user_id);

-- Tutor Conversations & Messages
DROP POLICY IF EXISTS "Users can manage own tutor conversations" ON public.tutor_conversations;
CREATE POLICY "Users can manage own tutor conversations" ON public.tutor_conversations FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own tutor messages" ON public.tutor_messages;
CREATE POLICY "Users can manage own tutor messages" ON public.tutor_messages FOR ALL
USING (EXISTS (SELECT 1 FROM public.tutor_conversations WHERE id = tutor_messages.conversation_id AND user_id = auth.uid()));

-- Question Analyses
DROP POLICY IF EXISTS "Users can manage own analyses" ON public.question_analyses;
CREATE POLICY "Users can manage own analyses" ON public.question_analyses FOR ALL USING (auth.uid() = user_id);

-- Revision Sheets
DROP POLICY IF EXISTS "Users can manage own revision sheets" ON public.revision_sheets;
CREATE POLICY "Users can manage own revision sheets" ON public.revision_sheets FOR ALL USING (auth.uid() = user_id);

-- Wallet Transactions (read-only for user, mutations happen via RPC)
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);


-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET CONFIGURATION
-- ==============================================================================
-- Ensure the storage bucket for uploaded documents exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('study_materials', 'study_materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'study_materials' bucket
DROP POLICY IF EXISTS "Authenticated users can upload study materials" ON storage.objects;
CREATE POLICY "Authenticated users can upload study materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'study_materials' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own study materials" ON storage.objects;
CREATE POLICY "Users can view their own study materials"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'study_materials' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own study materials" ON storage.objects;
CREATE POLICY "Users can delete their own study materials"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'study_materials' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==============================================================================
-- 8. DEPENDENCY GRAPHS TABLE (AI Learning Roadmap & Prerequisite Graphs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.dependency_graphs (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    target_topic TEXT NOT NULL,
    learning_goal TEXT,
    academic_level TEXT NOT NULL DEFAULT 'intermediate',
    subject TEXT,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_dependency_graphs_updated_at
BEFORE UPDATE ON public.dependency_graphs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.dependency_graphs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own dependency graphs" ON public.dependency_graphs;
CREATE POLICY "Users can manage own dependency graphs" ON public.dependency_graphs FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_dependency_graphs_user_id ON public.dependency_graphs(user_id);
