import { z } from "zod";
import { geminiService } from "../../lib/gemini.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { walletService } from "../wallet/wallet.service.js";

export const analyzeQuestionsSchema = z.object({
  educationLevel: z.string().min(1).default("Uploaded Document"),
  department: z.string().optional(),
  semester: z.string().optional(),
  subject: z.string().min(1),
  questions: z.array(z.string()).optional(),
  documentText: z.string().optional(),
  documents: z
    .array(
      z.object({
        name: z.string(),
        text: z.string(),
        year: z.string().optional(),
      })
    )
    .optional(),
  requestedCount: z.number().int().min(1).max(50).default(10),
});

export type AnalyzeQuestionsInput = z.infer<typeof analyzeQuestionsSchema>;

export interface ExtractedQuestionWithYear {
  id: string;
  text: string;
  year?: string;
  sourceDocName?: string;
  marks?: number;
  type?: string;
  topic?: string;
}

export interface YearAnalysisStat {
  year: string;
  questionCount: number;
  percentage: number;
}

export interface RepeatedQuestionStat {
  question: string;
  repetitionCount: number;
  years: string[];
  recurrenceWeight: number;
  primaryTopic: string;
  isHighPriority: boolean;
}

export interface PredictedQuestionItem {
  rank: number;
  question: string;
  category: "Frequently Repeated" | "Trend-Based Prediction";
  importance: "Critical" | "Very High" | "High" | "Medium";
  repetitionCount: number;
  historicalYears: string[];
  predictedForYear: string;
  topic: string;
  probabilityScore: number;
  rationale: string;
  examFormat?: string;
  modelAnswerHint?: string;
}

export interface AnalyzedQuestionItem {
  rank: number;
  question: string;
  importance: "Critical" | "Very High" | "High" | "Medium";
  frequencyCount: number;
  frequencyYears: string[];
  topics: string[];
  reason: string;
  probabilityScore: number;
}

export interface QuestionAnalysisResponse {
  educationLevel: string;
  department?: string;
  semester?: string;
  subject: string;
  totalQuestionsAnalyzed: number;
  requestedCount: number;
  detectedYears: string[];
  latestYear: string;
  upcomingPreparationYear: string;
  yearWiseDistribution: YearAnalysisStat[];
  frequentlyRepeatedQuestions: RepeatedQuestionStat[];
  predictedQuestionSet: PredictedQuestionItem[];
  uploadedDocumentsSummary?: Array<{ name: string; questionCount: number; detectedYears: string[] }>;
  analysisItems: AnalyzedQuestionItem[]; // Backwards-compatible
}

export class QuestionAnalysisService {
  /**
   * AI-Powered Question Analysis & Smart Prediction Engine
   * Analyzes all uploaded question papers (or database question bank),
   * performs historical year detection, identifies repetition frequency across years,
   * calculates upcoming target exam year, and generates custom predicted question sets (5, 10, 15, 20).
   */
  public async analyzeQuestions(
    userId: string,
    input: AnalyzeQuestionsInput
  ): Promise<QuestionAnalysisResponse & { coinsRemaining?: number }> {
    const validated = analyzeQuestionsSchema.parse(input);
    const coinCost = 25;

    // Deduct coins atomically
    const deduction = await walletService.deductCoins(
      userId,
      coinCost,
      `AI Question Analysis & Prediction: ${validated.subject}`
    );
    if (!deduction.success) {
      throw new Error(deduction.message || "Insufficient coins to perform Question Analysis.");
    }

    try {
      // 1. Extract all questions with their corresponding years across all provided documents
      const extractedQuestions = this.extractAllQuestionsWithYears(validated);

      if (extractedQuestions.length === 0) {
        throw new Error("Still not updated yet. No questions available to analyze for this subject.");
      }

      // 2. Identify detected years, latest year, and target upcoming exam year
      const detectedYearsSet = new Set<string>();
      extractedQuestions.forEach((q) => {
        if (q.year && /^\d{4}$/.test(q.year)) {
          detectedYearsSet.add(q.year);
        }
      });

      // If no explicit year tags found in documents, infer reasonable academic years
      let detectedYears = Array.from(detectedYearsSet).sort();
      if (detectedYears.length === 0) {
        const currentYear = new Date().getFullYear();
        detectedYears = [
          String(currentYear - 3),
          String(currentYear - 2),
          String(currentYear - 1),
        ];
        // Assign inferred years to questions evenly
        extractedQuestions.forEach((q, idx) => {
          q.year = detectedYears[idx % detectedYears.length];
        });
      }

      const latestYear = detectedYears[detectedYears.length - 1] || String(new Date().getFullYear() - 1);
      const latestYearNum = parseInt(latestYear, 10) || new Date().getFullYear();
      const upcomingPreparationYear = String(latestYearNum + 1);

      // 3. Compute Year-wise Question Distribution
      const yearCountMap = new Map<string, number>();
      detectedYears.forEach((y) => yearCountMap.set(y, 0));
      extractedQuestions.forEach((q) => {
        if (q.year && yearCountMap.has(q.year)) {
          yearCountMap.set(q.year, (yearCountMap.get(q.year) || 0) + 1);
        }
      });

      const yearWiseDistribution: YearAnalysisStat[] = detectedYears.map((yr) => {
        const cnt = yearCountMap.get(yr) || 0;
        return {
          year: yr,
          questionCount: cnt,
          percentage: extractedQuestions.length > 0 ? Math.round((cnt / extractedQuestions.length) * 100) : 0,
        };
      });

      // 4. Perform Repetition & Similarity Analysis across years
      const frequentlyRepeatedQuestions = this.detectRepeatedQuestionsAcrossYears(
        extractedQuestions,
        validated.subject
      );

      // 5. Compute target count (5, 10, 15, or 20 questions)
      const requestedCount = validated.requestedCount || 10;
      const effectiveCount = Math.min(requestedCount, Math.max(1, extractedQuestions.length));

      // 6. Summarize uploaded documents (if documents array was provided)
      const uploadedDocumentsSummary = validated.documents?.map((doc) => {
        const docYearMatches = Array.from(
          new Set((`${doc.name} ${doc.text.slice(0, 3000)}`.match(/\b(20\d\d)\b/g) || []))
        );
        const docQuestions = this.extractQuestionsFromText(doc.text);
        return {
          name: doc.name,
          questionCount: docQuestions.length,
          detectedYears: docYearMatches.length > 0 ? docYearMatches : (doc.year ? [doc.year] : []),
        };
      });

      // 7. Intelligent AI Question Generation via Gemini
      let predictedQuestionSet: PredictedQuestionItem[] = [];

      if (geminiService.isReady()) {
        try {
          predictedQuestionSet = await this.generateAIPredictedQuestions({
            subject: validated.subject,
            educationLevel: validated.educationLevel,
            department: validated.department,
            semester: validated.semester,
            extractedQuestions,
            frequentlyRepeated: frequentlyRepeatedQuestions,
            detectedYears,
            latestYear,
            upcomingPreparationYear,
            requestedCount: effectiveCount,
          });
        } catch (geminiErr) {
          console.warn("Gemini question prediction notice, falling back to local heuristic engine:", geminiErr);
        }
      }

      // If AI failed or was not available, run rigorous local prediction engine
      if (predictedQuestionSet.length === 0) {
        predictedQuestionSet = this.generateLocalPredictedQuestions({
          subject: validated.subject,
          extractedQuestions,
          frequentlyRepeated: frequentlyRepeatedQuestions,
          detectedYears,
          upcomingPreparationYear,
          requestedCount: effectiveCount,
        });
      }

      // Ensure analysisItems is populated for full backwards compatibility
      const analysisItems: AnalyzedQuestionItem[] = predictedQuestionSet.map((pq, idx) => ({
        rank: idx + 1,
        question: pq.question,
        importance: pq.importance,
        frequencyCount: pq.repetitionCount,
        frequencyYears: pq.historicalYears,
        topics: [pq.topic || validated.subject],
        reason: pq.rationale,
        probabilityScore: pq.probabilityScore,
      }));

      const response: QuestionAnalysisResponse = {
        educationLevel: validated.educationLevel,
        department: validated.department,
        semester: validated.semester,
        subject: validated.subject,
        totalQuestionsAnalyzed: extractedQuestions.length,
        requestedCount: effectiveCount,
        detectedYears,
        latestYear,
        upcomingPreparationYear,
        yearWiseDistribution,
        frequentlyRepeatedQuestions,
        predictedQuestionSet,
        uploadedDocumentsSummary,
        analysisItems,
      };

      // Persist analysis record into Supabase question_analyses table
      try {
        await supabaseAdmin.from("question_analyses").insert({
          user_id: userId,
          subject: validated.subject,
          chapter: "Past Question Papers",
          board_or_exam: validated.educationLevel || "Board Exam",
          years_covered: detectedYears,
          top_topics: Array.from(new Set(predictedQuestionSet.map((p) => p.topic))),
          repeated_questions: frequentlyRepeatedQuestions.map((r) => r.question),
          predicted_questions: predictedQuestionSet.map((p) => p.question),
          summary: `Historical analysis of ${extractedQuestions.length} questions from ${detectedYears.join(", ")} targeting ${upcomingPreparationYear} Exam.`,
        });
      } catch (insertErr) {
        console.warn("Failed to insert question_analyses row into Supabase:", insertErr);
      }

      return {
        ...response,
        coinsRemaining: deduction.newBalance,
      };
    } catch (err: any) {
      // Refund coins on failure
      console.error("AI Question Analysis failed, executing refund:", err);
      await walletService
        .addCoins(userId, coinCost, `Refund: Failed Question Analysis (${validated.subject})`)
        .catch(() => {});
      throw err;
    }
  }

  /**
   * Extracts all questions with exam years from all provided inputs
   */
  private extractAllQuestionsWithYears(input: AnalyzeQuestionsInput): ExtractedQuestionWithYear[] {
    const results: ExtractedQuestionWithYear[] = [];

    // Case 1: Multiple documents provided
    if (input.documents && Array.isArray(input.documents) && input.documents.length > 0) {
      input.documents.forEach((doc, docIdx) => {
        const docYear = doc.year || this.detectYearFromText(doc.name) || this.detectYearFromText(doc.text);
        const docQuestions = this.extractQuestionsFromText(doc.text);

        docQuestions.forEach((q, qIdx) => {
          const qYear = this.detectYearFromText(q) || docYear;
          const marks = this.extractMarks(q);
          const type = /cq|creative/i.test(q) ? "CQ" : /mcq/i.test(q) ? "MCQ" : "Broad / Descriptive";

          results.push({
            id: `doc-${docIdx + 1}-q-${qIdx + 1}`,
            text: q.trim(),
            year: qYear,
            sourceDocName: doc.name,
            marks,
            type,
            topic: this.inferTopicFromQuestion(q, input.subject),
          });
        });
      });
    }

    // Case 2: Direct question strings provided
    if (results.length === 0 && input.questions && input.questions.length > 0) {
      input.questions.forEach((q, idx) => {
        const qYear = this.detectYearFromText(q);
        const marks = this.extractMarks(q);
        const type = /cq|creative/i.test(q) ? "CQ" : /mcq/i.test(q) ? "MCQ" : "Broad / Descriptive";

        results.push({
          id: `raw-q-${idx + 1}`,
          text: q.trim(),
          year: qYear,
          marks,
          type,
          topic: this.inferTopicFromQuestion(q, input.subject),
        });
      });
    }

    // Case 3: Single documentText provided
    if (results.length === 0 && input.documentText) {
      const docYear = this.detectYearFromText(input.documentText);
      const docQuestions = this.extractQuestionsFromText(input.documentText);

      docQuestions.forEach((q, idx) => {
        const qYear = this.detectYearFromText(q) || docYear;
        const marks = this.extractMarks(q);
        const type = /cq|creative/i.test(q) ? "CQ" : /mcq/i.test(q) ? "MCQ" : "Broad / Descriptive";

        results.push({
          id: `single-doc-q-${idx + 1}`,
          text: q.trim(),
          year: qYear,
          marks,
          type,
          topic: this.inferTopicFromQuestion(q, input.subject),
        });
      });
    }

    return results;
  }

  /**
   * Detects four-digit exam year from text or filename (including Bengali numerals)
   */
  private detectYearFromText(str: string): string | undefined {
    if (!str) return undefined;

    // Convert Bengali numerals to ASCII digits
    const bengaliToAscii: Record<string, string> = {
      "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
      "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
    };
    const normalized = str.replace(/[০-৯]/g, (char) => bengaliToAscii[char] || char);

    // Contextual match first (e.g. "Exam 2022", "HSC 2023", "Session 2021-2022")
    const contextMatch = normalized.match(
      /\b(?:exam|examination|hsc|ssc|session|board|year|final|midterm)\b[^\n\d]{0,20}\b(20\d\d)\b/i
    );
    if (contextMatch && contextMatch[1]) {
      return contextMatch[1];
    }

    // Bracketed year match: [2022] or (2021)
    const bracketMatch = normalized.match(/[\(\[\{]\s*(20\d\d)\s*[\)\]\}]/);
    if (bracketMatch && bracketMatch[1]) {
      return bracketMatch[1];
    }

    // Any 20xx year between 2000 and 2030
    const matches = normalized.match(/\b(20[0-3]\d)\b/g);
    if (matches && matches.length > 0) {
      return matches[matches.length - 1]; // Return latest year mentioned in context
    }

    return undefined;
  }

  private extractMarks(q: string): number | undefined {
    const marksMatch = q.match(/\[(\d+)\s*(?:marks?|m)\]|\b(\d+)\s*(?:marks?|m)\b/i);
    if (marksMatch) {
      return parseInt(marksMatch[1] || marksMatch[2] || "10", 10);
    }
    return undefined;
  }

  private inferTopicFromQuestion(q: string, subject: string): string {
    const clean = q.toLowerCase();
    // Common subject topic heuristics
    if (clean.includes("motion") || clean.includes("গতি") || clean.includes("velocity") || clean.includes("বেগ")) return "Motion & Kinematics";
    if (clean.includes("force") || clean.includes("বল") || clean.includes("newton") || clean.includes("ভরবেগ")) return "Force & Newton's Laws";
    if (clean.includes("work") || clean.includes("energy") || clean.includes("কাজ") || clean.includes("শক্তি") || clean.includes("power")) return "Work, Power & Energy";
    if (clean.includes("cell") || clean.includes("কোষ") || clean.includes("tissue") || clean.includes("টিস্যু")) return "Cell & Tissue Biology";
    if (clean.includes("mitosis") || clean.includes("meiosis") || clean.includes("বিভাজন")) return "Cell Division";
    if (clean.includes("respiration") || clean.includes("photosynthesis") || clean.includes("সালোকসংশ্লেষণ") || clean.includes("শ্বসন")) return "Bio-energetics";
    if (clean.includes("dna") || clean.includes("gene") || clean.includes("বংশগতি") || clean.includes("heredity")) return "Genetics & Evolution";
    if (clean.includes("database") || clean.includes("sql") || clean.includes("table") || clean.includes("query")) return "Database Systems";
    if (clean.includes("algorithm") || clean.includes("graph") || clean.includes("sort") || clean.includes("tree")) return "Algorithms & Complexity";
    if (clean.includes("image") || clean.includes("filter") || clean.includes("histogram") || clean.includes("pixel")) return "Image Processing";

    // Fallback: extract prominent noun phrase or subject
    const words = q.replace(/[^a-zA-Z\u0980-\u09FF\s]/g, "").split(/\s+/).filter((w) => w.length > 4);
    if (words.length > 0) {
      return words.slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    return `${subject} Core Principles`;
  }

  /**
   * Detects repeated and similar questions across different exam years
   */
  private detectRepeatedQuestionsAcrossYears(
    questions: ExtractedQuestionWithYear[],
    subject: string
  ): RepeatedQuestionStat[] {
    const clusters: Array<{
      canonical: string;
      tokens: Set<string>;
      years: Set<string>;
      count: number;
      primaryTopic: string;
    }> = [];

    for (const q of questions) {
      const cleanText = q.text
        .replace(/(?:^|\n)\s*(?:Q(?:uestion)?\s*\.?\s*\d+[\.\:\-]?|\d{1,3}[\.\)]|[\u09E6-\u09EF]{1,3}[\.\)]|\([a-z\d\u0985-\u09B9]\))\s+/gi, "")
        .replace(/\[[^\]]+\]/g, "")
        .replace(/\([^\)]+\)/g, "")
        .trim();

      const tokens = new Set(
        cleanText
          .toLowerCase()
          .replace(/[^a-z0-9\u0980-\u09FF\s]/g, " ")
          .split(/\s+/)
          .filter((t) => t.length > 3)
      );

      let matchedCluster = clusters.find((cluster) => {
        let intersection = 0;
        tokens.forEach((t) => {
          if (cluster.tokens.has(t)) intersection++;
        });
        const union = new Set([...cluster.tokens, ...tokens]).size;
        const jaccard = union > 0 ? intersection / union : 0;
        return jaccard >= 0.55 || (intersection >= 4 && intersection >= tokens.size * 0.7);
      });

      if (matchedCluster) {
        matchedCluster.count++;
        if (q.year) matchedCluster.years.add(q.year);
        // Expand cluster tokens
        tokens.forEach((t) => matchedCluster!.tokens.add(t));
      } else {
        const yearSet = new Set<string>();
        if (q.year) yearSet.add(q.year);
        clusters.push({
          canonical: cleanText.length > 20 ? cleanText : q.text,
          tokens,
          years: yearSet,
          count: 1,
          primaryTopic: q.topic || this.inferTopicFromQuestion(q.text, subject),
        });
      }
    }

    // Sort by repetition count descending
    clusters.sort((a, b) => b.count - a.count);

    return clusters.map((c) => {
      const distinctYears = Array.from(c.years).sort();
      const recurrenceWeight = Math.min(99, 70 + c.count * 9 + distinctYears.length * 5);
      return {
        question: c.canonical,
        repetitionCount: c.count,
        years: distinctYears,
        recurrenceWeight,
        primaryTopic: c.primaryTopic,
        isHighPriority: c.count >= 2 || distinctYears.length >= 2,
      };
    });
  }

  /**
   * Generates AI Predicted Questions using Gemini API
   */
  private async generateAIPredictedQuestions(params: {
    subject: string;
    educationLevel: string;
    department?: string;
    semester?: string;
    extractedQuestions: ExtractedQuestionWithYear[];
    frequentlyRepeated: RepeatedQuestionStat[];
    detectedYears: string[];
    latestYear: string;
    upcomingPreparationYear: string;
    requestedCount: number;
  }): Promise<PredictedQuestionItem[]> {
    const {
      subject,
      educationLevel,
      department,
      semester,
      extractedQuestions,
      frequentlyRepeated,
      detectedYears,
      latestYear,
      upcomingPreparationYear,
      requestedCount,
    } = params;

    // Group sample questions by year for context
    const yearGroupings = detectedYears.map((yr) => {
      const qs = extractedQuestions.filter((q) => q.year === yr).slice(0, 15);
      return `=== EXAM YEAR ${yr} QUESTIONS (${qs.length} items) ===\n${qs.map((q, i) => `${i + 1}. ${q.text}`).join("\n")}`;
    }).join("\n\n");

    const repeatedSummary = frequentlyRepeated.slice(0, 8).map((r, i) =>
      `#${i + 1}: "${r.question}" (Repeated ${r.repetitionCount}x in years: ${r.years.join(", ") || "Multiple"} - Topic: ${r.primaryTopic})`
    ).join("\n");

    const prompt = `You are a chief examination board setter, academic forecaster, and subject matter expert in ${subject}.
A student has uploaded past exam question papers across historical years: ${detectedYears.join(", ")}.
The latest available exam paper is ${latestYear}.
The student is preparing for the upcoming: ${upcomingPreparationYear} Examination.

HISTORICAL EXAM DATA ANALYZED:
- Total Questions: ${extractedQuestions.length}
- Historical Years Detected: ${detectedYears.join(", ")}
- Latest Available Exam Year: ${latestYear}
- TARGET UPCOMING EXAM YEAR: ${upcomingPreparationYear}
- Target Number of Predicted Questions: Exactly ${requestedCount}

FREQUENTLY REPEATED CORE QUESTIONS ACROSS YEARS:
"""
${repeatedSummary}
"""

HISTORICAL EXAM QUESTIONS BY YEAR:
"""
${yearGroupings.slice(0, 12000)}
"""

CRITICAL INSTRUCTIONS:
1. TARGET EXAM FORECASTING:
   - Provide exactly ${requestedCount} high-probability questions specifically predicted for the upcoming ${upcomingPreparationYear} Exam.
   - Prominently feature:
     (a) Frequently Repeated Questions: Questions that appeared in 2 or more years and have massive recurring probability.
     (b) Trend-Based Predicted Questions: Questions from high-yield topics that follow cyclical exam gaps (e.g. tested in earlier years, due for ${upcomingPreparationYear}).
2. STRICT SOURCE GROUNDING:
   - Base all questions strictly on the actual questions and concepts present in the uploaded examination papers.
   - Do NOT invent out-of-syllabus or unrelated material.
3. BALANCED SYLLABUS COVERAGE:
   - Ensure questions span different core topics in ${subject}.
   - Avoid trivial exact duplicates in the final output set.
4. FOR EACH PREDICTED QUESTION PROVIDE:
   - rank: number (1 to ${requestedCount})
   - question: authentic, clear, exam-ready question text (in Bengali or English matching the uploaded question papers)
   - category: "Frequently Repeated" OR "Trend-Based Prediction"
   - importance: "Critical" (90-99%) | "Very High" (80-89%) | "High" (70-79%) | "Medium" (60-69%)
   - repetitionCount: integer >= 1
   - historicalYears: array of years this question or concept appeared (e.g. ["2021", "2023"])
   - predictedForYear: "${upcomingPreparationYear}"
   - topic: concise syllabus topic name
   - probabilityScore: integer between 65 and 99
   - rationale: clear 1-2 sentence academic explanation of WHY this question is predicted for the ${upcomingPreparationYear} exam based on historical cycles or repetition.
   - examFormat: "CQ / Broad Problem" | "MCQ" | "Short Answer"
   - modelAnswerHint: 2-3 key points, formulas, or steps required to score full marks on this question.

Return ONLY a valid JSON array of objects matching this exact schema:
[
  {
    "rank": 1,
    "question": "Question text...",
    "category": "Frequently Repeated",
    "importance": "Critical",
    "repetitionCount": 3,
    "historicalYears": ["2021", "2023"],
    "predictedForYear": "${upcomingPreparationYear}",
    "topic": "Topic Name",
    "probabilityScore": 96,
    "rationale": "Appeared in consecutive board cycles and forms a core mandatory competency for ${upcomingPreparationYear}.",
    "examFormat": "CQ / Broad Problem",
    "modelAnswerHint": "Step 1: State the governing law. Step 2: Show numerical derivation with SI units."
  }
]`;

    const result = await geminiService.generateJSON<PredictedQuestionItem[]>(prompt);

    if (Array.isArray(result) && result.length > 0) {
      return result.slice(0, requestedCount).map((item, idx) => ({
        rank: idx + 1,
        question: item.question || extractedQuestions[idx]?.text || "Question",
        category: item.category === "Frequently Repeated" ? "Frequently Repeated" : "Trend-Based Prediction",
        importance: item.importance || (idx < 3 ? "Critical" : idx < 7 ? "Very High" : "High"),
        repetitionCount: Number(item.repetitionCount) || (item.category === "Frequently Repeated" ? 2 : 1),
        historicalYears: Array.isArray(item.historicalYears) && item.historicalYears.length > 0 ? item.historicalYears : [latestYear],
        predictedForYear: upcomingPreparationYear,
        topic: item.topic || extractedQuestions[idx]?.topic || subject,
        probabilityScore: Math.min(99, Math.max(65, Number(item.probabilityScore) || (96 - idx * 2))),
        rationale: item.rationale || `Strong historical recurrence pattern indicating high probability for ${upcomingPreparationYear} exam.`,
        examFormat: item.examFormat || "CQ / Broad Problem",
        modelAnswerHint: item.modelAnswerHint || "State governing principles clearly and include diagram/formula where applicable.",
      }));
    }

    return [];
  }

  /**
   * Deterministic local heuristic prediction engine (fallback when AI is offline)
   */
  private generateLocalPredictedQuestions(params: {
    subject: string;
    extractedQuestions: ExtractedQuestionWithYear[];
    frequentlyRepeated: RepeatedQuestionStat[];
    detectedYears: string[];
    upcomingPreparationYear: string;
    requestedCount: number;
  }): PredictedQuestionItem[] {
    const {
      subject,
      extractedQuestions,
      frequentlyRepeated,
      detectedYears,
      upcomingPreparationYear,
      requestedCount,
    } = params;

    const items: PredictedQuestionItem[] = [];
    const usedQuestions = new Set<string>();

    // 1. Take top frequently repeated questions first
    for (const rep of frequentlyRepeated) {
      if (items.length >= Math.ceil(requestedCount * 0.6)) break;
      const cleanKey = rep.question.slice(0, 50).toLowerCase();
      if (!usedQuestions.has(cleanKey)) {
        usedQuestions.add(cleanKey);
        items.push({
          rank: items.length + 1,
          question: rep.question,
          category: "Frequently Repeated",
          importance: rep.repetitionCount >= 3 ? "Critical" : "Very High",
          repetitionCount: rep.repetitionCount,
          historicalYears: rep.years.length > 0 ? rep.years : detectedYears.slice(-2),
          predictedForYear: upcomingPreparationYear,
          topic: rep.primaryTopic || subject,
          probabilityScore: Math.min(98, 88 + rep.repetitionCount * 3),
          rationale: `Appeared ${rep.repetitionCount} times across past papers (${rep.years.join(", ") || "Multiple Sessions"}). Highly favored by examiners for ${upcomingPreparationYear}.`,
          examFormat: "CQ / Broad Problem",
          modelAnswerHint: "State exact definition, write governing formula with SI units, and address edge conditions.",
        });
      }
    }

    // 2. Fill remaining slots with trend-based questions from recent years
    for (const q of extractedQuestions) {
      if (items.length >= requestedCount) break;
      const cleanKey = q.text.slice(0, 50).toLowerCase();
      if (!usedQuestions.has(cleanKey)) {
        usedQuestions.add(cleanKey);
        const idx = items.length;
        const prob = Math.max(68, 92 - idx * 2);
        items.push({
          rank: idx + 1,
          question: q.text,
          category: "Trend-Based Prediction",
          importance: prob >= 90 ? "Critical" : prob >= 80 ? "Very High" : "High",
          repetitionCount: 1,
          historicalYears: q.year ? [q.year] : detectedYears.slice(-1),
          predictedForYear: upcomingPreparationYear,
          topic: q.topic || this.inferTopicFromQuestion(q.text, subject),
          probabilityScore: prob,
          rationale: `Core curriculum question identified from ${q.year || "recent sessions"}. Fits the cyclical pattern expected for ${upcomingPreparationYear}.`,
          examFormat: q.type || "CQ / Broad Problem",
          modelAnswerHint: "Provide step-by-step reasoning and emphasize analytical boundary conditions.",
        });
      }
    }

    return items;
  }

  private extractQuestionsFromText(text: string): string[] {
    if (!text || typeof text !== "string") return [];
    const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const rawLines = clean.split("\n").map((l) => l.trim());

    // Filter out page headers, syllabus banners, and metadata noise
    const lines = rawLines.filter((line) => {
      if (!line) return false;
      const lower = line.toLowerCase();
      if (lower.startsWith("--- [page") || lower.startsWith("--- page")) return false;
      if (
        lower.startsWith("time:") ||
        lower.startsWith("full marks:") ||
        lower.startsWith("total marks:") ||
        lower.startsWith("instructions:")
      )
        return false;
      if (
        lower.startsWith("topic - wise question bank") ||
        lower.startsWith("topic-wise question bank")
      )
        return false;
      if (
        lower.startsWith("subject:") ||
        lower.startsWith("course code:") ||
        lower.startsWith("dept.") ||
        lower.startsWith("department of")
      )
        return false;
      if (
        lower === "# question year(s)" ||
        lower === "question year(s)" ||
        lower === "# question" ||
        lower === "sl. question"
      )
        return false;
      return true;
    });

    const isBareNumber = (l: string) => /^(\d{1,3}|[\u09E6-\u09EF]{1,3})$/.test(l);
    const isYearLine = (l: string) =>
      /^(?:(?:20\d\d|19\d\d|Important|\bBoard\b|\bExam\b)[\s,–\-]*)+$/i.test(l);
    const startsWithQuestionKeyword = (l: string) =>
      /^(?:what|how|why|explain|define|discuss|describe|prove|find|calculate|differentiate|distinguish|compare|write|state|derive|illustrate|কী|কেন|ব্যাখ্যা|বর্ণনা|পার্থক্য|সংজ্ঞা)/i.test(
        l
      );

    const questions: string[] = [];
    let currentNumber: string | null = null;
    let currentText = "";
    let currentYears = "";

    const commitCurrent = () => {
      if (currentText.trim().length >= 10) {
        let finalStr = currentText.trim();
        if (currentYears.trim()) {
          finalStr += ` [${currentYears.trim()}]`;
        }
        if (currentNumber) {
          finalStr = `${currentNumber}. ${finalStr}`;
        }
        questions.push(finalStr);
      }
      currentNumber = null;
      currentText = "";
      currentYears = "";
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Case A: Standalone question number on its own line (e.g. "1", "2")
      if (isBareNumber(line)) {
        commitCurrent();
        currentNumber = line;
        continue;
      }

      // Case B: Numbered question prefix (e.g. "3 Different between...", "4. Explain...")
      const numMatch = line.match(
        /^(?:Q(?:uestion)?\s*\.?\s*(\d+)[\.\:\-]?|(\d{1,3})[\.\:\)\s]+|([\u09E6-\u09EF]{1,3})[\.\:\)\।\s]+|\(([a-z\d\u0985-\u09B9])\)\s+|\(([ivxlcdm]+)\)\s+)(.*)$/i
      );
      if (numMatch) {
        const num = numMatch[1] || numMatch[2] || numMatch[3] || numMatch[4] || numMatch[5];
        const rest = (numMatch[6] || "").trim();
        commitCurrent();
        currentNumber = num;
        if (rest) {
          currentText = rest;
        }
        continue;
      }

      // Case C: Year line attached to current question (e.g. "2022, 2020, 2019" or "2023")
      if (isYearLine(line)) {
        if (currentYears) {
          currentYears += ", " + line;
        } else {
          currentYears = line;
        }
        continue;
      }

      // Case D: Line starts with a direct question keyword
      if (startsWithQuestionKeyword(line)) {
        if (!currentText) {
          currentText = line;
        } else if (currentYears) {
          commitCurrent();
          currentText = line;
        } else if (line.endsWith("?") || currentText.endsWith("?") || currentText.length > 120) {
          commitCurrent();
          currentText = line;
        } else {
          currentText += " " + line;
        }
        continue;
      }

      // Case E: Continuation line
      if (currentText) {
        currentText += " " + line;
      } else if (line.length >= 15) {
        currentText = line;
      }
    }

    commitCurrent();

    if (questions.length >= 3) {
      return questions;
    }

    // Fallback 1: split by question marks
    const qMarkParts = clean.split(/(?<=\?)\s+(?=[A-Z\u0980-\u09FF\d])/);
    if (qMarkParts.length >= 3) {
      return qMarkParts.map((p) => p.trim()).filter((p) => p.length >= 15 && p.length < 900);
    }

    // Fallback 2: split by paragraphs
    const paragraphs = clean
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 25 && p.length < 1200);
    if (paragraphs.length >= 2) {
      return paragraphs;
    }

    return questions.length > 0 ? questions : [clean.slice(0, 300)];
  }

  /**
   * Retrieves authentic question bank items stored in the database for the given class, department, semester, subject.
   * If no real questions exist for this category, returns an empty list (questions: []).
   */
  public async getDatabaseQuestions(filter: {
    educationLevel?: string;
    department?: string;
    semester?: string;
    subject?: string;
  }): Promise<{
    questions: Array<{
      id: string;
      text: string;
      year?: string;
      marks?: number;
      type?: string;
      docName?: string;
    }>;
    totalCount: number;
  }> {
    try {
      let query = supabaseAdmin
        .from("documents")
        .select("id, name, subject, chapter, target_class, extracted_text")
        .neq("is_system_material", true);

      if (filter.educationLevel) {
        const normLevel = filter.educationLevel.toLowerCase();
        if (normLevel.includes("9-10") || normLevel.includes("ssc")) {
          query = query.or("target_class.eq.9-10,name.ilike.%9-10%,name.ilike.%ssc%");
        } else if (normLevel.includes("11-12") || normLevel.includes("hsc")) {
          query = query.or("target_class.eq.11-12,name.ilike.%11-12%,name.ilike.%hsc%");
        } else if (normLevel.includes("bsc") || normLevel.includes("cse")) {
          query = query.or("target_class.ilike.%bsc%,name.ilike.%bsc%,name.ilike.%cse%,name.ilike.%image%");
        }
      }

      const { data: docs, error } = await query;
      if (error || !docs || docs.length === 0) {
        return { questions: [], totalCount: 0 };
      }

      const targetSubject = (filter.subject || "").toLowerCase().trim();
      const allExtractedQuestions: Array<{
        id: string;
        text: string;
        year?: string;
        marks?: number;
        type?: string;
        docName?: string;
      }> = [];

      for (const doc of docs) {
        const docName = (doc.name || "").toLowerCase();
        const docSub = (doc.subject || "").toLowerCase();
        const docChap = (doc.chapter || "").toLowerCase();

        // Check if this document matches the requested subject (if provided)
        if (targetSubject) {
          const isDip = targetSubject.includes("image") || targetSubject.includes("processing");
          const docIsDip = docName.includes("image") || docSub.includes("image");

          if (isDip) {
            if (!docIsDip && !docName.includes(targetSubject) && !docSub.includes(targetSubject)) {
              continue;
            }
          } else {
            if (docIsDip) continue;
            const match =
              docName.includes(targetSubject) ||
              docSub.includes(targetSubject) ||
              docChap.includes(targetSubject);
            if (!match) continue;
          }
        }

        if (!doc.extracted_text || doc.extracted_text.length < 20) {
          continue;
        }

        // Only genuine question papers, past exams, or question bank documents must be parsed
        // Standard textbooks, NCTB books, and syllabus outlines must NEVER be treated as question papers
        const isTextbookOrGuide =
          docName.includes("textbook") ||
          docName.includes("curriculum") ||
          docName.includes("syllabus") ||
          docName.includes("pdf class 9-10");
        if (isTextbookOrGuide) {
          continue;
        }

        const isQuestionDoc =
          docName.includes("question") ||
          docName.includes("bank") ||
          docName.includes("paper") ||
          docName.includes("exam") ||
          docName.includes("worksheet") ||
          docName.includes("test") ||
          docSub.includes("question");
        if (!isQuestionDoc) {
          continue;
        }

        const rawQuestions = this.extractQuestionsFromText(doc.extracted_text);
        const docYear = this.detectYearFromText(doc.name) || this.detectYearFromText(doc.extracted_text);

        rawQuestions.forEach((q, idx) => {
          if (!q || q.length < 15) return;
          const yearMatch = this.detectYearFromText(q) || docYear;
          const marks = this.extractMarks(q);
          allExtractedQuestions.push({
            id: `${doc.id}-q-${idx + 1}`,
            text: q.trim(),
            year: yearMatch,
            marks,
            type: /cq|creative/i.test(q) ? "CQ" : /mcq/i.test(q) ? "MCQ" : "Broad",
            docName: doc.name,
          });
        });
      }

      return {
        questions: allExtractedQuestions,
        totalCount: allExtractedQuestions.length,
      };
    } catch (err) {
      console.warn("Exception in getDatabaseQuestions:", err);
      return { questions: [], totalCount: 0 };
    }
  }
}

export const questionAnalysisService = new QuestionAnalysisService();
