import { z } from "zod";
import { geminiService } from "../../lib/gemini.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { walletService } from "../wallet/wallet.service.js";
import { pricingConfig } from "../../config/env.js";
import { documentService } from "../documents/documents.service.js";
import { findCurriculumSubject, NCTB_CURRICULUM_DATABASE } from "../documents/curriculum-knowledge.js";

export const generateNotesSchema = z.object({
  fileId: z.string().optional().nullable(),
  subject: z.string().min(1, "Subject is required"),
  chapter: z.string().min(1, "Chapter is required"),
  difficulty: z.string().optional().default("intermediate"),
  outputType: z.string().optional().default("detailed"),
  language: z.string().optional().default("both"),
  customPrompt: z.string().optional().nullable(),
  sourceText: z.string().optional().nullable(),
  pageRange: z.string().optional().nullable(),
  documentName: z.string().optional().nullable(),
});

export type GenerateNotesInput = z.infer<typeof generateNotesSchema>;

export const generateSummarySchema = z.object({
  fileId: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  chapter: z.string().optional().nullable(),
  topic: z.string().optional().nullable().default("Comprehensive Summary"),
  customTopic: z.string().optional().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  depth: z
    .enum(["quick", "high-yield", "comprehensive", "standard", "detailed"])
    .optional()
    .transform((d) => (d === "standard" ? "high-yield" : d === "detailed" ? "comprehensive" : d)),
  language: z
    .string()
    .optional()
    .transform((l) => {
      const lower = (l || "").toLowerCase();
      if (lower.includes("bangla") || lower.includes("bn")) return "bangla" as const;
      if (lower.includes("eng")) return "english" as const;
      return "both" as const;
    })
    .default("both"),
  sourceText: z.string().optional().nullable(),
  pageRange: z.string().optional().nullable(),
  documentName: z.string().optional().nullable(),
});

export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>;

export class NotesService {
  /**
   * Generate AI notes using Gemini and charge coins atomically
   */
  public async generateNotes(userId: string, input: GenerateNotesInput) {
    const coinCost = pricingConfig.notes;

    // 1. Atomically deduct coins first (idempotent / safe)
    const deduction = await walletService.deductCoins(
      userId,
      coinCost,
      `AI Notes Generation: ${input.subject} - ${input.chapter}`
    );

    if (!deduction.success) {
      throw new Error(deduction.message || "Insufficient coins to generate study notes.");
    }

    try {
      // 2. Fetch context if fileId or subject provided (auto-connects Class 9-10 Physics & Biology)
      let contextText = input.sourceText || "";
      let resolvedDocId: string | null = null;
      let isEntire = input.chapter?.toLowerCase().includes("entire") || input.chapter?.toLowerCase().includes("complete syllabus");

      if (!contextText) {
        const resolved = await documentService.resolveDocumentContext({
          userId,
          fileId: input.fileId,
          subject: input.subject,
          chapter: input.chapter,
        });

        if (resolved.text && resolved.text.length >= 25) {
          contextText = resolved.text.slice(0, 25000);
          resolvedDocId = resolved.docId || null;
          isEntire = Boolean(resolved.isEntireBook);
        } else {
          contextText = `Study Material and Curriculum Reference for ${input.subject}:
Chapter: ${input.chapter}
Core concepts, official syllabus requirements, formulas, laws, and examination focus for ${input.chapter}.`;
        }
      } else {
        // If sourceText is a complete textbook containing ## Chapter headings, extract the requested chapter
        if (!isEntire && input.chapter && /##\s*(?:Chapter|অধ্যায়)\s*[0-9০-৯]+/i.test(contextText)) {
          const extracted = documentService.extractChapterFromText(contextText, input.chapter);
          if (extracted && extracted.length >= 25) {
            contextText = extracted;
          }
        }
      }

      // 3. Craft exam-oriented prompt for Gemini
      const languageInstruction =
        input.language === "bangla"
          ? "Respond primarily in clear academic Bangla (বাংলা) with English terms in parentheses."
          : input.language === "both"
          ? "Provide bilingual explanations where key definitions and concepts have both English and Bengali explanations."
          : "Respond in clear, academic English.";

      const isolationRule = isEntire
        ? `STRICT ENTIRE-BOOK COVERAGE: The user requested notes covering the ENTIRE ${input.subject} study material. You MUST structure your notes with distinct sections covering ALL chapters across this document.`
        : `STRICT CHAPTER ISOLATION: Base your study notes STRICTLY AND ONLY on Chapter: "${input.chapter}" of "${input.subject}". NEVER include content, questions, or examples from other chapters or previous documents.`;

      const prompt = `You are Brain Nest AI, an elite academic educator and national curriculum examination specialist.
Generate comprehensive, highly structured, exam-focused study notes on:
- Subject: ${input.subject}
- Chapter/Topic: ${input.chapter}
- Note Depth: ${input.outputType} (Detailed, exam-ready revision, core definitions, or quick summary)
- Difficulty Level: ${input.difficulty} (Easy, Medium, or Hard)
- Language Preference: ${languageInstruction}

${isolationRule}

${input.customPrompt ? `Student Custom Focus/Instructions: ${input.customPrompt}` : ""}

${contextText ? `Source Study Material / Document Excerpt:\n"""\n${contextText}\n"""\nGround all explanations directly on this textbook content without hallucinating unmentioned facts.` : `Note: Synthesize authentic syllabus-grounded curriculum information for ${input.subject} - ${input.chapter}.`}

Format the output strictly in beautiful, clean GitHub-flavored Markdown using this exact structure:

# ${input.subject}: ${input.chapter}
> **Target Level:** Class 9-10 (SSC) / Academic · **Format:** ${input.outputType.toUpperCase()} · **Difficulty:** ${input.difficulty.toUpperCase()}

---

## 📌 1. Chapter Overview & Learning Objectives
- Provide a clear, intuitive 2-3 paragraph breakdown of why this topic matters, key concepts to master, and real-world relevance.

## 🧠 2. Core Concepts & Bilingual Definitions
- Break down 4-8 fundamental principles, laws, or phenomena.
- Include formal definitions in both English and Bangla (if applicable).
- Highlight key terminology in **bold** with unambiguous conceptual explanations.

## 📐 3. Governing Formulas, Laws & Units
- Present all critical mathematical equations in clean monospace or standard notation (e.g. \`F = ma\`, \`v = u + at\`, \`P = VI\`, or biological process pathways).
- List SI units, variable breakdowns, and dimensional formulas.
- Mention common calculating pitfalls or sign conventions.

## 💡 4. Detailed Explanations & Practical Real-World Examples
- Provide step-by-step conceptual logic with everyday analogies and solved illustrative examples.

## 🎯 5. High-Yield Board Exam Questions & Solutions
### Short Questions (জ্ঞান ও অনুধাবনমূলক - 1 & 2 Marks)
- Provide 3-4 frequently asked board exam questions with model answers.
### Long Analytical Questions (প্রয়োগ ও উচ্চতর দক্ষতা - 3 & 4 Marks)
- Provide 2 comprehensive analytical or mathematical questions with step-by-step model solutions.

## ⚡ 6. Last-Minute Rapid Revision Cheat Sheet
- Bulleted rapid review of definitions, constants, formulas, and key takeaways for quick recall 10 minutes before the exam.
`;

      let generatedMarkdown = "";
      try {
        generatedMarkdown = await geminiService.generateText(
          prompt,
          "You are Brain Nest AI, an elite educational intelligence platform designed for exam mastery."
        );
      } catch (geminiErr: any) {
        console.warn("Gemini generation failed, activating curriculum fallback notes:", geminiErr?.message || geminiErr);
        generatedMarkdown = this.generateFallbackNotes(input, contextText);
      }

      if (!generatedMarkdown || generatedMarkdown.trim().length < 50) {
        generatedMarkdown = this.generateFallbackNotes(input, contextText);
      }

      const title = `${input.subject} — ${input.chapter} (${input.outputType.toUpperCase()})`;

      // 4. Save to PostgreSQL with resilient fallback
      let noteRecord: any = null;
      try {
        const { data: noteRow, error: dbError } = await supabaseAdmin
          .from("notes")
          .insert({
            user_id: userId,
            document_id: resolvedDocId || (input.fileId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.fileId) ? input.fileId : null),
            subject: input.subject,
            chapter: input.chapter,
            difficulty: input.difficulty,
            output_type: input.outputType,
            language: input.language,
            title,
            content: generatedMarkdown,
            coin_cost: coinCost,
          })
          .select()
          .single();

        if (noteRow) {
          noteRecord = noteRow;
        } else if (dbError) {
          console.warn("Could not persist note to DB, proceeding with local object:", dbError.message);
        }
      } catch (insertErr) {
        console.warn("Note insert error:", insertErr);
      }

      return {
        id: noteRecord?.id || `note-${Date.now()}`,
        user_id: userId,
        subject: input.subject,
        chapter: input.chapter,
        difficulty: input.difficulty,
        output_type: input.outputType,
        language: input.language,
        title,
        content: generatedMarkdown,
        coin_cost: coinCost,
        created_at: new Date().toISOString(),
        coinsRemaining: deduction.newBalance,
      };
    } catch (err: any) {
      // Refund coins if generation failed
      console.error("AI Notes Generation Failed, executing refund:", err);
      await walletService.addCoins(
        userId,
        coinCost,
        `Refund: Failed Note Generation (${input.chapter})`
      );
      throw err;
    }
  }

  /**
   * Generate Topic-Wise Short Summary using Gemini (5 coins)
   * Accurately analyzes uploaded document content based on student's chosen criteria and difficulty
   */
  public async generateTopicSummary(userId: string, input: GenerateSummaryInput) {
    const coinCost = pricingConfig.topicSummary || 5; // 5 coins

    // 1. Deduct coins
    const deduction = await walletService.deductCoins(
      userId,
      coinCost,
      `AI Topic Summary: ${input.customTopic || input.topic || input.chapter || "Chapter Summary"}`
    );

    if (!deduction.success) {
      throw new Error(deduction.message || "Insufficient coins to generate topic summary (5 coins required).");
    }

    try {
      // 2. Resolve document context with strict source & chapter isolation
      let contextText = input.sourceText || "";
      let resolvedDocId: string | null = null;
      let isEntire = input.chapter?.toLowerCase().includes("entire") || input.chapter?.toLowerCase().includes("complete syllabus");

      if (!contextText) {
        const resolved = await documentService.resolveDocumentContext({
          userId,
          fileId: input.fileId,
          subject: input.subject,
          chapter: input.chapter,
        });

        if (resolved.text && resolved.text.length >= 25) {
          contextText = resolved.text;
          resolvedDocId = resolved.docId || null;
          isEntire = Boolean(resolved.isEntireBook);
        } else {
          const fallbackTopic = input.customTopic || input.topic || input.chapter || "Overview";
          const fallbackSubject = input.subject || "Academic Study";
          contextText = `Study Guide and Curriculum Overview for ${fallbackSubject}:
Topic: ${fallbackTopic}
Key definitions, principles, formulas, and high-yield examination review for ${fallbackTopic}.`;
        }
      } else {
        // If sourceText is a complete textbook containing ## Chapter headings, extract the requested chapter
        if (!isEntire && input.chapter && /##\s*(?:Chapter|অধ্যায়)\s*[0-9০-৯]+/i.test(contextText)) {
          const extracted = documentService.extractChapterFromText(contextText, input.chapter);
          if (extracted && extracted.length >= 25) {
            contextText = extracted;
          }
        }
      }

      const rawTopic = input.customTopic || input.topic || input.chapter || "Overview";
      const resolvedTopic =
        (rawTopic && rawTopic.trim() && rawTopic !== "General")
          ? rawTopic.trim()
          : input.documentName
          ? input.documentName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim()
          : "Curriculum Summary";

      const resolvedSubject =
        (input.subject && input.subject.trim() && input.subject !== "General")
          ? input.subject.trim()
          : "Uploaded Document";

      const resolvedChapter =
        (input.chapter && input.chapter.trim() && input.chapter !== "General")
          ? input.chapter.trim()
          : resolvedTopic;

      const difficulty = input.difficulty || "medium";

      const difficultyInstructions: Record<string, string> = {
        easy: "EXPLANATION DIFFICULTY: EASY (Beginner-Friendly). Use simple, clear, approachable language, relatable everyday analogies, step-by-step intuitive logic, and basic examples. Break down complicated jargon into simple concepts that any beginner student can easily understand.",
        medium: "EXPLANATION DIFFICULTY: MEDIUM (Balanced Academic). Provide well-balanced conceptual explanations with formal academic definitions, standard terminology, core principles, step-by-step reasoning, and practical curriculum examples.",
        hard: "EXPLANATION DIFFICULTY: HARD (Advanced & In-Depth). Provide rigorous academic analysis, advanced scientific/mathematical terminology, comprehensive boundary limits, in-depth theoretical mechanisms, formal derivations, and advanced evaluative points expected in top-tier examinations.",
      };

      const languageInstruction =
        input.language === "bangla"
          ? "Respond primarily in academic Bangla (বাংলা) with English technical terms in parentheses."
          : input.language === "both"
          ? "Provide bilingual content with clear Bengali explanations and English technical terms/definitions."
          : "Respond in standard formal academic English.";

      // Intelligent Chunking & Content Window Retrieval
      let focusedContext = contextText;
      let topicMatches = true;

      if (contextText && contextText.length > 14000) {
        // Keyword-based window extraction
        const topicWords = resolvedTopic
          .toLowerCase()
          .replace(/[^\w\s\u0980-\u09FF]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2);

        let bestIndex = -1;
        for (const word of topicWords) {
          const idx = contextText.toLowerCase().indexOf(word);
          if (idx !== -1) {
            bestIndex = idx;
            break;
          }
        }

        if (bestIndex !== -1) {
          const start = Math.max(0, bestIndex - 1500);
          const end = Math.min(contextText.length, start + 13000);
          focusedContext = contextText.slice(start, end);
        } else {
          // If custom topic words didn't appear in text, flag potential topic absence
          if (input.customTopic) {
            topicMatches = false;
          }
          focusedContext = contextText.slice(0, 13000);
        }
      }

      const prompt = contextText
        ? `You are an elite academic curriculum specialist and educational summarizer.
A student has uploaded a study document/textbook named "${input.documentName || "Study Material"}" and requested an AI-powered topic summary.
Target Topic: "${resolvedTopic}"
Specified Chapter / Section: "${resolvedChapter}"

CRITICAL INSTRUCTIONS:
1. CURRICULUM GROUNDING & SYNTHESIS:
   - Base your summary on the uploaded document information and extracted text provided below. Prioritize the concepts, definitions, formulas, and examples extracted from the document.
   - If the extracted text for this specific section is brief, partial, or scanned, synthesize seamlessly using your comprehensive academic curriculum knowledge for this subject ("${resolvedSubject}") and chapter ("${resolvedChapter}").
   - ALWAYS deliver a full, high-retention, high-value academic summary. NEVER return an empty summary, and NEVER claim that text is blank or topic is missing for a valid chapter or topic from the uploaded study material.
   - Only set "topic_found": false if the student's custom query is completely nonsensical, offensive, or completely unrelated to any academic study material.
2. DIFFICULTY LEVEL: ${difficultyInstructions[difficulty]}
3. IMPORTANT DEFINITIONS & FORMULAS:
   - Provide clear, accurate definitions for key terms with estimated page references (e.g. "${input.pageRange || "pp. 1-10"}").
   - Include core governing formulas, principles, or laws with standard notation, SI units, and concise explanations. (For technical/computer science topics like ICT, include core protocols, algorithms, or technical architectures).
4. EXAM ACCURACY & RETENTION:
   - High-yield exam points, common traps to avoid, and realistic board/exam questions.
   - Practical real-world examples illustrating the concepts.

STUDENT CRITERIA:
- Target Topic / Query: ${resolvedTopic}
- Specified Chapter: ${resolvedChapter}
- Selected Difficulty: ${difficulty.toUpperCase()}
- Language: ${languageInstruction}
${input.pageRange ? `- Source Page Range: ${input.pageRange}` : ""}
${input.documentName ? `- Document Name: ${input.documentName}` : ""}

UPLOADED DOCUMENT TEXT:
"""
${focusedContext}
"""

Return ONLY a valid JSON object matching this exact schema:
{
  "topic_found": true,
  "topic_title": "${resolvedTopic}",
  "one_line_summary": "<One-sentence high-retention core takeaway of this topic>",
  "overview": "<Concise, high-retention summary paragraph tailored strictly to the actual content>",
  "detailed_explanation": "<A structured, deep explanation formatted with clear paragraphs and bullet points reflecting the ${difficulty} difficulty level>",
  "key_concepts": [
    "<Core concept 1 from the material>",
    "<Core concept 2 from the material>",
    "<Core concept 3 from the material>"
  ],
  "definitions": [
    { "term": "<Key Term 1>", "definition": "<Accurate conceptual definition>", "page": "<Page reference if available>" }
  ],
  "formulas": [
    {
      "name": "<Formula / Principle / Law Name>",
      "formula": "<Monospace formula e.g. F = ma or v = u + at, or key law>",
      "explanation": "<One-line explanation of terms and SI units>"
    }
  ],
  "examples": [
    "<Practical example or real-world problem scenario directly from the material>"
  ],
  "exam_points": [
    "<Crucial exam tip, scoring advice, or common trap to avoid>"
  ],
  "likely_questions": [
    "<Likely board / exam question 1>",
    "<Likely board / exam question 2>"
  ],
  "source_pages": "${input.pageRange || "Selected Document Pages"}"
}`
        : `You are an elite academic curriculum specialist and educational summarizer.
A student has requested a structured summary for: "${resolvedTopic}" in "${resolvedChapter}".

CRITICAL INSTRUCTIONS:
1. STRICT TOPIC ISOLATION: Focus 100% on "${resolvedTopic}" (${resolvedChapter}).
2. DIFFICULTY LEVEL: ${difficultyInstructions[difficulty]}
3. FORMULAS & PRINCIPLES: Provide accurate governing formulas with standard notation and SI units.
4. EXAM ACCURACY: Provide realistic, syllabus-grounded exam points.

Return ONLY a valid JSON object matching this exact schema:
{
  "topic_found": true,
  "topic_title": "${resolvedTopic}",
  "one_line_summary": "<One-sentence high-retention core takeaway>",
  "overview": "<Concise, high-retention summary paragraph>",
  "detailed_explanation": "<Structured conceptual explanation for ${difficulty} level>",
  "key_concepts": [
    "<Core concept 1>",
    "<Core concept 2>",
    "<Core concept 3>"
  ],
  "definitions": [
    { "term": "<Key Term 1>", "definition": "<Accurate conceptual definition>", "page": "Syllabus Standard" }
  ],
  "formulas": [
    {
      "name": "<Formula / Law Name>",
      "formula": "<Monospace formula e.g. v = u + at>",
      "explanation": "<One-line explanation of terms and SI units>"
    }
  ],
  "examples": [
    "<Representative practical example>"
  ],
  "exam_points": [
    "<Crucial exam tip or scoring advice>"
  ],
  "likely_questions": [
    "<Likely board question 1>",
    "<Likely board question 2>"
  ],
  "source_pages": "Standard Curriculum"
}`;

      let response: any;
      try {
        response = await geminiService.generateJSON<{
          topic_found?: boolean;
          topic_title?: string;
          one_line_summary?: string;
          overview?: string;
          detailed_explanation?: string;
          key_concepts?: string[];
          definitions?: { term: string; definition: string; page?: string }[];
          formulas?: any[];
          examples?: string[];
          exam_points?: string[];
          exam_tips?: string[];
          likely_questions?: string[];
          source_pages?: string;
        }>(prompt, "You are Brain Nest AI, an elite educational intelligence platform.");
      } catch (geminiErr: any) {
        console.warn("Gemini generation failed or high demand (503/429), activating local curriculum synthesis fallback:", geminiErr?.message || geminiErr);
        response = this.generateFallbackTopicSummary(
          resolvedTopic,
          resolvedChapter,
          resolvedSubject,
          focusedContext,
          difficulty,
          input.language || "both",
          input.pageRange
        );
      }

      // Normalize formulas into [{ name, formula, explanation }]
      const normalizedFormulas = (response.formulas || []).map((f: any) => {
        if (typeof f === "string") {
          return { name: f.split(":")[0] || "Key Formula", formula: f, explanation: "Standard curriculum formula" };
        }
        return {
          name: f.name || "Core Formula",
          formula: f.formula || f.equation || "",
          explanation: f.explanation || f.desc || "",
        };
      });

      let finalKeyConcepts = (response.key_concepts || []).filter(Boolean);
      if (finalKeyConcepts.length === 0) {
        const sentences = (response.detailed_explanation || response.overview || "")
          .split(/[\n•\-]+/)
          .map((s: string) => s.trim().replace(/^[\d.)\s*]+/, ""))
          .filter((s: string) => s.length > 20 && s.length < 180);

        if (sentences.length >= 3) {
          finalKeyConcepts = sentences.slice(0, 4);
        } else {
          finalKeyConcepts = [
            `Core theoretical foundations and structural principles of ${resolvedTopic}`,
            `Key mechanisms, processes, and governing analytical properties in ${resolvedChapter}`,
            `Real-world technological and academic applications of ${resolvedTopic}`,
            `High-frequency board exam questions, numerical problem patterns, and scoring criteria`,
          ];
        }
      }

      let finalDefinitions = (response.definitions || []).filter((d: any) => d && d.term && d.definition);
      if (finalDefinitions.length === 0) {
        finalDefinitions = [
          {
            term: resolvedTopic,
            definition: `Core curriculum topic covering key theoretical concepts, governing principles, and analytical applications in ${resolvedSubject}.`,
            page: input.pageRange || "Syllabus Standard",
          },
        ];
      }

      let finalFormulas = normalizedFormulas;
      if (finalFormulas.length === 0) {
        finalFormulas = [
          {
            name: `${resolvedTopic} Governing Principle`,
            formula: "Standard Curriculum Relationship",
            explanation: `Governs analytical equations and quantitative behavior in ${resolvedChapter}.`,
          },
        ];
      }

      let finalExamPoints = (response.exam_points || response.exam_tips || []).filter(Boolean);
      if (finalExamPoints.length === 0) {
        finalExamPoints = [
          `Prioritize precise scientific/technical definitions, boundary conditions, and accurate units in ${resolvedTopic}.`,
          `Practice representative numerical, analytical, and structured board questions directly from ${resolvedChapter}.`,
        ];
      }

      let topicFound = response.topic_found !== false;
      let overview = response.overview || response.one_line_summary || "";
      let detailedExplanation = response.detailed_explanation || response.overview || "";

      // Safeguard: If AI generated an erroneous topic_not_found message or boilerplate, override with real curriculum summary
      if (!topicFound || overview.toLowerCase().includes("blank") || overview.toLowerCase().includes("could not be found") || overview.toLowerCase().includes("empty") || overview.toLowerCase().includes("core principles and key insights")) {
        topicFound = true;
        overview = `${resolvedTopic} (${resolvedChapter}) covers fundamental concepts, standard curriculum principles, definitions, and high-yield examination topics in ${resolvedSubject}.`;
        if (!detailedExplanation || detailedExplanation.toLowerCase().includes("blank") || detailedExplanation.toLowerCase().includes("empty")) {
          detailedExplanation = `${overview}\n\nKey areas of focus include core theoretical definitions, real-world applications, structured problem solving, and curriculum-aligned exam questions for ${resolvedChapter}.`;
        }
      }

      let oneLine = response.one_line_summary && !response.one_line_summary.toLowerCase().includes("empty") && !response.one_line_summary.toLowerCase().includes("blank") && !response.one_line_summary.toLowerCase().includes("core principles and key insights")
        ? response.one_line_summary
        : overview;

      if (!oneLine || oneLine.length < 15 || oneLine.toLowerCase().includes("core principles and key insights")) {
        oneLine = `${resolvedTopic} encompasses essential academic principles, definitions, and analytical mechanisms in ${resolvedSubject}.`;
      }

      let recordId = `sum-${Date.now()}`;
      try {
        const { data: noteRow } = await supabaseAdmin
          .from("notes")
          .insert({
            user_id: userId,
            document_id: input.fileId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.fileId) ? input.fileId : null,
            subject: resolvedSubject,
            chapter: resolvedChapter,
            difficulty,
            output_type: "summary",
            language: input.language || "both",
            title: `${resolvedSubject}: ${resolvedTopic} (Summary)`,
            content: `${oneLine}\n\n${overview}\n\n${detailedExplanation}`,
            coin_cost: coinCost,
          })
          .select("id")
          .single();
        if (noteRow?.id) {
          recordId = noteRow.id;
        }
      } catch (insertErr) {
        console.warn("Could not persist summary to notes table:", insertErr);
      }

      return {
        id: recordId,
        subject: resolvedSubject,
        chapter: resolvedChapter,
        topic: response.topic_title || resolvedTopic,
        topic_found: true,
        difficulty,
        language: input.language,
        one_line_summary: oneLine,
        overview: overview,
        detailed_explanation: detailedExplanation,
        key_concepts: finalKeyConcepts,
        definitions: finalDefinitions,
        formulas: finalFormulas,
        examples: response.examples || [],
        exam_points: finalExamPoints,
        exam_tips: finalExamPoints,
        likely_questions: response.likely_questions || [],
        source_pages: response.source_pages || input.pageRange || "Selected Document Pages",
        coinCost,
        createdAt: new Date().toISOString(),
        coinsRemaining: deduction.newBalance,
      };
    } catch (err: any) {
      console.error("AI Summary Generation Failed, refunding coins:", err);
      await walletService.addCoins(
        userId,
        coinCost,
        `Refund: Failed Topic Summary (${input.customTopic || input.topic || "Summary"})`
      );
      throw err;
    }
  }

  /**
   * Get all notes for user
   */
  public async getUserNotes(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }

    return data;
  }

  /**
   * Get single note by id
   */
  public async getNoteById(userId: string, noteId: string) {
    const { data, error } = await supabaseAdmin
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new Error("Note not found or unauthorized access");
    }

    return data;
  }

  /**
   * Delete note
   */
  public async deleteNote(userId: string, noteId: string) {
    const { error } = await supabaseAdmin
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`);
    }

    return { success: true };
  }

  private generateFallbackTopicSummary(
    topic: string,
    chapter: string,
    subject: string,
    contextText: string,
    _difficulty: string,
    language: string,
    pageRange?: string | null
  ) {
    const isBangla = language === "bangla";
    const currMatch = findCurriculumSubject(subject || chapter || "", contextText || topic);

    let chDef: any = null;
    if (currMatch) {
      const lowerCh = (chapter || topic).toLowerCase();
      chDef =
        currMatch.chapters.find(
          (c) =>
            c.title.toLowerCase().includes(lowerCh) ||
            c.titleBn.toLowerCase().includes(lowerCh) ||
            lowerCh.includes(c.chapterNumber)
        ) || currMatch.chapters[0];
    }

    const cleanTitle = topic || chapter || "Academic Study Summary";
    const cleanSubject = subject || currMatch?.subjectName || "Curriculum Subject";

    let oneLine = "";
    let overview = "";
    let detailed = "";
    let keyConcepts: string[] = [];
    let definitions: Array<{ term: string; definition: string; page?: string }> = [];
    let formulas: Array<{ name: string; formula: string; explanation: string }> = [];
    let examples: string[] = [];
    let examPoints: string[] = [];
    let likelyQuestions: string[] = [];

    if (chDef) {
      oneLine = isBangla
        ? `${chDef.titleBn} হলো ${cleanSubject}-এর একটি গুরুত্বপূর্ণ বিষয়, যা মূল তত্ত্ব ও ব্যবহারিক প্রয়োগ আলোচনা করে।`
        : `${chDef.title} is an essential unit of ${cleanSubject}, establishing foundational principles, analytical mechanisms, and standard applications.`;

      overview =
        chDef.summary ||
        `${chDef.title} (${cleanSubject}) covers core concepts, definitions, and high-yield board examination points.`;
      detailed =
        `${chDef.summary}\n\nKey areas of academic study include:\n` +
        chDef.subtopics.map((s: string) => `• ${s}`).join("\n");

      keyConcepts =
        chDef.subtopics && chDef.subtopics.length > 0
          ? chDef.subtopics.slice(0, 5)
          : [
              `Core theoretical foundations of ${chDef.title}`,
              `Governing analytical properties and standard terminology`,
              `Real-world academic applications and board exam question patterns`,
            ];

      definitions = chDef.keyDefinitions.map((d: any) => ({
        term: d.term,
        definition: d.definition,
        page: pageRange || `pp. ${chDef.startPage}–${chDef.endPage}`,
      }));

      formulas = chDef.formulasOrPoints.map((f: string, idx: number) => ({
        name: `${cleanTitle} Principle ${idx + 1}`,
        formula: f.includes(":") ? f.split(":")[0]?.trim() || f : f,
        explanation: f.includes(":") ? f.split(":")[1]?.trim() || "Standard curriculum formula" : "Standard curriculum point",
      }));

      examples = [
        `Practical application of ${cleanTitle} in modern scientific and technological processes.`,
        `Standard board examination scenario demonstrating the governing principles of ${chDef.title}.`,
      ];

      examPoints = [
        `Ensure accurate definitions, boundary conditions, and SI units for all quantities in ${chDef.title}.`,
        `Practice high-yield board questions emphasizing conceptual understanding and mathematical problem solving.`,
      ];

      likelyQuestions = [
        isBangla
          ? `${chDef.titleBn}-এর প্রধান বৈশিষ্ট্য ও প্রয়োজনীয়তা ব্যাখ্যা কর।`
          : `Explain the fundamental concepts and importance of ${cleanTitle}.`,
        isBangla
          ? `${chDef.titleBn}-এর ক্ষেত্রে প্রযোজ্য মূল নীতি ও সূত্রসমূহ আলোচনা কর।`
          : `State and discuss the core principles and laws governing ${cleanTitle}.`,
      ];
    } else {
      // General textbook / custom uploaded document extraction
      const sentences = (contextText || "")
        .split(/[.\n।]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 25 && s.length <= 160);

      oneLine = sentences[0]
        ? `${sentences[0]}.`
        : `${cleanTitle} encompasses key theoretical principles, definitions, and analytical mechanisms in ${cleanSubject}.`;

      overview = sentences.slice(0, 3).join(". ") + (sentences.length > 0 ? "." : "");
      if (!overview || overview.length < 30) {
        overview = `${cleanTitle} (${cleanSubject}) covers core academic concepts, principles, structured definitions, and high-yield exam insights.`;
      }

      detailed =
        sentences.length >= 4
          ? sentences.slice(0, 8).map((s) => `• ${s}.`).join("\n")
          : `${overview}\n\nKey learning objectives focus on conceptual understanding, terminology mastery, and exam preparation for ${cleanTitle}.`;

      keyConcepts =
        sentences.length >= 3
          ? sentences.slice(0, 4)
          : [
              `Core conceptual foundations of ${cleanTitle}`,
              `Standard analytical mechanisms and standard terminology`,
              `High-yield board examination points and structured questions`,
            ];

      definitions = [
        {
          term: cleanTitle,
          definition:
            sentences[0] ||
            `The core study unit covering essential principles and analytical frameworks in ${cleanSubject}.`,
          page: pageRange || "Selected Document Pages",
        },
      ];

      formulas = [
        {
          name: `${cleanTitle} Analytical Principle`,
          formula: "Standard Curriculum Relationship",
          explanation: `Governing rule and quantitative relationship for ${cleanTitle}.`,
        },
      ];

      examples = [`Practical real-world application of ${cleanTitle} concepts in problem-solving.`];

      examPoints = [
        `Memorize fundamental terminology and boundary conditions for ${cleanTitle}.`,
        `Review past exam questions and avoid common conceptual pitfalls.`,
      ];

      likelyQuestions = [
        `What are the key concepts and significance of ${cleanTitle}?`,
        `How do the principles of ${cleanTitle} apply to standard curriculum problems?`,
      ];
    }

    return {
      topic_found: true,
      topic_title: cleanTitle,
      one_line_summary: oneLine,
      overview,
      detailed_explanation: detailed,
      key_concepts: keyConcepts,
      definitions,
      formulas,
      examples,
      exam_points: examPoints,
      exam_tips: examPoints,
      likely_questions: likelyQuestions,
      source_pages: pageRange || "Selected Material",
    };
  }

  private generateFallbackNotes(input: GenerateNotesInput, contextText: string): string {
    const isBangla = input.language === "bangla";
    const currMatch = findCurriculumSubject(input.subject || input.chapter || "", contextText);

    let chDef: any = null;
    if (currMatch) {
      const lowerCh = (input.chapter || "").toLowerCase();
      chDef =
        currMatch.chapters.find(
          (c) =>
            c.title.toLowerCase().includes(lowerCh) ||
            c.titleBn.toLowerCase().includes(lowerCh) ||
            lowerCh.includes(c.chapterNumber) ||
            c.subtopics.some((s) => s.toLowerCase().includes(lowerCh))
        ) || currMatch.chapters[0];
    }

    const cleanSubject = input.subject || currMatch?.subjectName || "Academic Study";
    const cleanChapter = input.chapter || chDef?.title || "Curriculum Chapter";
    const difficultyLevel = (input.difficulty || "medium").toUpperCase();
    const outputFormat = (input.outputType || "detailed").toUpperCase();

    if (chDef) {
      const overviewText =
        chDef.summary ||
        `${cleanSubject} — ${chDef.title} is a core unit in the national curriculum covering foundational concepts, formulas, and examination applications.`;

      const definitionsMarkdown = (chDef.keyDefinitions || [])
        .map((d: any, idx: number) => {
          return `### ${idx + 1}. **${d.term}**\n- **Definition:** ${d.definition}\n- **Context:** Fundamental curriculum definition required for board exam mastery.`;
        })
        .join("\n\n");

      const formulasMarkdown = (chDef.formulasOrPoints || [])
        .map((f: string) => {
          const parts = f.includes(":") ? f.split(":") : [f, "Standard curriculum principle and formula."];
          return `- **${parts[0].trim()}**: \`${parts[0].trim()}\`\n  - *Explanation:* ${parts.slice(1).join(":").trim()}`;
        })
        .join("\n");

      const subtopicsMarkdown = (chDef.subtopics || [])
        .map((s: string, idx: number) => {
          return `### 4.${idx + 1} ${s}\nDetailed academic exploration of **${s}** demonstrating theoretical principles, mathematical derivations, practical applications, and everyday analogies. Key focus areas include experimental observations, standard problem scenarios, and board exam question patterns.`;
        })
        .join("\n\n");

      const boardQuestionsMarkdown = `
### Short Questions (জ্ঞান ও অনুধাবনমূলক - 1 & 2 Marks)
1. **${isBangla ? `${chDef.titleBn} কাকে বলে?` : `Define the core concept of ${chDef.title}.`}**
   - **উত্তর/Answer:** ${chDef.keyDefinitions?.[0]?.definition || "Standard academic definition based on textbook curriculum."}
2. **${isBangla ? `${chDef.titleBn}-এর প্রধান তাৎপর্য ব্যাখ্যা কর।` : `Explain the practical significance of ${chDef.title}.`}**
   - **উত্তর/Answer:** ${chDef.summary.slice(0, 160)}...

### Long Analytical Questions (প্রয়োগ ও উচ্চতর দক্ষতা - 3 & 4 Marks)
1. **${isBangla ? `${chDef.titleBn}-এর ক্ষেত্রে প্রযোজ্য সূত্রাবলী বিশ্লেষণ কর এবং গাণিতিক প্রয়োগ দেখাও।` : `Analyze the governing equations of ${chDef.title} with practical mathematical applications.`}**
   - **মডেল সমাধান/Model Solution:** Utilize governing curriculum laws: ${chDef.formulasOrPoints?.[0] || "Standard formulas"}. Identify known variables, apply SI units, and calculate the step-by-step result with complete accuracy.
2. **${isBangla ? `দৈনন্দিন জীবনে ${chDef.titleBn}-এর প্রভাব ও গুরুত্ব মূল্যায়ন কর।` : `Evaluate the real-world applications and technological impact of ${chDef.title}.`}**
   - **মডেল সমাধান/Model Solution:** Comprehensively integrates theoretical concepts with modern technological, scientific, and experimental phenomena.
`;

      const cheatSheetItems = [
        ...(chDef.keyDefinitions || []).map((d: any) => `• **${d.term}**: ${d.definition}`),
        ...(chDef.formulasOrPoints || []).map((f: string) => `• **Key Law/Formula**: ${f}`),
      ]
        .slice(0, 8)
        .join("\n");

      return `# ${cleanSubject}: ${cleanChapter}
> **Target Level:** Class 9-10 (SSC) / Academic · **Format:** ${outputFormat} · **Difficulty:** ${difficultyLevel}

---

## 📌 1. Chapter Overview & Learning Objectives
${overviewText}

This revision unit is structured to build progressive conceptual clarity, analytical problem-solving competence, and examination-focused retention.

---

## 🧠 2. Core Concepts & Bilingual Definitions
${definitionsMarkdown || `### 1. **${cleanChapter} Fundamentals**\n- **Definition:** Core theoretical structure of ${cleanSubject}.\n- **Focus:** Examination definitions and conceptual understanding.`}

---

## 📐 3. Governing Formulas, Laws & Units
${formulasMarkdown || `- **Core Principle**: Standard curriculum equations, SI units, and calculating conventions for ${cleanChapter}.`}

---

## 💡 4. Detailed Explanations & Practical Real-World Examples
${subtopicsMarkdown || `### Core Concept Breakdown\nComprehensive explanation of ${cleanChapter} with step-by-step logic, real-world analogies, and practical curriculum examples.`}

---

## 🎯 5. High-Yield Board Exam Questions & Solutions
${boardQuestionsMarkdown}

---

## ⚡ 6. Last-Minute Rapid Revision Cheat Sheet
${cheatSheetItems || `• Review all key definitions, formula derivations, and sign conventions before entering the exam room.`}
`;
    }

    // Custom document / text extraction fallback
    const sentences = (contextText || "")
      .split(/[.\n।]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 20 && s.length <= 200);

    const overview =
      sentences.slice(0, 3).join(". ") +
      (sentences.length > 0 ? "." : `${cleanSubject} study guide covering ${cleanChapter}.`);
    const keyPoints = sentences
      .slice(3, 8)
      .map((s, i) => `### ${i + 1}. **Concept ${i + 1}**\n- ${s}.`)
      .join("\n\n");
    const formulasList = sentences.filter((s) => /[=+\-*\/%]|\bformula\b|\blaw\b|\bunit\b/i.test(s)).slice(0, 4);

    return `# ${cleanSubject}: ${cleanChapter}
> **Target Level:** Academic / SSC · **Format:** ${outputFormat} · **Difficulty:** ${difficultyLevel}

---

## 📌 1. Chapter Overview & Learning Objectives
${overview}

---

## 🧠 2. Core Concepts & Key Definitions
${keyPoints || `### 1. **${cleanChapter} Overview**\n- Core concepts and theoretical principles extracted from study material.`}

---

## 📐 3. Governing Formulas, Laws & Units
${formulasList.length > 0 ? formulasList.map((f, i) => `- **Rule ${i + 1}**: \`${f}\``).join("\n") : `- **Key Formula/Law**: Standard relationships and SI units in ${cleanSubject}.`}

---

## 💡 4. Detailed Explanations & Practical Real-World Examples
### Detailed Curriculum Analysis
Practical breakdown of ${cleanChapter} with step-by-step logic and structured analysis of the subject material.

---

## 🎯 5. High-Yield Board Exam Questions & Solutions
### Short Questions (জ্ঞান ও অনুধাবনমূলক)
1. **Explain the fundamental concept of ${cleanChapter}.**
   - **Model Answer:** ${sentences[0] || `Key conceptual definition of ${cleanChapter}.`}

### Long Analytical Questions (প্রয়োগ ও উচ্চতর দক্ষতা)
1. **Analyze the practical applications and theoretical significance of ${cleanChapter}.**
   - **Model Solution:** Ground explanations in principles of ${cleanSubject}, identifying core variables and real-world relevance.

---

## ⚡ 6. Last-Minute Rapid Revision Cheat Sheet
• Core definition and concepts of ${cleanChapter}.
• Review important units, formulas, and examination scoring points.
`;
  }
}

export const notesService = new NotesService();
