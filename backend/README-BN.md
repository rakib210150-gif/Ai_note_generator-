# ব্রেন নেস্ট (Brain Nest) ব্যাকএন্ড — বাংলা সেটআপ গাইড

স্বাগতম **Brain Nest** এআই-চালিত লার্নিং প্ল্যাটফর্মের ব্যাকএন্ড গাইডে। এই ব্যাকএন্ডটি শিক্ষার্থীদের পরীক্ষার প্রস্তুতি, অটোমেটিক এআই নোট জেনারেশন, কুইজ তৈরি ও স্কোরিং, অতীতের প্রশ্নপত্র বিশ্লেষণ, এআই টিউটর এবং কয়েন ওয়ালেট পরিচালনার জন্য তৈরি করা হয়েছে।

---

## ১. প্রয়োজনীয় সফটওয়্যার
- **Node.js**: v20 বা তার পরবর্তী সংস্করণ (চেক করতে টার্মিনালে লিখুন: `node -v`)
- **Git**
- **Supabase অ্যাকাউন্ট** (ডাটাবেজ এবং অথেনটিকেশনের জন্য)
- **Google Gemini API Key** (এআই ফিচারের জন্য)
- **Postman** (এপিআই টেস্টিংয়ের জন্য)

---

## ২. প্রজেক্ট সেটআপ নির্দেশিকা

### ধাপ ১: ডিপেনডেন্সি ইনস্টল করা
টার্মিনালে `backend` ফোল্ডারে প্রবেশ করে প্যাকেজগুলো ইনস্টল করুন:
```bash
cd backend
npm install
```

### ধাপ ২: Supabase কনফিগারেশন
1. [supabase.com](https://supabase.com)-এ গিয়ে একটি ফ্রি প্রজেক্ট তৈরি করুন।
2. **Project Settings -> API** সেকশনে যান:
   - **Project URL** কপি করুন
   - **anon / public key** কপি করুন
   - **service_role key** কপি করুন (এটি গোপনীয়)
3. **Storage** মেনুতে গিয়ে একটি নতুন প্রাইভেট বাকেট তৈরি করুন যার নাম দিন: `study_materials`।
4. **SQL Editor** মেনুতে যান:
   - `backend/supabase/migrations/001_initial_schema.sql` ফাইলের সব কোড কপি করে Supabase SQL Editor-এ পেস্ট করে **Run** চাপুন।
   - এটি ২০টি প্রয়োজনীয় টেবিল, RLS সিকিউরিটি পলিসি এবং কয়েন লেনদেনের জন্য পারমাণবিক (atomic) ফাংশন তৈরি করে দেবে।

### ধাপ ৩: Google Gemini API Key সংগ্রহ
1. [Google AI Studio](https://aistudio.google.com)-এ যান।
2. **Get API Key** বাটনে ক্লিক করে একটি নতুন কি তৈরি করে কপি করে নিন।

### ধাপ ৪: .env ফাইল তৈরি করা
`backend/.env.example` ফাইলটি কপি করে `backend/.env` নামে সংরক্ষণ করুন এবং আপনার তথ্যগুলো বসিয়ে দিন:
```env
NODE_ENV=development
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=study_materials
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash
MAX_UPLOAD_MB=15
```

### ধাপ ৫: ব্যাকএন্ড রান করা
- ডেভেলপমেন্ট মোডে চালাতে:
  ```bash
  npm run dev
  ```
- অটোমেটেড টেস্ট চালাতে:
  ```bash
  npm test
  ```
- প্রোডাকশন বিল্ড তৈরি করতে:
  ```bash
  npm run build
  ```

---

## ৩. গুরুত্বপূর্ণ এপিআই এন্ডপয়েন্টসমূহ
- **Health Check**: `GET /api/v1/health`
- **Registration**: `POST /api/v1/auth/signup`
- **Login**: `POST /api/v1/auth/login`
- **My Profile**: `GET /api/v1/auth/me`
- **Document Upload**: `POST /api/v1/documents` (PDF, DOCX, TXT)
- **AI Notes**: `POST /api/v1/notes/generate`
- **AI Quiz**: `POST /api/v1/quizzes/generate`
- **Quiz Scoring**: `POST /api/v1/quizzes/:id/attempts`
- **Question Analysis**: `POST /api/v1/question-papers/analyze`
- **AI Tutor Chat**: `POST /api/v1/tutor/message` (বাংলা ও ইংরেজি উভয় ভাষায় উত্তর দেয়)
- **Revision Sheets**: `POST /api/v1/revision/generate`
- **Wallet & Coins**: `GET /api/v1/wallet`, `POST /api/v1/wallet/daily-bonus`

---

## ৪. পোস্টম্যান (Postman) কালেকশন ইমপোর্ট
সহজে এপিআই টেস্ট করার জন্য `backend/brain-nest.postman_collection.json` ফাইলটি সরাসরি আপনার Postman অ্যাপে **Import** করুন।
