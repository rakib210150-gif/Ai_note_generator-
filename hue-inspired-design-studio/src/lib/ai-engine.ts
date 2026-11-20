/**
 * AI content generation engine.
 * Generates notes, quizzes, revision sheets from uploaded text content.
 * Uses template-based generation (no external API required).
 */

import type { QuizQuestion } from "./store";

// ─── Text extraction from file content ─────────────────────
export function extractTextFromContent(content: string): string {
  return content
    .replace(/[\r\n]+/g, "\n")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

// ─── Note generation ────────────────────────────────────────
interface NoteConfig {
  subject: string;
  chapter: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  outputType: "detailed" | "short" | "exam-ready" | "definitions" | "flashcards";
  language: "english" | "bangla" | "both";
  sourceText?: string;
}

export function generateNotes(config: NoteConfig): string {
  const { subject, chapter, difficulty, outputType, sourceText } = config;

  const sentences = sourceText
    ? sourceText.split(/[.!?]+/).filter((s) => s.trim().length > 15).map((s) => s.trim())
    : [];

  const keyPoints = sentences.length > 0
    ? sentences.slice(0, Math.min(sentences.length, 12))
    : getDefaultPoints(subject, chapter);

  switch (outputType) {
    case "detailed":
      return generateDetailedNotes(subject, chapter, difficulty, keyPoints);
    case "short":
      return generateShortNotes(subject, chapter, keyPoints);
    case "exam-ready":
      return generateExamNotes(subject, chapter, difficulty, keyPoints);
    case "definitions":
      return generateDefinitions(subject, chapter, keyPoints);
    case "flashcards":
      return generateFlashcards(subject, chapter, keyPoints);
    default:
      return generateShortNotes(subject, chapter, keyPoints);
  }
}

function generateDetailedNotes(subject: string, chapter: string, difficulty: string, points: string[]): string {
  const level = difficulty === "beginner" ? "foundational" : difficulty === "intermediate" ? "intermediate" : "advanced";
  let content = `# ${subject} — ${chapter}\n## Detailed Notes (${level} level)\n\n`;
  content += `### Overview\nThis chapter covers the core concepts of ${chapter} in ${subject}. `;
  content += `These notes are structured for ${level}-level understanding.\n\n`;
  content += `### Key Concepts\n\n`;
  points.forEach((p, i) => {
    content += `**${i + 1}. ${p.charAt(0).toUpperCase() + p.slice(1)}**\n`;
    content += `   - This is a fundamental concept that forms the basis for understanding ${chapter}.\n`;
    content += `   - Pay attention to the relationships between different elements.\n\n`;
  });
  content += `### Summary\n`;
  content += `The main takeaways from this chapter are the ${points.length} key concepts listed above. `;
  content += `Make sure to review each one and understand how they connect to the broader topic of ${subject}.\n\n`;
  content += `### Study Tips\n`;
  content += `- Review these notes alongside your textbook\n`;
  content += `- Practice with the quiz generator for self-assessment\n`;
  content += `- Create revision sheets for exam preparation\n`;
  return content;
}

function generateShortNotes(subject: string, chapter: string, points: string[]): string {
  let content = `# ${subject} — ${chapter} (Short Notes)\n\n`;
  points.forEach((p, i) => {
    content += `${i + 1}. ${p.charAt(0).toUpperCase() + p.slice(1)}\n`;
  });
  content += `\n---\n_Generated from your study material. Always verify against your textbook._\n`;
  return content;
}

function generateExamNotes(subject: string, chapter: string, difficulty: string, points: string[]): string {
  let content = `# ${subject} — ${chapter}\n## Exam-Ready Notes\n\n`;
  content += `**Difficulty:** ${difficulty}\n\n`;
  content += `### Frequently Tested Topics\n\n`;
  points.slice(0, 8).forEach((p, i) => {
    content += `**Q${i + 1}:** Explain ${p.toLowerCase()}\n`;
    content += `**A:** ${p}. This concept is essential for understanding ${chapter} and is frequently tested in examinations.\n\n`;
  });
  content += `### Quick Memory Aids\n`;
  points.slice(0, 5).forEach((p) => {
    const words = p.split(" ").filter((w) => w.length > 3);
    if (words.length >= 3) {
      const letters = words.slice(0, 3).map((w) => (w[0] ? w[0].toUpperCase() : "")).join("");
      content += `- **${letters}** → ${p}\n`;
    }
  });
  return content;
}

function generateDefinitions(subject: string, chapter: string, points: string[]): string {
  let content = `# ${subject} — ${chapter}\n## Key Definitions\n\n`;
  points.forEach((p) => {
    const parts = p.split(/[,:;-]/);
    const term = parts[0]?.trim() || p;
    content += `**${term}:** ${p}\n\n`;
  });
  return content;
}

function generateFlashcards(subject: string, chapter: string, points: string[]): string {
  let content = `# ${subject} — ${chapter}\n## Flashcards\n\n`;
  points.forEach((p, i) => {
    const parts = p.split(/[,:;-]/);
    const front = parts[0]?.trim() || `Concept ${i + 1}`;
    const back = parts.slice(1).join(",").trim() || p;
    content += `---\n### Card ${i + 1}\n**Front:** What is ${front.toLowerCase()}?\n**Back:** ${back || p}\n\n`;
  });
  return content;
}

function getDefaultPoints(subject: string, chapter: string): string[] {
  return [
    `Introduction to ${chapter} in ${subject}`,
    `Core principles and fundamental concepts`,
    `Key terminology and definitions`,
    `Important formulas and relationships`,
    `Real-world applications and examples`,
    `Common problem-solving approaches`,
    `Historical context and development`,
    `Connections to other topics in ${subject}`,
  ];
}

// ─── Quiz generation ────────────────────────────────────────
// ─── Quiz generation ────────────────────────────────────────
export function generateQuiz(subject: string, chapter: string, sourceText?: string, count = 10): QuizQuestion[] {
  const isBangla = /[\u0980-\u09FF]/.test(`${subject} ${chapter} ${sourceText || ""}`) ||
    subject.toLowerCase().includes("bangla") ||
    subject.toLowerCase().includes("bangladesh") ||
    chapter.toLowerCase().includes("bangla") ||
    chapter.toLowerCase().includes("bangladesh");

  // Clean raw source text by removing dummy boilerplate
  const cleanedText = (sourceText || "")
    .replace(/^Extracted text from .*$/gim, "")
    .replace(/^Chapter summary and curriculum content .*$/gim, "")
    .replace(/^Key topics included in this file cover .*$/gim, "")
    .replace(/^.*was successfully indexed for .*$/gim, "")
    .trim();

  let sentences = cleanedText
    ? cleanedText.split(/[.!?\n]+/).filter((s) => s.trim().length > 25).map((s) => s.trim())
    : [];

  if (sentences.length === 0) {
    sentences = isBangla
      ? [
          `${chapter} হলো ${subject}-এর একটি অত্যন্ত গুরুত্বপূর্ণ ও মৌলিক অধ্যায়`,
          `১৯৭১ সালের স্বাধীনতা যুদ্ধ ও ঐতিহাসিক প্রেক্ষাপট বাংলাদেশের অভ্যুদয়ের মূল ভিত্তি`,
          `ঐতিহাসিক ৭ই মার্চের ভাষণ বাঙালির জাতীয় মুক্তি আন্দোলনের অন্যতম নির্দেশিকা`,
          `মুক্তিযুদ্ধের প্রধান সেনাপতি ছিলেন জেনারেল আতাউল গনি ওসমানী`,
          `মুজিবনগর সরকার গঠিত হয় ১৯৭১ সালের ১০ই এপ্রিল এবং শপথ গ্রহণ করে ১৭ই এপ্রিল`,
          `বীরশ্রেষ্ঠ খেতাবপ্রাপ্ত শহীদদের সর্বমোট সংখ্যা হলো সাতজন`,
          `১৯৭১ সালের ১৬ই ডিসেম্বর বাংলাদেশ চূড়ান্ত বিজয় অর্জন করে`,
        ]
      : getDefaultPoints(subject, chapter);
  }

  const questions: QuizQuestion[] = [];
  const usedSentences = new Set<number>();

  for (let i = 0; i < count; i++) {
    const sIndex = i % sentences.length;
    const sentence = sentences[sIndex] || `${subject}: Key principle of ${chapter}`;

    const words = sentence.split(" ").filter((w) => w.length > 3 && !w.startsWith("http"));
    const keywordIdx = Math.floor(Math.random() * Math.min(words.length, 5));
    const keyword = words[keywordIdx] || words[0] || (isBangla ? "ঐতিহাসিক ঘটনা" : "core principle");

    let questionPrompt = "";
    if (isBangla) {
      questionPrompt = sentence.includes(keyword)
        ? `"${sentence.replace(keyword, "______")}" — শূন্যস্থানে সঠিক তথ্য কোনটি?`
        : `${chapter} সম্পর্কিত নিচের কোন বিবৃতিটি সত্য?`;
    } else {
      questionPrompt = sentence.includes(keyword)
        ? `In the context of ${chapter}, complete the statement: "${sentence.replace(keyword, "______")}"`
        : `Which of the following statements accurately describes ${chapter} in ${subject}?`;
    }

    const distractors = generateDistractors(keyword, words, isBangla);
    const options = shuffleWithCorrect(keyword, distractors);
    const correctIndex = options.indexOf(keyword);

    questions.push({
      id: `q_${Date.now()}_${i + 1}`,
      question: questionPrompt,
      options: options.slice(0, 4),
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      explanation: isBangla
        ? `সঠিক উত্তর হলো "${keyword}"। মূল তথ্য: ${sentence}`
        : `The correct answer is "${keyword}". Factual context: ${sentence}`,
    });
  }

  return questions;
}

function generateDistractors(keyword: string, contextWords: string[], isBangla = false): string[] {
  const distractors: string[] = [];
  const otherWords = contextWords.filter((w) => w !== keyword && w.length > 2);

  for (const w of otherWords) {
    if (distractors.length >= 3) break;
    if (!distractors.includes(w)) distractors.push(w);
  }

  const fillers = isBangla
    ? ["সংবিধান ও নীতিমালা", "ঐতিহাসিক ঘোষণা", "প্রশাসনিক কাঠামো", "কৌশলগত নীতি", "অধিকার সনদ", "জাতীয় সনদ"]
    : ["fundamental law", "equilibrium state", "invariant parameter", "empirical coefficient", "dynamic boundary", "conservation limit"];

  for (const filler of fillers) {
    if (distractors.length >= 3) break;
    if (!distractors.includes(filler) && filler !== keyword) {
      distractors.push(filler);
    }
  }

  while (distractors.length < 3) {
    distractors.push(isBangla ? `বিকল্প অপশন ${distractors.length + 1}` : `Alternative Concept ${distractors.length + 1}`);
  }

  return distractors.slice(0, 3);
}

function shuffleWithCorrect(correct: string, distractors: string[]): string[] {
  const all: string[] = [correct, ...distractors.slice(0, 3)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = all[i]!;
    all[i] = all[j]!;
    all[j] = temp;
  }
  return all;
}

// ─── Revision Sheet generation ──────────────────────────────
export function generateRevisionSheet(subject: string, chapter: string, sourceText?: string) {
  const sentences = sourceText
    ? sourceText.split(/[.!?]+/).filter((s) => s.trim().length > 15).map((s) => s.trim())
    : getDefaultPoints(subject, chapter);

  const keyPoints = sentences.slice(0, 8).map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  const formulas: string[] = [];
  if (sourceText) {
    const formulaMatches = sourceText.match(/[A-Z]\s*=\s*[^.]+/g) || [];
    formulas.push(...formulaMatches.slice(0, 5));
  }
  if (formulas.length === 0) {
    formulas.push(`Key relationship in ${chapter}`);
  }

  const memoryAids = keyPoints.slice(0, 4).map((p) => {
    const words = p.split(" ").filter((w) => w.length > 3).slice(0, 3);
    const letters = words.map((w) => (w[0] ? w[0].toUpperCase() : "")).join("");
    return `${letters} → ${p}`;
  });

  const quickQuestions = keyPoints.slice(0, 5).map((p) => {
    const parts = p.split(/[,:;-]/);
    const term = parts[0]?.trim() || p;
    return `What is ${term.toLowerCase()}?`;
  });

  return { keyPoints, formulas, memoryAids, quickQuestions };
}

// ─── Coin cost calculation ──────────────────────────────────
export function calculateCoinCost(action: "notes" | "quiz" | "revision", textLength: number): number {
  const baseCost = { notes: 10, quiz: 15, revision: 8 };
  const lengthMultiplier = Math.ceil(textLength / 1000);
  return Math.min(baseCost[action] + lengthMultiplier * 2, 50);
}
