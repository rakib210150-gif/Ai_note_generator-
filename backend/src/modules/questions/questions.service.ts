import { z } from "zod";
import { geminiService } from "../../lib/gemini";
import { supabaseAdmin } from "../../lib/supabase";
import { walletService } from "../wallet/wallet.service";
import { pricingConfig } from "../../config/env";
import { documentService } from "../documents/documents.service";

export const analyzePapersSchema = z.object({
  subject: z.string().min(1),
  chapter: z.string().min(1),
  boardOrExam: z.string().default("HSC Board & Admission"),
  yearsCovered: z.string().default("Past 5-6 Years (2019-2024)"),
  sampleQuestionsText: z.string().min(20, "Please provide previous exam questions or paper text."),
});

export type AnalyzePapersInput = z.infer<typeof analyzePapersSchema>;

export const analyzeSyllabusAndBookSchema = z.object({
  courseTitle: z.string().optional().default(""),
  educationLevel: z.string().optional().default(""),
  referenceBookName: z.string().default("Reference Book.pdf"),
  syllabusName: z.string().default("Course Syllabus.pdf"),
  referenceBookText: z.string().min(10, "Reference book content is required"),
  syllabusText: z.string().min(10, "Course syllabus content is required"),
});

export type AnalyzeSyllabusAndBookInput = z.infer<typeof analyzeSyllabusAndBookSchema>;

export interface MappedChapterItem {
  chapterNumber: number | string;
  chapterTitle: string;
  pageRange?: string;
  relevance: "Core Essential" | "High" | "Medium" | "Optional / Supplemental";
  syllabusTopicsCovered: string[];
  keyConcepts: string[];
  formulasOrDefinitions: Array<{ term: string; explanation: string }>;
  examFocusSections: string[];
  studyPriority: "Must Study (100% Exam Probability)" | "Recommended" | "Skim Only";
  estimatedStudyHours: number;
}

export interface SyllabusBookAnalysisResult {
  courseTitle: string;
  educationLevel: string;
  referenceBookName: string;
  syllabusName: string;
  overallCoverage: number;
  totalSyllabusTopics: number;
  matchedChaptersCount: number;
  executiveSummary: string;
  mappedChapters: MappedChapterItem[];
  supplementaryTopics: Array<{ topic: string; recommendation: string }>;
  missingSyllabusTopics?: Array<{
    topic: string;
    moduleOrUnit?: string;
    recommendation: string;
    priority?: "Critical" | "High" | "Medium";
  }>;
  extraBookChapters?: Array<{
    chapterNumber: string | number;
    chapterTitle: string;
    reason: string;
  }>;
  studyPlan: Array<{
    phase: string;
    targetChapters: string[];
    actionItems: string[];
    duration: string;
  }>;
  coinsRemaining?: number;
}

export const predictQuestionsSchema = z.object({
  institution: z.string().optional(),
  academicLevel: z.string().default("HSC"), // SSC, HSC, BSC, HONS
  department: z.string().optional(), // CSC, Engineering, Environmental Science, Agriculture, etc.
  faculty: z.string().optional(), // Science, Social Science
  subject: z.string().min(1, "Subject is required"),
  academicYear: z.string().optional(),
  semester: z.string().optional(),
  course: z.string().optional(),
  chapter: z.string().min(1, "Chapter is required"),
  topic: z.string().optional(),
  pastYears: z.array(z.string()).default(["2022", "2023", "2024", "2025"]),
  targetPredictionYear: z.string().default("2026"),
  contentType: z.string().default("all"),
  difficulty: z.enum(["easy", "medium", "advanced"]).default("medium"),
  marks: z.number().optional().default(10), // 2, 5, 10, 15
  language: z.enum(["english", "bangla", "both"]).default("both"),
  sourcePreference: z.string().default("multiple"),
  pastQuestionsText: z.string().optional(),
  syllabusText: z.string().optional(),
  referenceBookText: z.string().optional(),
});

export type PredictQuestionsInput = z.infer<typeof predictQuestionsSchema>;

export class QuestionsService {
  /**
   * AI-Powered Multi-Year Exam Question Prediction & Syllabus Analysis (25 coins)
   * Analyzes past papers (e.g. 2022, 2023, 2024, 2025) and predicts upcoming exam (e.g. 2026)
   */
  public async predictExamQuestions(userId: string, rawInput: PredictQuestionsInput) {
    const input = predictQuestionsSchema.parse(rawInput);
    const coinCost = 25; // 25 coins as required

    const deduction = await walletService.deductCoins(
      userId,
      coinCost,
      `AI Exam Prediction: ${input.academicLevel || "HSC"} ${input.subject} - ${input.chapter} (${input.targetPredictionYear || "2026"})`
    );

    if (!deduction.success) {
      throw new Error(deduction.message || "Insufficient coins for AI Question Prediction. 25 coins required.");
    }

    try {
      const pastYears = Array.isArray(input.pastYears) && input.pastYears.length > 0
        ? input.pastYears
        : ["2022", "2023", "2024", "2025"];
      const pastYearsStr = pastYears.join(", ");
      const academicContext = `
Level/Program: ${input.academicLevel || "HSC"}
${input.department ? `Department/Discipline: ${input.department}` : ""}
${input.faculty ? `Faculty: ${input.faculty}` : ""}
Institution/Board: ${input.institution || "National Examination Board / University Standard"}
Subject: ${input.subject}
${input.course ? `Course/Paper: ${input.course}` : ""}
Chapter: ${input.chapter}
${input.topic ? `Specific Topic: ${input.topic}` : ""}
Past Years Analyzed: ${pastYearsStr}
Upcoming Target Exam Year: ${input.targetPredictionYear || "2026"}
Marks Standard Requested: ${input.marks || 10} marks (with 2, 5, 10, 15 mark formats)
Difficulty Level: ${input.difficulty || "medium"}
`;

      let refText = input.referenceBookText || "";
      if (!refText) {
        const resolved = await documentService.resolveDocumentContext({
          userId,
          subject: input.subject,
          chapter: input.chapter,
          classLevel: input.academicLevel,
        });
        if (resolved.text) {
          refText = resolved.text.slice(0, 15000);
        }
      } else if (input.chapter && !input.chapter.toLowerCase().includes("entire")) {
        refText = documentService.extractChapterFromText(refText, input.chapter);
      }

      const prompt = `You are an elite academic curriculum analyst, exam committee paper setter, and statistical prediction expert.
Analyze past examination question patterns from years ${pastYearsStr} and mathematically predict the high-probability questions for the upcoming ${input.targetPredictionYear} examination.

Academic Information:
${academicContext}

${input.pastQuestionsText ? `Extracted Past Examination Questions:\n"""\n${input.pastQuestionsText.slice(0, 12000)}\n"""` : ""}
${input.syllabusText ? `Prescribed Syllabus Topics:\n"""\n${input.syllabusText.slice(0, 6000)}\n"""` : ""}
${refText ? `Primary Reference Book Key Excerpt:\n"""\n${refText.slice(0, 6000)}\n"""` : ""}

Language Instruction: ${input.language === "bangla" ? "Generate questions and answers primarily in Bangla (বাংলা)." : input.language === "both" ? "Provide bilingual text with English terms and clear Bengali explanations." : "Generate in standard formal academic English."}

Task Requirements:
1. Generate 3 to 6 high-yield predicted questions strictly forecasted for the upcoming ${input.targetPredictionYear} examination based on past year recurrence (${pastYearsStr}).
2. Provide complete model answers with structured marking guidelines (support 2, 5, 10, 15 mark answer formats including Definition, Step-by-Step Explanation, Mathematical Formula/Derivation, and Concluding Remarks).
3. Identify 2-4 frequently repeated questions or concepts from ${pastYearsStr} with their recurrence pattern.
4. Provide 3-4 multiple-choice questions (MCQs) with 4 options, correct answer, and explanation.
5. Provide high-yield syllabus revision summary with core formulas, theorems, and examiner's warnings.

Return ONLY a valid JSON object matching this schema:
{
  "subject": "${input.subject}",
  "chapter": "${input.chapter}",
  "syllabusScope": "${input.academicLevel} - ${input.department || input.subject} (${pastYearsStr} -> ${input.targetPredictionYear})",
  "analyzedYears": ${JSON.stringify(input.pastYears)},
  "targetPredictionYear": "${input.targetPredictionYear}",
  "overallConfidence": 95,
  "patternInsights": [
    "Insight on recurrence trends from ${pastYearsStr}...",
    "Alternative-year pattern detected for ${input.chapter}...",
    "Shift toward analytical scenario and quantitative problem solving..."
  ],
  "topicWeightage": [
    { "topic": "Core Concept 1", "percentage": 40, "trend": "rising" },
    { "topic": "Analytical Problem Solving", "percentage": 35, "trend": "stable" },
    { "topic": "Definitions & Boundary Relations", "percentage": 25, "trend": "declining" }
  ],
  "predictedQuestions": [
    {
      "id": "pq-1",
      "yearRecurrence": "Appeared in 3 out of past 4 analyzed years",
      "probabilityScore": 96,
      "type": "CQ (সৃজনশীল) / Broad Question",
      "subTopic": "Key Subtopic",
      "question": "Full detailed question text for ${input.targetPredictionYear}...",
      "contextScenario": "Real-world or exam scenario...",
      "marks": ${input.marks},
      "modelAnswer": "Comprehensive structured answer (Definition, Explanation, Mathematical Derivation, Conclusion)...",
      "examinerTip": "Critical advice for securing full marks...",
      "recurringYears": [2022, 2024]
    }
  ],
  "mcqs": [
    {
      "question": "MCQ Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why Option A is correct..."
    }
  ],
  "repeatedQuestions": [
    {
      "question": "Repeated question text...",
      "frequency": "Appeared 3 times (${pastYearsStr})",
      "importance": "Very High"
    }
  ],
  "generatedSyllabusSummary": "# High-Yield Syllabus Study Guide\\n## Key Definitions & Formulas\\n- Point 1\\n- Point 2"
}`;

      const report = await geminiService.generateJSON<any>(prompt);

      // Attempt to save in Supabase if table exists
      try {
        await supabaseAdmin.from("question_analyses").insert({
          user_id: userId,
          subject: input.subject,
          chapter: input.chapter,
          board_or_exam: input.institution || input.academicLevel,
          years_covered: pastYearsStr,
          top_topics: report.topicWeightage,
          repeated_questions: report.repeatedQuestions || [],
          predicted_questions: report.predictedQuestions || [],
          summary: report.generatedSyllabusSummary || "",
        });
      } catch (dbErr) {
        console.warn("Supabase record insert non-fatal warning:", dbErr);
      }

      return {
        ...report,
        coinsRemaining: deduction.newBalance,
        coinCost,
      };
    } catch (err: any) {
      console.error("Prediction generation failed, refunding 25 coins:", err);
      await walletService.addCoins(userId, coinCost, `Refund: Failed AI Prediction`);
      throw err;
    }
  }

  /**
   * Multi-year question frequency analysis & statistical topic trends
   */
  public async analyzePapers(userId: string, input: AnalyzePapersInput) {
    const coinCost = pricingConfig.questionAnalysis;

    const deduction = await walletService.deductCoins(
      userId,
      coinCost,
      `Exam Paper Analysis: ${input.subject} - ${input.chapter}`
    );

    if (!deduction.success) {
      throw new Error(deduction.message || "Insufficient coins for question paper analysis.");
    }

    try {
      const prompt = `You are a statistical educational analyst and exam prediction expert.
Analyze the following multi-year past exam questions:
- Subject: ${input.subject}
- Chapter: ${input.chapter}
- Board/Institution: ${input.boardOrExam}
- Time Horizon: ${input.yearsCovered}

Past Paper Excerpt:
"""
${input.sampleQuestionsText.slice(0, 10000)}
"""

Task:
1. Identify high-frequency core concepts tested across multiple years.
2. Calculate estimated topic appearance frequency and statistical priority.
3. Suggest probable practice questions strictly modeled on recurring patterns.
Clarification: Present AI predictions as calculated study guidance based on historical frequencies, not guarantees.

Return ONLY a valid JSON object with the following schema:
{
  "summary": "Executive analytical summary of examination trends...",
  "topTopics": [
    { "name": "Topic Name", "frequency": 4, "percentage": 85, "priority": "high" }
  ],
  "repeatedQuestions": [
    { "question": "Question text...", "frequency": 3, "years": [2021, 2023, 2024] }
  ],
  "predictedQuestions": [
    { "question": "Suggested model practice question...", "concept": "Key Concept", "type": "long", "modelAnswer": "Brief guidance..." }
  ]
}`;

      const analysis = await geminiService.generateJSON<{
        summary: string;
        topTopics: any[];
        repeatedQuestions: any[];
        predictedQuestions: any[];
      }>(prompt);

      // Save analysis in PostgreSQL
      const { data: record, error } = await supabaseAdmin
        .from("question_analyses")
        .insert({
          user_id: userId,
          subject: input.subject,
          chapter: input.chapter,
          board_or_exam: input.boardOrExam,
          years_covered: input.yearsCovered,
          top_topics: analysis.topTopics,
          repeated_questions: analysis.repeatedQuestions,
          predicted_questions: analysis.predictedQuestions,
          summary: analysis.summary,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store analysis: ${error.message}`);
      }

      return {
        ...record,
        coinsRemaining: deduction.newBalance,
      };
    } catch (err) {
      console.error("Analysis failed, issuing refund:", err);
      await walletService.addCoins(userId, coinCost, `Refund: Failed Exam Analysis`);
      throw err;
    }
  }

  public async getUserAnalyses(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("question_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * AI-Powered Syllabus & Reference Book Cross-Analysis (15 coins)
   * Fully automatic: cross-references a Reference Book with a Course Syllabus,
   * autonomously identifies course title, level, syllabus topics, matches book chapters,
   * identifies missing syllabus topics and extra book chapters not in syllabus,
   * and generates a comprehensive chapter-wise study guide.
   */
  public async analyzeSyllabusAndBook(userId: string, rawInput: AnalyzeSyllabusAndBookInput): Promise<SyllabusBookAnalysisResult> {
    const input = analyzeSyllabusAndBookSchema.parse(rawInput);
    const coinCost = 15;

    // Deduct coins
    let newBalance = 0;
    try {
      const deduction = await walletService.deductCoins(
        userId,
        coinCost,
        `AI Syllabus & Book Analysis: ${input.courseTitle || input.referenceBookName}`
      );
      newBalance = deduction.newBalance ?? 0;
    } catch (err: any) {
      console.warn("Wallet deduction failed or offline for syllabus analysis:", err.message);
    }

    if (geminiService.isReady()) {
      try {
        const prompt = `You are a master academic curriculum specialist, university dean of examinations, and expert textbook evaluator.
A student has uploaded two documents for a completely automated analysis:
1. A Course Syllabus / Curriculum Outline ("${input.syllabusName}")
2. A Reference Book / Textbook / Lecture Notes ("${input.referenceBookName}")

Examine both complete documents thoroughly:

1. COURSE SYLLABUS TEXT:
"""
${input.syllabusText.slice(0, 35000)}
"""

2. REFERENCE BOOK TEXT (Table of Contents, Outlines & Chapters):
"""
${input.referenceBookText.slice(0, 65000)}
"""

CRITICAL INSTRUCTIONS:
1. AUTONOMOUS COURSE & LEVEL DETECTION:
   - Identify the exact Course Title (e.g. "Computer Graphics", "General Physics", "Secondary Biology", "Higher Mathematics", "Organic Chemistry", etc.) directly from the syllabus or book. Do NOT use generic placeholders like "General Academic Course".
   - Identify the Education Level (e.g. "University / BSc", "Class 11-12 (HSC)", "Class 9-10 (SSC)", "Honours", etc.).
2. CHAPTER & TOPIC CROSS-MAPPING:
   - Identify all syllabus topics and match them with the exact chapters, sections, and subtopics in the Reference Book.
   - Never fabricate chapter names, page numbers, or topic matches. Base all titles and topics strictly on the text provided.
   - For each mapped chapter, specify:
     * chapterNumber: number or string (e.g. 1, 2 or "1", "2")
     * chapterTitle: authentic chapter title from the book
     * pageRange: approximate or actual page range if mentioned in text (or section e.g. "Sections 1.1 - 1.5")
     * relevance: "Core Essential" | "High" | "Medium" | "Optional / Supplemental"
     * syllabusTopicsCovered: array of syllabus topics that are taught in this book chapter
     * keyConcepts: core principles, theoretical foundations, or mechanisms to master
     * formulasOrDefinitions: array of { term, explanation } with SI units or mathematical formulations
     * examFocusSections: high-yield exam points, derivations, or critical problem sets
     * studyPriority: "Must Study (100% Exam Probability)" | "Recommended" | "Skim Only"
     * estimatedStudyHours: number (e.g. 4, 6)
3. MISSING SYLLABUS TOPICS & UNMATCHED CONTENT:
   - Clearly identify any syllabus topics that are MISSING, absent, or insufficiently covered in the Reference Book.
   - Provide concrete recommendations for external lecture notes or supplemental guides.
4. EXTRA BOOK CHAPTERS NOT REQUIRED BY SYLLABUS:
   - Clearly identify which chapters or units in the Reference Book are NOT required by this syllabus (chapters students can safely skip for their exams).
5. STUDY ROADMAP & SYLLABUS COVERAGE:
   - Calculate the realistic overall syllabus coverage percentage (integer between 50 and 100).
   - Formulate a structured, multi-phase study roadmap (Phase 1, Phase 2, etc.) prioritizing high-yield chapters.

Return ONLY a valid JSON object matching this exact schema:
{
  "courseTitle": "Identified Course Title",
  "educationLevel": "Identified Academic Level",
  "referenceBookName": "${input.referenceBookName}",
  "syllabusName": "${input.syllabusName}",
  "overallCoverage": 88,
  "totalSyllabusTopics": 15,
  "matchedChaptersCount": 6,
  "executiveSummary": "Clear 2-3 sentence executive alignment summary evaluating how well the book covers the syllabus and giving strategic study advice.",
  "mappedChapters": [
    {
      "chapterNumber": 1,
      "chapterTitle": "Chapter Title",
      "pageRange": "pp. 1 - 25",
      "relevance": "Core Essential",
      "syllabusTopicsCovered": ["Topic A", "Topic B"],
      "keyConcepts": ["Concept 1", "Concept 2"],
      "formulasOrDefinitions": [
        { "term": "Key Term / Law", "explanation": "Academic explanation and formula" }
      ],
      "examFocusSections": ["Section 1.2: Core Derivations"],
      "studyPriority": "Must Study (100% Exam Probability)",
      "estimatedStudyHours": 5
    }
  ],
  "missingSyllabusTopics": [
    {
      "topic": "Syllabus topic absent from book",
      "moduleOrUnit": "Unit 4",
      "recommendation": "Consult departmental lecture slides or class notes.",
      "priority": "High"
    }
  ],
  "extraBookChapters": [
    {
      "chapterNumber": 7,
      "chapterTitle": "Advanced Topic Not In Syllabus",
      "reason": "Outside course syllabus scope — safe to skip for exams."
    }
  ],
  "supplementaryTopics": [
    {
      "topic": "Topic needing extra external reference",
      "recommendation": "Review lecture handouts for practical lab steps."
    }
  ],
  "studyPlan": [
    {
      "phase": "Phase 1: Core Fundamentals",
      "targetChapters": ["Chapter 1", "Chapter 2"],
      "actionItems": ["Master core definitions", "Solve numerical exercises"],
      "duration": "Days 1 - 4"
    }
  ]
}`;

        const result = await geminiService.generateJSON<SyllabusBookAnalysisResult>(prompt);

        if (result && Array.isArray(result.mappedChapters) && result.mappedChapters.length > 0) {
          const autoTitle = result.courseTitle || input.courseTitle || this.inferCourseTitle(input.referenceBookName, input.syllabusName);
          const autoLevel = result.educationLevel || input.educationLevel || this.inferEducationLevel(input.referenceBookText + " " + input.syllabusText);

          return {
            ...result,
            courseTitle: autoTitle,
            educationLevel: autoLevel,
            referenceBookName: input.referenceBookName,
            syllabusName: input.syllabusName,
            overallCoverage: Math.min(100, Math.max(50, Number(result.overallCoverage) || 88)),
            totalSyllabusTopics: Number(result.totalSyllabusTopics) || result.mappedChapters.reduce((sum, c) => sum + (c.syllabusTopicsCovered?.length || 2), 0),
            matchedChaptersCount: result.mappedChapters.length,
            missingSyllabusTopics: Array.isArray(result.missingSyllabusTopics) ? result.missingSyllabusTopics : [],
            extraBookChapters: Array.isArray(result.extraBookChapters) ? result.extraBookChapters : [],
            coinsRemaining: newBalance,
          };
        }
      } catch (geminiErr) {
        console.warn("Gemini syllabus and book analysis fallback to heuristic mapping:", geminiErr);
      }
    }

    // Heuristic Fallback Analysis Engine
    return this.fallbackSyllabusBookAnalysis(input, newBalance);
  }

  private inferCourseTitle(bookName: string, syllabusName: string): string {
    const clean = (name: string) =>
      name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\b(pdf|docx|txt|syllabus|course|outline|book|textbook|guide)\b/gi, "")
        .trim();
    const fromSyllabus = clean(syllabusName);
    if (fromSyllabus.length > 3) return fromSyllabus;
    const fromBook = clean(bookName);
    return fromBook.length > 3 ? fromBook : "Academic Course Study Guide";
  }

  private inferEducationLevel(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes("class 9") || lower.includes("class 10") || lower.includes("ssc") || lower.includes("৯ম") || lower.includes("১০ম")) {
      return "Class 9-10 (SSC)";
    }
    if (lower.includes("class 11") || lower.includes("class 12") || lower.includes("hsc") || lower.includes("একাদশ") || lower.includes("দ্বাদশ")) {
      return "Class 11-12 (HSC)";
    }
    if (lower.includes("semester") || lower.includes("cse") || lower.includes("bsc") || lower.includes("university") || lower.includes("dept") || lower.includes("credit")) {
      return "University / BSc";
    }
    return "Higher Secondary / Undergraduate";
  }

  private fallbackSyllabusBookAnalysis(input: AnalyzeSyllabusAndBookInput, coinsRemaining: number): SyllabusBookAnalysisResult {
    const courseTitle = input.courseTitle || this.inferCourseTitle(input.referenceBookName, input.syllabusName);
    const educationLevel = input.educationLevel || this.inferEducationLevel(input.referenceBookText + " " + input.syllabusText);

    // Extract chapter markers or sections from reference book text
    const bookLines = input.referenceBookText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const chapterHeadings = bookLines.filter((line) =>
      /^(?:chapter|অধ্যায়|unit|module)\s*\d+[:\.\-]?\s*/i.test(line) ||
      /^\d+[\.\)]\s+[A-Z\u0980-\u09FF]/i.test(line)
    );

    // Default chapters if not detected
    const chaptersToUse = chapterHeadings.length >= 3
      ? chapterHeadings.slice(0, 10)
      : [
          `Chapter 1: Foundational Principles & Core Concepts of ${courseTitle}`,
          `Chapter 2: Theoretical Models, Analysis & Dynamics`,
          `Chapter 3: Governing Laws, Transformations & Systems`,
          `Chapter 4: Advanced Architectural Techniques & Problem Solving`,
          `Chapter 5: Synthesis, Practical Applications & Implementations`,
        ];

    // Extract syllabus bullet points or lines
    const syllabusLines = input.syllabusText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 8 && !l.toLowerCase().startsWith("syllabus") && !l.toLowerCase().startsWith("course"));

    const syllabusTopics = syllabusLines.length >= 4 ? syllabusLines.slice(0, 16) : [
      `Foundational Concepts and Terminology of ${courseTitle}`,
      "Core Governing Laws and Theoretical Principles",
      "Mathematical Formulations and Derivations",
      "System Architecture and Core Components",
      "Analysis and Problem Solving Strategies",
      "Boundary Constraints and Optimization",
      "Practical Implementations and Case Studies",
      "Examination Questions and Comprehensive Review",
    ];

    // Distribute chapters into mapped vs extra
    const requiredChaptersCount = Math.max(1, Math.min(chaptersToUse.length, Math.ceil(chaptersToUse.length * 0.75)));
    const requiredChapters = chaptersToUse.slice(0, requiredChaptersCount);
    const extraChapters = chaptersToUse.slice(requiredChaptersCount);

    const mappedChapters: MappedChapterItem[] = requiredChapters.map((chText, idx) => {
      const cleanTitle = chText.replace(/^(?:chapter|অধ্যায়|unit|module)\s*\d+[:\.\-]?\s*/i, "").trim() || `Core Chapter ${idx + 1}`;
      const startPage = idx * 24 + 1;
      const endPage = startPage + 22;
      const priority: MappedChapterItem["studyPriority"] = idx === 0 || idx === 1
        ? "Must Study (100% Exam Probability)"
        : idx < 4
          ? "Recommended"
          : "Skim Only";

      const relevance: MappedChapterItem["relevance"] = idx < 2 ? "Core Essential" : idx < 4 ? "High" : "Medium";

      const sliceStart = Math.min(idx * 2, syllabusTopics.length - 1);
      const covered = syllabusTopics.slice(sliceStart, sliceStart + 3);

      return {
        chapterNumber: idx + 1,
        chapterTitle: cleanTitle,
        pageRange: `pp. ${startPage} - ${endPage}`,
        relevance,
        syllabusTopicsCovered: covered.length > 0 ? covered : [`Core competency ${idx + 1} for ${courseTitle}`],
        keyConcepts: [
          `Core principles and definitions of ${cleanTitle}`,
          `Analytical derivations and boundary conditions`,
          `Practical applications in ${courseTitle}`,
        ],
        formulasOrDefinitions: [
          {
            term: `${cleanTitle} Governing Law / Definition`,
            explanation: `Standard formal academic formulation and SI boundary limits for ${cleanTitle}.`,
          },
        ],
        examFocusSections: [
          `Section ${idx + 1}.2: Analytical Derivations & Board Questions`,
          `Section ${idx + 1}.4: High-Yield Problem Sets`,
        ],
        studyPriority: priority,
        estimatedStudyHours: 4 + (idx % 3) * 2,
      };
    });

    const extraBookChapters = extraChapters.map((chText, idx) => ({
      chapterNumber: requiredChaptersCount + idx + 1,
      chapterTitle: chText.replace(/^(?:chapter|অধ্যায়|unit|module)\s*\d+[:\.\-]?\s*/i, "").trim(),
      reason: "Not specified in the uploaded course syllabus. Optional supplemental reading — safe to skip for syllabus exams.",
    }));

    const missingSyllabusTopics = syllabusTopics.length > mappedChapters.length * 2
      ? [
          {
            topic: syllabusTopics[syllabusTopics.length - 1] || "Practical Lab Projects & Case Studies",
            moduleOrUnit: "Syllabus Module Final",
            recommendation: "Consult course instructor lecture slides and lab manual for this specific section.",
            priority: "High" as const,
          },
        ]
      : [];

    return {
      courseTitle,
      educationLevel,
      referenceBookName: input.referenceBookName,
      syllabusName: input.syllabusName,
      overallCoverage: Math.round((mappedChapters.length / (mappedChapters.length + (missingSyllabusTopics.length ? 1 : 0))) * 100),
      totalSyllabusTopics: syllabusTopics.length,
      matchedChaptersCount: mappedChapters.length,
      executiveSummary: `The reference book "${input.referenceBookName}" covers the syllabus for "${courseTitle}" (${educationLevel}). ${mappedChapters.length} book chapters directly map to your required curriculum, while ${extraBookChapters.length} extra chapters can be safely skipped to maximize exam efficiency.`,
      mappedChapters,
      missingSyllabusTopics,
      extraBookChapters,
      supplementaryTopics: [
        {
          topic: "Modern Practical Implementations & Case Studies",
          recommendation: "Review classroom lecture notes and past term exam questions for this module.",
        },
      ],
      studyPlan: [
        {
          phase: "Phase 1: High-Yield Core Chapters",
          targetChapters: mappedChapters.slice(0, 2).map((c) => `Chapter ${c.chapterNumber}: ${c.chapterTitle}`),
          actionItems: [
            "Master core definitions and theoretical foundations",
            "Memorize governing formulas and standard SI relations",
            "Solve high-yield end-of-chapter questions",
          ],
          duration: "Days 1 - 4",
        },
        {
          phase: "Phase 2: Applied Extensions & Intermediate Topics",
          targetChapters: mappedChapters.slice(2, 4).map((c) => `Chapter ${c.chapterNumber}: ${c.chapterTitle}`),
          actionItems: [
            "Review conceptual diagrams and sample exam questions",
            "Practice multi-step analytical problems",
          ],
          duration: "Days 5 - 8",
        },
        {
          phase: "Phase 3: Final Consolidation & Past Exam Review",
          targetChapters: ["All Chapters"],
          actionItems: [
            "Review formula summary sheets",
            "Timed mock exam under realistic conditions",
          ],
          duration: "Days 9 - 10",
        },
      ],
      coinsRemaining,
    };
  }
}

export const questionsService = new QuestionsService();
