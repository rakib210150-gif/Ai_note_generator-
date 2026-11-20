/**
 * Client-side store using localStorage.
 * Manages: auth, files, notes, quizzes, coins, progress, wallet.
 */

import { api } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  country?: string;
  coins: number;
  classLevel?: string | undefined; // "9-10" | "11-12" | "university"
  createdAt: string;
}

export interface UploadedFile {
  id: string;
  backendId?: string | undefined;
  name: string;
  type: string;
  size: number;
  content: string; // extracted text content
  uploadedAt: string;
  subject?: string | undefined;
  chapter?: string | undefined;
  isOfficial?: boolean | undefined;
  targetClass?: string | undefined;
}

export interface GeneratedNote {
  id: string;
  fileId?: string | undefined;
  subject: string;
  chapter: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  outputType: "detailed" | "short" | "exam-ready" | "definitions" | "flashcards";
  language: "english" | "bangla" | "both";
  title: string;
  content: string;
  createdAt: string;
  coinCost: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  fileId?: string | undefined;
  noteId?: string | undefined;
  subject: string;
  chapter: string;
  title: string;
  questions: QuizQuestion[];
  score?: number | undefined;
  totalQuestions: number;
  completedAt?: string | undefined;
  createdAt: string;
  coinCost: number;
}

export interface UserActivityLog {
  id: string;
  featureId: string;
  featureTitle: string;
  actionType: string;
  title: string;
  documentName?: string | undefined;
  documentId?: string | undefined;
  details?: string | undefined;
  timestamp: string;
  route: string;
}

export interface RevisionSheet {
  id: string;
  subject: string;
  chapter: string;
  title: string;
  keyPoints: string[];
  formulas: string[];
  memoryAids: string[];
  quickQuestions: string[];
  createdAt: string;
  coinCost: number;
}

export interface SubjectProgress {
  subject: string;
  chaptersTotal: number;
  chaptersCompleted: number;
  quizzesTaken: number;
  averageScore: number;
}

export interface WalletEntry {
  id: string;
  action: string;
  coins: number;
  timestamp: string;
}

// ─── User-Isolated Helpers ──────────────────────────────────
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getCurrentUserId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    const raw = localStorage.getItem("bn_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id) return u.id;
    }
  } catch {}
  return "guest";
}

function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const userId = getCurrentUserId();
    const raw = localStorage.getItem(`bn_${userId}_${key}`);
    if (raw !== null) {
      return JSON.parse(raw) as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    const userId = getCurrentUserId();
    localStorage.setItem(`bn_${userId}_${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function ensureInitialSeed() {
  // No-op. Preserves unauthenticated guest state until registration or login.
}

export const GUEST_USER: User = {
  id: "guest",
  name: "Guest Student",
  email: "",
  coins: 0,
  classLevel: "9-10",
  createdAt: new Date().toISOString(),
};

// ─── Auth & Session Management ──────────────────────────────
export function getUser(): User {
  if (typeof window === "undefined") {
    return GUEST_USER;
  }
  try {
    const raw = localStorage.getItem("bn_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.id && u.id !== "guest" && u.email) {
        if (typeof u.coins !== "number") {
          u.coins = 500;
          try {
            localStorage.setItem("bn_user", JSON.stringify(u));
          } catch {}
        }
        return u as User;
      }
    }
  } catch {}
  return GUEST_USER;
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("bn_user");
    const token = localStorage.getItem("bn_auth_token");
    if (!raw || !token) return false;
    const u = JSON.parse(raw);
    return Boolean(u && u.id && u.id !== "guest" && u.email && token.trim().length > 10);
  } catch {
    return false;
  }
}

export function setCurrentUser(user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem("bn_user", JSON.stringify(user));
  // Ensure wallet bonus is registered in user's isolated store
  const currentWallet = get<WalletEntry[]>("wallet", []);
  if (currentWallet.length === 0) {
    set("wallet", [
      {
        id: uid(),
        action: "Welcome Starter Bonus",
        coins: user.coins || 500,
        timestamp: new Date().toISOString(),
      },
    ]);
  }
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("bn_user");
  localStorage.removeItem("bn_auth_token");
}

export function login(email: string, password: string): User {
  const existingUser = getUser();
  if (existingUser && existingUser.id !== "guest" && existingUser.email === email) {
    return existingUser;
  }
  const u: User = {
    id: uid(),
    name: email.split("@")[0] || "Student",
    email,
    coins: 500,
    createdAt: new Date().toISOString(),
  };
  setCurrentUser(u);
  return u;
}

export function signup(name: string, email: string, password: string): User {
  const u: User = {
    id: uid(),
    name,
    email,
    coins: 500,
    createdAt: new Date().toISOString(),
  };
  setCurrentUser(u);
  return u;
}

export function updateCoins(delta: number): number {
  const user = getUser();
  if (user.id === "guest") return 0;
  user.coins = Math.max(0, user.coins + delta);
  setCurrentUser(user);
  return user.coins;
}

/**
 * Retrieve the active class level across all features.
 * Prioritizes persistent localStorage, then user profile, defaulting to "9-10".
 */
export function getSelectedClass(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("bn_selected_class");
      if (stored) return stored;
    } catch {}
  }
  const user = getUser();
  return user?.classLevel || "9-10";
}

/**
 * Persist the user's selected class globally so it remains consistent across
 * navigation, AI Note Generation, Quiz, Topic Summaries, and all study tools.
 */
export function setSelectedClass(classLevel: string): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("bn_selected_class", classLevel);
      window.dispatchEvent(new CustomEvent("bn_class_changed", { detail: { classLevel } }));
    } catch {}
  }
  const user = getUser();
  user.classLevel = classLevel;
  if (user.id && user.id !== "guest") {
    setCurrentUser(user);
    api.updateClassLevel(classLevel).catch(() => {});
  }
}

export function setClassLevel(classLevel: string): void {
  setSelectedClass(classLevel);
}

// ─── Files ──────────────────────────────────────────────────
export const OFFICIAL_CLASS_9_10_FILES: UploadedFile[] = [
  {
    id: "7967a517-4b9b-4332-ba95-f9986be1cfdb",
    backendId: "7967a517-4b9b-4332-ba95-f9986be1cfdb",
    name: "Physics pdf class 9-10 .pdf",
    type: "application/pdf",
    size: 19808822,
    uploadedAt: "2026-03-31T00:00:00.000Z",
    subject: "Physics",
    chapter: "Complete NCTB Textbook (Chapters 1-14)",
    isOfficial: true,
    targetClass: "9-10",
    content: "NCTB Secondary Physics Class 9-10: Chapters 1 to 14 covering Physical World and Measurement, Motion, Force, Work Power and Energy, Pressure and States of Matter, Effect of Heat on Matter, Waves and Sound, Reflection of Light, Refraction of Light, Current Electricity, Static Electricity, Magnetic Effect of Current, Modern Physics and Electronics, and Physics in Saving Lives.",
  },
  {
    id: "02e130f9-9ee4-4537-bb61-521971e93424",
    backendId: "02e130f9-9ee4-4537-bb61-521971e93424",
    name: "Biology pdf class 9-10 com.pdf",
    type: "application/pdf",
    size: 24862151,
    uploadedAt: "2026-03-31T00:00:00.000Z",
    subject: "Biology",
    chapter: "Complete NCTB Textbook (Chapters 1-14)",
    isOfficial: true,
    targetClass: "9-10",
    content: "NCTB Secondary Biology Class 9-10: Chapters 1 to 14 covering Life Lessons & Classification, Cells and Tissues of Plants and Animals, Cell Division (Mitosis & Meiosis), Bioenergetics (Photosynthesis & Cellular Respiration), Food Nutrition and Digestion, Transport in Organisms, Gaseous Exchange, Excretory System, Movement and Locomotion, Coordination and Hormones, Reproduction in Organisms, Heredity and Evolution, Environment and Ecosystems, and Biotechnology.",
  },
];

export interface ChapterItem {
  id: number;
  name: string;
  bn: string;
}

export interface Class910ChaptersMap {
  Physics: ChapterItem[];
  Biology: ChapterItem[];
  [key: string]: ChapterItem[] | undefined;
}

export const CLASS_9_10_CHAPTERS: Class910ChaptersMap = {
  Physics: [
    { id: 1, name: "Chapter 1: Physical World and Measurement", bn: "ভৌত রাশি ও পরিমাপ" },
    { id: 2, name: "Chapter 2: Motion", bn: "গতি" },
    { id: 3, name: "Chapter 3: Force", bn: "বল" },
    { id: 4, name: "Chapter 4: Work, Power and Energy", bn: "কাজ, ক্ষমতা ও শক্তি" },
    { id: 5, name: "Chapter 5: Pressure and States of Matter", bn: "পদার্থের অবস্থা ও চাপ" },
    { id: 6, name: "Chapter 6: Effect of Heat on Matter", bn: "বস্তুর উপর তাপের প্রভাব" },
    { id: 7, name: "Chapter 7: Waves and Sound", bn: "তরঙ্গ ও শব্দ" },
    { id: 8, name: "Chapter 8: Reflection of Light", bn: "আলোর প্রতিফলন" },
    { id: 9, name: "Chapter 9: Refraction of Light", bn: "আলোর প্রতিসরণ" },
    { id: 10, name: "Chapter 10: Static Electricity", bn: "স্থির তড়িৎ" },
    { id: 11, name: "Chapter 11: Current Electricity", bn: "চল তড়িৎ" },
    { id: 12, name: "Chapter 12: Magnetic Effect of Current", bn: "বিদ্যুতের চৌম্বক ক্রিয়া" },
    { id: 13, name: "Chapter 13: Modern Physics and Electronics", bn: "আধুনিক পদার্থবিজ্ঞান ও ইলেকট্রনিক্স" },
    { id: 14, name: "Chapter 14: Physics to Save Life", bn: "জীবন বাঁচাতে পদার্থবিজ্ঞান" },
  ],
  Biology: [
    { id: 1, name: "Chapter 1: Lessons on Life", bn: "জীবন পাঠ" },
    { id: 2, name: "Chapter 2: Cells and Tissues of Organisms", bn: "জীবকোষ ও টিস্যু" },
    { id: 3, name: "Chapter 3: Cell Division", bn: "কোষ বিভাজন" },
    { id: 4, name: "Chapter 4: Bio-energetics", bn: "জীবনীশক্তি (Photosynthesis & Respiration)" },
    { id: 5, name: "Chapter 5: Food, Nutrition and Digestion", bn: "খাদ্য, পুষ্টি এবং পরিপাক" },
    { id: 6, name: "Chapter 6: Transport in Organisms", bn: "জীবে পরিবহন ও রক্ত সংবহন" },
    { id: 7, name: "Chapter 7: Gaseous Exchange", bn: "গ্যাসীয় বিনিময় ও শ্বাসক্রিয়া" },
    { id: 8, name: "Chapter 8: Excretion in Organisms", bn: "রেচন প্রক্রিয়া ও বৃক্ক" },
    { id: 9, name: "Chapter 9: Movement and Locomotion", bn: "দৃঢ়তা প্রদান ও চলন" },
    { id: 10, name: "Chapter 10: Coordination", bn: "সমন্বয় ও হরমোন" },
    { id: 11, name: "Chapter 11: Reproduction in Organisms", bn: "জীবের প্রজনন ও ভ্রূণ বিকাশ" },
    { id: 12, name: "Chapter 12: Heredity in Organisms and Evolution", bn: "জীবের বংশগতি ও বিবর্তন (DNA/Mendel)" },
    { id: 13, name: "Chapter 13: Environment of Life", bn: "জীবের পরিবেশ ও বাস্তুতন্ত্র" },
    { id: 14, name: "Chapter 14: Biotechnology", bn: "জীবপ্রযুক্তি (Genetic Engineering/Tissue Culture)" },
  ],
};

export function isOfficialDatabaseMaterial(file: { id?: string | undefined; name?: string | undefined; isOfficial?: boolean | undefined; backendId?: string | undefined; chapter?: string | undefined; subject?: string | undefined }): boolean {
  if (file.isOfficial) return true;
  const officialIds = ["7967a517-4b9b-4332-ba95-f9986be1cfdb", "02e130f9-9ee4-4537-bb61-521971e93424"];
  if (file.id && officialIds.includes(file.id)) return true;
  if (file.backendId && officialIds.includes(file.backendId)) return true;
  const lowerName = (file.name || "").toLowerCase().replace(/[\s._-]+/g, " ");
  if (
    lowerName.includes("physics pdf class 9 10") ||
    lowerName.includes("biology pdf class 9 10") ||
    lowerName.includes("physics nctb class 9 10") ||
    lowerName.includes("biology nctb class 9 10") ||
    lowerName.includes("physics nctb") ||
    lowerName.includes("biology nctb") ||
    lowerName.includes("official nctb")
  ) {
    return true;
  }
  const lowerChapter = (file.chapter || "").toLowerCase();
  if (lowerChapter.includes("complete nctb textbook")) {
    return true;
  }
  return false;
}

/**
 * Returns strictly user-uploaded files.
 * Official database textbooks are NEVER included here, preventing them from
 * appearing in user upload sections or general file lists.
 */
export function getFiles(): UploadedFile[] {
  ensureInitialSeed();
  const userFiles = get<UploadedFile[]>("files", []);
  const cleanFiles = userFiles.filter((f) => !isOfficialDatabaseMaterial(f));
  if (cleanFiles.length !== userFiles.length) {
    set("files", cleanFiles);
  }
  return cleanFiles;
}

/**
 * Returns official database textbooks strictly when the class is "9-10".
 * For any other class (11-12, BSc, etc.), returns an empty array.
 */
export function getDatabaseBooks(classLevel?: string): UploadedFile[] {
  const cls = classLevel || getSelectedClass();
  return cls === "9-10" ? OFFICIAL_CLASS_9_10_FILES : [];
}

/**
 * Returns all accessible study files for a feature:
 * User uploads + official database books (only if class is 9-10).
 */
export function getAllAccessibleFiles(classLevel?: string): UploadedFile[] {
  const userFiles = getFiles();
  const dbBooks = getDatabaseBooks(classLevel);
  return [...userFiles, ...dbBooks];
}

// ─── User Activities Tracking ────────────────────────────────
export function getUserActivities(): UserActivityLog[] {
  ensureInitialSeed();
  return get<UserActivityLog[]>("user_activities", []);
}

export function recordUserActivity(act: Omit<UserActivityLog, "id" | "timestamp">): UserActivityLog {
  ensureInitialSeed();
  const list = getUserActivities();
  const newAct: UserActivityLog = {
    ...act,
    id: uid(),
    timestamp: new Date().toISOString(),
  };
  list.unshift(newAct);
  set("user_activities", list.slice(0, 50));
  return newAct;
}

export function addFile(file: Omit<UploadedFile, "id" | "uploadedAt">): UploadedFile {
  ensureInitialSeed();
  const userFiles = get<UploadedFile[]>("files", []);
  const newFile: UploadedFile = { ...file, id: uid(), uploadedAt: new Date().toISOString() };
  userFiles.unshift(newFile);
  set("files", userFiles);
  recordUserActivity({
    featureId: "upload",
    featureTitle: "PDF & Document Upload",
    actionType: "Uploaded Document",
    title: newFile.name,
    documentId: newFile.id,
    documentName: newFile.name,
    details: `${((newFile.size || 0) / (1024 * 1024)).toFixed(1)} MB · Ready for AI processing`,
    route: "/dashboard/upload",
  });
  return newFile;
}

export function deleteFile(id: string) {
  // Prevent deleting official system textbooks
  if (OFFICIAL_CLASS_9_10_FILES.some((m) => m.id === id || m.backendId === id)) {
    return;
  }
  const userFiles = get<UploadedFile[]>("files", []);
  set("files", userFiles.filter((f) => f.id !== id && f.backendId !== id));
}

// ─── Notes ──────────────────────────────────────────────────
export function getNotes(): GeneratedNote[] {
  ensureInitialSeed();
  return get<GeneratedNote[]>("notes", []);
}

export function addNote(note: Omit<GeneratedNote, "id" | "createdAt">): GeneratedNote {
  ensureInitialSeed();
  const notes = getNotes();
  const newNote: GeneratedNote = { ...note, id: uid(), createdAt: new Date().toISOString() };
  notes.unshift(newNote);
  set("notes", notes);
  updateCoins(-note.coinCost);
  addWalletEntry(`Generated Notes: ${note.subject} - ${note.chapter}`, -note.coinCost);
  recordUserActivity({
    featureId: "notes",
    featureTitle: "AI Note Generator",
    actionType: "Generated Notes",
    title: newNote.title,
    documentId: newNote.fileId,
    details: `${newNote.subject} · ${newNote.chapter} (${newNote.outputType})`,
    route: "/dashboard/notes",
  });
  return newNote;
}

export function deleteNote(id: string) {
  set("notes", getNotes().filter((n) => n.id !== id));
}

// ─── Quizzes ────────────────────────────────────────────────
export function getQuizzes(): Quiz[] {
  ensureInitialSeed();
  return get<Quiz[]>("quizzes", []);
}

export function addQuiz(quiz: Omit<Quiz, "id" | "createdAt">): Quiz {
  ensureInitialSeed();
  const quizzes = getQuizzes();
  const newQuiz: Quiz = { ...quiz, id: uid(), createdAt: new Date().toISOString() };
  quizzes.unshift(newQuiz);
  set("quizzes", quizzes);
  updateCoins(-quiz.coinCost);
  addWalletEntry(`Created Quiz: ${quiz.subject} - ${quiz.chapter}`, -quiz.coinCost);
  recordUserActivity({
    featureId: "quizzes",
    featureTitle: "Quiz & Mock Test Generator",
    actionType: "Generated Quiz",
    title: newQuiz.title,
    documentId: newQuiz.fileId,
    details: `${newQuiz.subject} · ${newQuiz.chapter} (${newQuiz.totalQuestions} Questions)`,
    route: "/dashboard/quiz",
  });
  return newQuiz;
}

export function updateQuizScore(id: string, score: number) {
  const quizzes = getQuizzes();
  const q = quizzes.find((quiz) => quiz.id === id);
  if (q) {
    q.score = score;
    q.completedAt = new Date().toISOString();
    set("quizzes", quizzes);
    
    // Reward coins for high scores
    const percentage = (score / q.totalQuestions) * 100;
    if (percentage >= 70) {
      const reward = percentage === 100 ? 25 : 15;
      updateCoins(reward);
      addWalletEntry(`Quiz Reward (${Math.round(percentage)}%): ${q.subject}`, reward);
    }
  }
}

export function deleteQuiz(id: string) {
  set("quizzes", getQuizzes().filter((q) => q.id !== id));
}

// ─── Revision Sheets ────────────────────────────────────────
export function getRevisionSheets(): RevisionSheet[] {
  ensureInitialSeed();
  return get<RevisionSheet[]>("revision_sheets", []);
}

export function addRevisionSheet(sheet: Omit<RevisionSheet, "id" | "createdAt">): RevisionSheet {
  ensureInitialSeed();
  const sheets = getRevisionSheets();
  const newSheet: RevisionSheet = { ...sheet, id: uid(), createdAt: new Date().toISOString() };
  sheets.unshift(newSheet);
  set("revision_sheets", sheets);
  updateCoins(-sheet.coinCost);
  addWalletEntry(`Created Revision Sheet: ${sheet.subject} - ${sheet.chapter}`, -sheet.coinCost);
  recordUserActivity({
    featureId: "revision",
    featureTitle: "Quick Revision Sheets",
    actionType: "Generated Revision Sheet",
    title: newSheet.title || `${newSheet.subject} - ${newSheet.chapter}`,
    details: `${newSheet.subject} · ${newSheet.keyPoints?.length || 0} key points`,
    route: "/dashboard/revision",
  });
  return newSheet;
}

export function deleteRevisionSheet(id: string) {
  set("revision_sheets", getRevisionSheets().filter((s) => s.id !== id));
}

// ─── Progress ───────────────────────────────────────────────
export function getProgress(): SubjectProgress[] {
  const notes = getNotes();
  const quizzes = getQuizzes();
  const files = getFiles();
  const subjects = new Set<string>();
  
  notes.forEach((n) => subjects.add(n.subject));
  quizzes.forEach((q) => subjects.add(q.subject));
  files.forEach((f) => f.subject && subjects.add(f.subject));

  if (subjects.size === 0) {
    return [
      { subject: "Physics", chaptersTotal: 4, chaptersCompleted: 2, quizzesTaken: 3, averageScore: 85 },
      { subject: "Biology", chaptersTotal: 5, chaptersCompleted: 3, quizzesTaken: 2, averageScore: 90 },
      { subject: "Chemistry", chaptersTotal: 3, chaptersCompleted: 1, quizzesTaken: 1, averageScore: 78 },
    ];
  }

  return Array.from(subjects).map((subject) => {
    const subjectNotes = notes.filter((n) => n.subject === subject);
    const subjectQuizzes = quizzes.filter((q) => q.subject === subject);
    const completedQuizzes = subjectQuizzes.filter((q) => q.score !== undefined);
    const chapters = new Set(subjectNotes.map((n) => n.chapter));
    return {
      subject,
      chaptersTotal: Math.max(chapters.size, 2),
      chaptersCompleted: Math.max(chapters.size, 1),
      quizzesTaken: completedQuizzes.length,
      averageScore: completedQuizzes.length
        ? Math.round(completedQuizzes.reduce((sum, q) => sum + ((q.score! / q.totalQuestions) * 100), 0) / completedQuizzes.length)
        : 80,
    };
  });
}

// ─── Wallet History ─────────────────────────────────────────
export function getWalletHistory(): WalletEntry[] {
  ensureInitialSeed();
  return get<WalletEntry[]>("wallet", []);
}

export function addWalletEntry(action: string, coins: number) {
  const history = getWalletHistory();
  history.unshift({ id: uid(), action, coins, timestamp: new Date().toISOString() });
  set("wallet", history);
}

export function claimDailyBonus(): { success: boolean; coins: number; message: string } {
  if (typeof window === "undefined") return { success: false, coins: 0, message: "Error" };
  const lastClaim = localStorage.getItem("bn_last_daily_claim");
  const today = new Date().toDateString();
  if (lastClaim === today) {
    return { success: false, coins: 0, message: "You already claimed your daily bonus today! Come back tomorrow." };
  }
  localStorage.setItem("bn_last_daily_claim", today);
  const bonus = 50;
  updateCoins(bonus);
  addWalletEntry("Daily Check-in Bonus", bonus);
  return { success: true, coins: bonus, message: "Congratulations! +50 Daily Study Coins added to your wallet." };
}

export function topUpCoins(amount: number, packageName: string) {
  updateCoins(amount);
  addWalletEntry(`Purchased ${packageName} (${amount} coins)`, amount);
}

// ─── Topic Summaries Store ──────────────────────────────────
export interface FormulaCardItem {
  name: string;
  formula: string;
  explanation: string;
}

export interface TopicSummaryItem {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  language?: "english" | "bangla" | "both" | undefined;
  depth?: "high-yield" | "comprehensive" | "quick" | undefined;
  difficulty?: string | undefined;
  documentName?: string | undefined;
  overview?: string | undefined;
  one_line_summary?: string | undefined;
  key_concepts?: string[] | undefined;
  keyPoints?: string[] | undefined;
  definitions?: { term: string; definition: string }[] | undefined;
  formulas?: (string | FormulaCardItem)[] | undefined;
  examples?: string[] | undefined;
  exam_tips?: string[] | undefined;
  examTip?: string | undefined;
  likely_questions?: string[] | undefined;
  readTime?: string | undefined;
  sourceInfo?: string | undefined;
  sourceDocName?: string | undefined;
  pageRange?: string | undefined;
  createdAt: string;
  coinCost: number;
}

export function getSummaries(): TopicSummaryItem[] {
  ensureInitialSeed();
  const existing = get<TopicSummaryItem[]>("summaries", []);
  if (existing.length === 0) {
    const seed: TopicSummaryItem[] = [
      {
        id: "sum-thermo-carnot",
        subject: "Physics",
        chapter: "Thermodynamics & Heat",
        topic: "Carnot Engine & Efficiency (কার্নো ইঞ্জিন ও দক্ষতা)",
        language: "both",
        depth: "high-yield",
        overview: "A Carnot engine is a theoretical heat engine operating on the reversible Carnot cycle. It achieves the maximum possible theoretical efficiency between two heat reservoirs.",
        keyPoints: [
          "Operates through 4 reversible steps: Isothermal expansion, Adiabatic expansion, Isothermal compression, Adiabatic compression.",
          "Efficiency depends ONLY on absolute temperatures of source (Th) and sink (Tc), independent of working substance.",
          "No actual engine can exceed Carnot efficiency due to friction and irreversibility.",
        ],
        definitions: [
          { term: "Carnot Efficiency (η)", definition: "Ratio of net work output to heat absorbed from high-temperature reservoir." },
          { term: "Heat Reservoir", definition: "A thermal energy source with infinitely large heat capacity that maintains constant temperature." },
        ],
        formulas: ["η = 1 - (Tc / Th)", "W = Qh - Qc", "Qh / Th = Qc / Tc (Carnot reversible cycle)"],
        examples: [
          "Steam turbines and combustion engines approximate Carnot cycles but typically reach 35%-45% real efficiency due to thermal losses.",
        ],
        examTip: "Always convert Celsius to Kelvin (T + 273.15) before calculating Carnot efficiency, otherwise calculations will be invalid!",
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        coinCost: 10,
      },
      {
        id: "sum-cell-glycolysis",
        subject: "Biology",
        chapter: "Cellular Energy & ATP",
        topic: "Glycolysis Pathway (গ্লাইকোলাইসিস প্রক্রিয়া)",
        language: "both",
        depth: "comprehensive",
        overview: "Glycolysis is the initial 10-step metabolic pathway that splits one 6-carbon glucose molecule into two 3-carbon pyruvate molecules without requiring oxygen.",
        keyPoints: [
          "Occurs in the cytoplasm (cytosol) of all living cells — universal metabolic foundation.",
          "Anaerobic phase: Does not directly require molecular O2.",
          "Net yield: 2 ATP (via substrate-level phosphorylation) and 2 NADH per glucose.",
        ],
        definitions: [
          { term: "Substrate-Level Phosphorylation", definition: "Direct enzymatic transfer of a phosphate group from a substrate molecule to ADP." },
          { term: "NADH", definition: "High-energy electron carrier molecule that transfers reducing power to the electron transport chain." },
        ],
        formulas: ["Glucose + 2 NAD+ + 2 ADP + 2 Pi → 2 Pyruvate + 2 NADH + 2 H+ + 2 ATP"],
        examples: [
          "Human muscles during intense sprinting produce lactate via anaerobic fermentation when oxygen is depleted.",
        ],
        examTip: "Exam boards frequently test the difference between gross ATP produced (4 ATP) vs net ATP gained (2 ATP) — remember 2 ATP are consumed during the preparatory phase!",
        createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
        coinCost: 10,
      },
    ];
    set("summaries", seed);
    return seed;
  }
  return existing;
}

export function addSummary(summary: Omit<TopicSummaryItem, "id" | "createdAt">): TopicSummaryItem {
  const list = getSummaries();
  const created: TopicSummaryItem = {
    ...summary,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  list.unshift(created);
  set("summaries", list);
  updateCoins(-summary.coinCost);
  addWalletEntry(`Generated Topic Summary: ${summary.topic}`, -summary.coinCost);
  recordUserActivity({
    featureId: "summaries",
    featureTitle: "Topic-Wise Summaries",
    actionType: "Generated Summary",
    title: summary.topic || "Topic Summary",
    documentName: summary.documentName,
    details: `${summary.subject || "Subject"} · ${summary.difficulty?.toUpperCase() || "MEDIUM"} difficulty`,
    route: "/dashboard/summaries",
  });
  return created;
}

export function deleteSummary(id: string) {
  const list = getSummaries().filter((s) => s.id !== id);
  set("summaries", list);
}

// ─── Question Analysis Store ────────────────────────────────
export interface QuestionAnalysisItem {
  id: string;
  subject: string;
  chapter: string;
  boardOrExam: string;
  yearRange: string;
  frequencyTopics: {
    topic: string;
    frequency: "High" | "Medium" | "Low";
    appearances: number;
    probabilityScore: number;
    sampleQuestions: string[];
    modelAnswer: string;
    keyTip: string;
  }[];
  formatDistribution: {
    format: string;
    percentage: number;
  }[];
  createdAt: string;
  coinCost: number;
}

export function getQuestionAnalyses(): QuestionAnalysisItem[] {
  ensureInitialSeed();
  const existing = get<QuestionAnalysisItem[]>("question_analyses", []);
  if (existing.length === 0) {
    const seed: QuestionAnalysisItem[] = [
      {
        id: "qa-physics-thermo",
        subject: "Physics",
        chapter: "Thermodynamics & Heat",
        boardOrExam: "Board Examinations & University Admission",
        yearRange: "Past 5 Years (2020 - 2025)",
        formatDistribution: [
          { format: "Conceptual & Laws Definition (ক ও খ)", percentage: 35 },
          { format: "Mathematical Derivations (গ)", percentage: 40 },
          { format: "Applied Scenarios & Carnot Analysis (ঘ)", percentage: 25 },
        ],
        frequencyTopics: [
          {
            topic: "Carnot Engine & Maximum Efficiency",
            frequency: "High",
            appearances: 8,
            probabilityScore: 92,
            sampleQuestions: [
              "A Carnot engine operates between 227°C and 27°C. Calculate its efficiency. If sink temp is lowered by 50°C, what is the new efficiency?",
              "Is 100% thermal efficiency achievable by any heat engine? Justify using 2nd Law of Thermodynamics.",
            ],
            modelAnswer: "1) Convert to Kelvin: Th = 227 + 273 = 500K, Tc = 27 + 273 = 300K. Efficiency η = 1 - (300/500) = 0.40 (40%). 2) For lowered sink Tc2 = 250K, η2 = 1 - (250/500) = 0.50 (50%).",
            keyTip: "Ensure temperatures are converted to Kelvin immediately. Show all intermediate formula steps.",
          },
          {
            topic: "First Law of Thermodynamics & Work Done (ΔU = Q - W)",
            frequency: "High",
            appearances: 7,
            probabilityScore: 88,
            sampleQuestions: [
              "Define internal energy. Show that in an adiabatic process work done is at the expense of internal energy.",
              "Calculate work done during isobaric expansion of 2 moles of ideal gas when heated from 300K to 450K.",
            ],
            modelAnswer: "In an adiabatic process Q = 0, so by the First Law ΔU = Q - W = -W, meaning W = -ΔU. Work done by the gas directly decreases internal energy and temperature.",
            keyTip: "Remember sign conventions: Q is positive when heat enters system, W is positive when work is done BY system.",
          },
          {
            topic: "Entropy and Clausius Statement",
            frequency: "Medium",
            appearances: 4,
            probabilityScore: 65,
            sampleQuestions: [
              "Explain why entropy always increases in an irreversible natural process.",
              "State Clausius statement of the Second Law of Thermodynamics.",
            ],
            modelAnswer: "Natural spontaneous processes proceed towards higher probability and greater molecular disorder (entropy). ΔS = dQ/T. For isolated system ΔS >= 0.",
            keyTip: "Distinguish between isolated system vs open system when discussing entropy.",
          },
        ],
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        coinCost: 15,
      },
    ];
    set("question_analyses", seed);
    return seed;
  }
  return existing;
}

export function addQuestionAnalysis(item: Omit<QuestionAnalysisItem, "id" | "createdAt">): QuestionAnalysisItem {
  const list = getQuestionAnalyses();
  const created: QuestionAnalysisItem = {
    ...item,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  list.unshift(created);
  set("question_analyses", list);
  updateCoins(-item.coinCost);
  addWalletEntry(`Question Paper Analysis: ${item.subject} (${item.chapter})`, -item.coinCost);
  return created;
}

// ─── Syllabus Store ─────────────────────────────────────────
export interface SyllabusTopicItem {
  id: string;
  title: string;
  status: "completed" | "in-progress" | "not-started";
  objectives: string[];
}

export interface SyllabusSubject {
  id: string;
  subject: string;
  gradeOrLevel: string;
  chapters: {
    id: string;
    chapterNumber: number;
    title: string;
    topics: SyllabusTopicItem[];
  }[];
}

export function getSyllabusData(): SyllabusSubject[] {
  ensureInitialSeed();
  const existing = get<SyllabusSubject[]>("syllabus_data", []);
  if (existing.length === 0) {
    const seed: SyllabusSubject[] = [
      {
        id: "syl-physics",
        subject: "Physics",
        gradeOrLevel: "HSC / College Level",
        chapters: [
          {
            id: "ch-vec",
            chapterNumber: 1,
            title: "Vectors & Kinematics",
            topics: [
              { id: "top-1-1", title: "Vector Addition, Triangle & Parallelogram Law", status: "completed", objectives: ["Understand vector resolution", "Apply parallelogram law R = √(P²+Q²+2PQcosθ)"] },
              { id: "top-1-2", title: "Dot Product & Cross Product", status: "completed", objectives: ["Calculate scalar and vector products", "Determine perpendicular and parallel vectors"] },
              { id: "top-1-3", title: "Projectile Motion in 2 Dimensions", status: "in-progress", objectives: ["Calculate maximum height, range and time of flight", "Formulate trajectory equation"] },
            ],
          },
          {
            id: "ch-dyn",
            chapterNumber: 2,
            title: "Newtonian Mechanics & Dynamics",
            topics: [
              { id: "top-2-1", title: "Newton's Laws of Motion & Momentum Conservation", status: "completed", objectives: ["State three laws", "Apply conservation of linear momentum to collisions"] },
              { id: "top-2-2", title: "Friction, Inertia & Banking of Roads", status: "in-progress", objectives: ["Calculate angle of banking tanθ = v²/rg", "Analyze static and kinetic friction"] },
              { id: "top-2-3", title: "Rotational Dynamics & Torque", status: "not-started", objectives: ["Calculate moment of inertia", "Derive relation τ = Iα"] },
            ],
          },
          {
            id: "ch-thm",
            chapterNumber: 3,
            title: "Thermodynamics & Kinetic Theory",
            topics: [
              { id: "top-3-1", title: "First Law of Thermodynamics & Isothermal/Adiabatic Work", status: "in-progress", objectives: ["Apply ΔU = Q - W", "Calculate work in isothermal vs adiabatic expansion"] },
              { id: "top-3-2", title: "Carnot Engine & Second Law of Thermodynamics", status: "completed", objectives: ["Determine maximum theoretical Carnot efficiency", "Understand Clausius & Kelvin statements"] },
              { id: "top-3-3", title: "Entropy, Reversibility & Heat Transfer", status: "not-started", objectives: ["Calculate entropy changes ΔS = ΔQ/T", "Explain environmental thermal dissipation"] },
            ],
          },
        ],
      },
      {
        id: "syl-chem",
        subject: "Chemistry",
        gradeOrLevel: "HSC / College Level",
        chapters: [
          {
            id: "ch-chem-1",
            chapterNumber: 1,
            title: "Qualitative & Quantitative Chemistry",
            topics: [
              { id: "top-c1-1", title: "Molarity, Molality & Stoichiometry", status: "completed", objectives: ["Calculate molar concentrations", "Apply titration equation V1S1 = V2S2"] },
              { id: "top-c1-2", title: "Acid-Base Neutralization & pH Calculations", status: "in-progress", objectives: ["Calculate pH and pOH", "Analyze buffer solutions using Henderson equation"] },
            ],
          },
          {
            id: "ch-chem-2",
            chapterNumber: 2,
            title: "Thermochemistry & Chemical Equilibrium",
            topics: [
              { id: "top-c2-1", title: "Le Chatelier's Principle & Equilibrium Constants", status: "in-progress", objectives: ["Predict equilibrium shifts with temperature/pressure", "Relate Kp and Kc"] },
              { id: "top-c2-2", title: "Hess's Law & Enthalpy of Reactions", status: "not-started", objectives: ["Calculate standard enthalpy of formation", "Construct Born-Haber cycles"] },
            ],
          },
        ],
      },
      {
        id: "syl-bio",
        subject: "Biology",
        gradeOrLevel: "HSC / College Level",
        chapters: [
          {
            id: "ch-bio-1",
            chapterNumber: 1,
            title: "Cell Structure & Physiology",
            topics: [
              { id: "top-b1-1", title: "Cell Membrane & Transport Mechanisms", status: "completed", objectives: ["Compare active vs passive transport", "Explain fluid mosaic model"] },
              { id: "top-b1-2", title: "Cellular Respiration & Glycolysis", status: "completed", objectives: ["Trace 10 steps of glycolysis", "Calculate net ATP yield from glucose breakdown"] },
              { id: "top-b1-3", title: "Krebs Cycle & Oxidative Phosphorylation", status: "in-progress", objectives: ["Explain mitochondrial proton gradient", "Understand ATP synthase mechanism"] },
            ],
          },
        ],
      },
    ];
    set("syllabus_data", seed);
    return seed;
  }
  return existing;
}

export function updateTopicStatus(subjectId: string, chapterId: string, topicId: string, status: "completed" | "in-progress" | "not-started") {
  const data = getSyllabusData();
  const sub = data.find((s) => s.id === subjectId);
  if (!sub) return;
  const ch = sub.chapters.find((c) => c.id === chapterId);
  if (!ch) return;
  const top = ch.topics.find((t) => t.id === topicId);
  if (!top) return;
  top.status = status;
  set("syllabus_data", data);
}

// ─── Real-Time Editable Documents Store ─────────────────────
export interface EditableDocument {
  id: string;
  title: string;
  originalFileName?: string | undefined;
  sourceType: "pdf" | "docx" | "txt" | "md" | "custom";
  content: string;
  wordCount: number;
  tags?: string[] | undefined;
  lastSavedAt: string;
  createdAt: string;
}

export function getEditableDocuments(): EditableDocument[] {
  ensureInitialSeed();
  const existing = get<EditableDocument[]>("editable_docs", []);
  if (existing.length === 0) {
    const seed: EditableDocument[] = [
      {
        id: "doc-sample-1",
        title: "HSC Physics — Thermodynamics & Heat Exam Prep.pdf",
        originalFileName: "Physics_Thermodynamics_Final.pdf",
        sourceType: "pdf",
        content: `# HSC Physics — Thermodynamics & Heat (Complete Study & Exam Draft)

## 1. First Law of Thermodynamics
The First Law of Thermodynamics is essentially the law of conservation of energy applied to thermodynamic systems:
$$\\Delta U = Q - W$$

Where:
- $\\Delta U$ is the change in internal energy of the system
- $Q$ is heat supplied to the system (positive if absorbed, negative if released)
- $W$ is work done by the system ($W = P \\Delta V$ for isobaric expansion)

### Core Rules & Boundary Conditions:
1. In an **isothermal process** (constant temperature), $\\Delta T = 0 \\implies \\Delta U = 0$, therefore $Q = W$.
2. In an **adiabatic process** (no heat exchange), $Q = 0$, therefore $W = -\\Delta U$. Work is done at the expense of internal energy!
3. In an **isochoric process** (constant volume), $\\Delta V = 0 \\implies W = 0$, so $\\Delta U = Q$.

---

## 2. Carnot Engine Efficiency
A Carnot cycle operates between two heat reservoirs at absolute temperatures $T_H$ and $T_C$.
The maximum theoretical efficiency $\\eta$ is given by:
$$\\eta = 1 - \\frac{T_C}{T_H} = \\frac{T_H - T_C}{T_H}$$

> **Important Note:** Absolute temperatures in Kelvin must ALWAYS be used. $T(K) = \\theta(^{\\circ}C) + 273.15$.

### Sample Board Numerical:
**Question:** A heat engine absorbs 1200 J of heat from a reservoir at 327°C and exhausts 600 J of heat to a sink at 27°C during each cycle.
- $T_H = 327 + 273 = 600 \\text{ K}$
- $T_C = 27 + 273 = 300 \\text{ K}$
- Maximum theoretical Carnot efficiency: $\\eta_{max} = 1 - (300/600) = 50\\%$.
- Actual operating efficiency: $\\eta = 1 - (600/1200) = 50\\%$.

---

## 3. Practice Questions from Past Papers (2019-2024)
- [ ] **Q1:** State the second law of thermodynamics according to Clausius and Kelvin-Planck statements.
- [ ] **Q2:** Why can efficiency of a real engine never reach 100%?
- [ ] **Q3:** Deduce the relation between $C_p$ and $C_v$ for 1 mole of an ideal gas ($C_p - C_v = R$).
`,
        wordCount: 320,
        tags: ["Physics", "HSC", "Thermodynamics"],
        lastSavedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc-sample-2",
        title: "Chemistry Equilibrium & Kinetics Notes.docx",
        originalFileName: "Chemistry_Chapter4.docx",
        sourceType: "docx",
        content: `# Chemistry — Chemical Equilibrium & Le Chatelier's Principle

## Reversible Reactions & Dynamic Equilibrium
Dynamic chemical equilibrium is reached when the rate of the forward reaction equals the rate of the reverse reaction, and the concentrations of reactants and products remain constant.

### Law of Mass Action:
For a general reaction:
$$aA + bB \\rightleftharpoons cC + dD$$

The equilibrium constant in terms of molar concentrations is:
$$K_c = \\frac{[C]^c [D]^d}{[A]^a [B]^b}$$

And in terms of partial pressures:
$$K_p = \\frac{(P_C)^c (P_D)^d}{(P_A)^a (P_B)^b}$$

Relationship: $K_p = K_c (RT)^{\\Delta n}$ where $\\Delta n = (c+d) - (a+b)$.

### Le Chatelier's Principle:
If a chemical system at equilibrium experiences a change in concentration, temperature, or total pressure, the equilibrium will shift in a direction that tends to counteract that imposed change.

- **Effect of Temperature:** Endothermic reactions absorb heat (shift right with increased temperature). Exothermic reactions release heat (shift left with increased temperature).
- **Effect of Pressure:** Increasing pressure shifts equilibrium toward the side with fewer moles of gas.
`,
        wordCount: 185,
        tags: ["Chemistry", "Equilibrium"],
        lastSavedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
    set("editable_docs", seed);
    return seed;
  }
  return existing;
}

export function saveEditableDocument(doc: {
  id?: string | undefined;
  title: string;
  content: string;
  originalFileName?: string | undefined;
  sourceType?: ("pdf" | "docx" | "txt" | "md" | "custom") | undefined;
  tags?: string[] | undefined;
}): EditableDocument {
  const list = getEditableDocuments();
  const wordCount = doc.content.trim().split(/\s+/).filter(Boolean).length;
  
  if (doc.id) {
    const existing = list.find((d) => d.id === doc.id);
    if (existing) {
      const updated: EditableDocument = {
        id: existing.id,
        title: doc.title,
        content: doc.content,
        wordCount,
        sourceType: doc.sourceType ?? existing.sourceType,
        originalFileName: doc.originalFileName ?? existing.originalFileName,
        tags: doc.tags ?? existing.tags,
        createdAt: existing.createdAt,
        lastSavedAt: new Date().toISOString(),
      };
      const index = list.indexOf(existing);
      list[index] = updated;
      set("editable_docs", list);
      return updated;
    }
  }

  const newDoc: EditableDocument = {
    id: doc.id || uid(),
    title: doc.title,
    originalFileName: doc.originalFileName || `${doc.title}.pdf`,
    sourceType: doc.sourceType || "custom",
    content: doc.content,
    wordCount,
    tags: doc.tags || ["Study Material"],
    lastSavedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  list.unshift(newDoc);
  set("editable_docs", list);
  recordUserActivity({
    featureId: "editor",
    featureTitle: "Real-Time Document Editor",
    actionType: "Saved Document",
    title: newDoc.title,
    documentName: newDoc.originalFileName,
    details: `${wordCount} words · Document Editor Workspace`,
    route: "/dashboard/editor",
  });
  return newDoc;
}

export function deleteEditableDocument(id: string): void {
  const list = getEditableDocuments();
  const filtered = list.filter((d) => d.id !== id);
  set("editable_docs", filtered);
}

// ─── AI Syllabus Exam Question Predictor Store ──────────────
export interface PredictedQuestionItem {
  id: string;
  yearRecurrence: string; // e.g. "Appeared 5 times in past 6 years (2019, 2021, 2022, 2023, 2024)"
  probabilityScore: number; // e.g. 96
  type: "CQ (সৃজনশীল)" | "Mathematical" | "Conceptual" | "MCQ";
  subTopic: string;
  question: string;
  contextScenario?: string | undefined;
  modelAnswer: string;
  marks: number;
  examinerTip: string;
  recurringYears: number[];
}

export interface SyllabusPredictionReport {
  id: string;
  subject: string;
  chapter: string;
  syllabusScope: string;
  analyzedYears: string[];
  totalQuestionsAnalyzed: number;
  overallConfidence: number;
  patternInsights: string[];
  predictedQuestions: PredictedQuestionItem[];
  generatedSyllabusSummary: string;
  topicWeightage: { topic: string; percentage: number; trend: "rising" | "stable" | "declining" }[];
  createdAt: string;
  coinCost: number;
}

export function getSyllabusPredictions(): SyllabusPredictionReport[] {
  ensureInitialSeed();
  const existing = get<SyllabusPredictionReport[]>("syllabus_predictions", []);
  if (existing.length === 0) {
    const seed: SyllabusPredictionReport[] = [
      {
        id: "pred-physics-thermo",
        subject: "Physics",
        chapter: "Thermodynamics & Heat",
        syllabusScope: "HSC Board Syllabus & Engineering Admission Standard",
        analyzedYears: ["2019", "2020", "2021", "2022", "2023", "2024"],
        totalQuestionsAnalyzed: 46,
        overallConfidence: 94.8,
        patternInsights: [
          "Carnot cycle efficiency calculations appeared in 5 out of the last 6 consecutive board exams.",
          "Indicator diagram (P-V curve) scenario questions have shown an upward trend (+35% appearance since 2022).",
          "Direct definition questions (e.g. Isothermal vs Adiabatic) are now predominantly integrated into creative question (CQ) Part 'খ' and 'গ'.",
          "Alternative-year pattern detected: Entropy calculations were tested in 2020, 2022, and 2024, making it high-probability for the upcoming cycle.",
        ],
        topicWeightage: [
          { topic: "Carnot Engine & Efficiency (η = 1 - Tc/Th)", percentage: 38, trend: "rising" },
          { topic: "First Law of Thermodynamics & Work Done (ΔU = Q - W)", percentage: 32, trend: "stable" },
          { topic: "Entropy, Clausius & Reversibility", percentage: 20, trend: "rising" },
          { topic: "Specific Heat Capacity of Gases (Cp - Cv = R)", percentage: 10, trend: "stable" },
        ],
        predictedQuestions: [
          {
            id: "pq-1",
            yearRecurrence: "Appeared 5 times in past 6 years (2019, 2021, 2022, 2023, 2024)",
            probabilityScore: 96,
            type: "CQ (সৃজনশীল)",
            subTopic: "Carnot Engine Multi-Stage Thermal Efficiency",
            question: "A Carnot engine absorbs 1500 J of heat from a heat source at 327°C and exhausts heat to a sink at 27°C.\n(a) What is an isothermal process?\n(b) Why can the efficiency of a Carnot heat engine never reach 100%?\n(c) Calculate the amount of work done by the engine in one complete cycle.\n(d) If the temperature of the source is increased by 50°C while keeping the sink temperature unchanged, will the efficiency increase more than if the sink temperature were decreased by 50°C? Mathematically analyze.",
            contextScenario: "A research laboratory is testing a prototype thermodynamic engine between 327°C and 27°C to maximize mechanical power output.",
            marks: 10,
            modelAnswer: `(a) Knowledge (1 mark):
An isothermal process is a thermodynamic process in which the temperature of the system remains constant throughout (ΔT = 0).

(b) Understanding (2 marks):
Carnot efficiency is η = 1 - (Tc / Th). For efficiency to reach 100% (η = 1), Tc must be absolute zero (0 K) or Th must be infinite. According to the Third Law of Thermodynamics, absolute zero is unattainable in finite steps. Furthermore, according to Kelvin-Planck's statement of the Second Law, no engine can convert absorbed heat entirely into mechanical work without rejecting some heat to a colder sink. Hence η < 100%.

(c) Application (3 marks):
Given: Th = 327 + 273 = 600 K, Tc = 27 + 273 = 300 K, Q1 = 1500 J.
Efficiency η = 1 - (Tc / Th) = 1 - (300 / 600) = 0.50 (50%).
Work done W = η * Q1 = 0.50 * 1500 J = 750 J.
Heat rejected Q2 = Q1 - W = 750 J.

(d) Higher Ability Analysis (4 marks):
Case 1: Increase source Th by 50°C -> Th' = 650 K, Tc = 300 K:
η1 = 1 - (300 / 650) = 1 - 0.4615 = 0.5385 (53.85%).
Increase in efficiency = 53.85% - 50.00% = +3.85%.

Case 2: Decrease sink Tc by 50°C -> Tc' = 250 K, Th = 600 K:
η2 = 1 - (250 / 600) = 1 - 0.4167 = 0.5833 (58.33%).
Increase in efficiency = 58.33% - 50.00% = +8.33%.

Conclusion: Decreasing the sink temperature by 50°C yields a significantly higher efficiency increase (+8.33%) than increasing the source temperature (+3.85%).`,
            examinerTip: "Examiners deduct marks if temperatures are computed in Celsius instead of Kelvin. Always show both temperature conversions.",
            recurringYears: [2019, 2021, 2022, 2023, 2024],
          },
          {
            id: "pq-2",
            yearRecurrence: "Appeared 4 times in past 6 years (2020, 2021, 2023, 2024)",
            probabilityScore: 91,
            type: "Mathematical",
            subTopic: "Adiabatic vs Isothermal Work Done & P-V Indicator Curve",
            question: "Two moles of an ideal diatomic gas (γ = 1.4) at normal temperature and pressure (T1 = 273 K, P1 = 1 atm) are compressed to half their original volume.\n(a) Calculate final pressure and temperature if compression is adiabatic.\n(b) Compare work required in isothermal vs adiabatic compression.",
            marks: 7,
            modelAnswer: `For adiabatic process: P1 * V1^γ = P2 * V2^γ => P2 = P1 * (V1 / V2)^γ = 1 * (2)^1.4 = 2.639 atm.
Temperature relation: T1 * V1^(γ-1) = T2 * V2^(γ-1) => T2 = 273 * (2)^0.4 = 360.2 K (87.2°C).
Work done in adiabatic compression is greater than isothermal compression because temperature and pressure rise during compression, providing opposing pressure.`,
            examinerTip: "Diatomic gas value γ = 1.4 must be cited. Remember work done ON the system has negative sign convention.",
            recurringYears: [2020, 2021, 2023, 2024],
          },
          {
            id: "pq-3",
            yearRecurrence: "Appeared 3 times in past 6 years (2020, 2022, 2024)",
            probabilityScore: 84,
            type: "Conceptual",
            subTopic: "Entropy Change during Phase Transformation",
            question: "Calculate the total change in entropy when 100g of ice at 0°C is completely converted into water at 0°C. (Latent heat of fusion Lf = 3.36 * 10^5 J/kg). Does the entropy of the universe increase?",
            marks: 5,
            modelAnswer: `Mass m = 100g = 0.1 kg, T = 0 + 273 = 273 K.
Heat required Q = m * Lf = 0.1 * 3.36 * 10^5 = 33,600 J.
Entropy change of ice ΔS = Q / T = 33,600 / 273 = +123.08 J/K.
Since heat is transferred from warmer surroundings, the overall process is irreversible in practice, increasing total universe entropy (ΔS_total > 0).`,
            examinerTip: "Latent heat formula must be stated explicitly. Unit J/K is mandatory.",
            recurringYears: [2020, 2022, 2024],
          },
        ],
        generatedSyllabusSummary: `# AI High-Yield Syllabus Study Guide — Thermodynamics

### Core Concepts Targeted by 5-6 Year Exam Trends:
1. **Zeroth & First Law:**
   - Thermal equilibrium and definition of temperature.
   - $\\Delta U = Q - W$. Remember that internal energy is a state function; $Q$ and $W$ are path functions.
   - For cyclic process: $\\Delta U = 0 \\implies Q_{net} = W_{net}$.

2. **Thermodynamic Processes Matrix:**
   - Isothermal ($T = const$): $PV = const$, $W = nRT \\ln(V_2/V_1)$.
   - Adiabatic ($Q = 0$): $PV^\\gamma = const$, $W = \\frac{nR(T_1 - T_2)}{\\gamma - 1}$.
   - Isobaric ($P = const$): $W = P(V_2 - V_1) = nR\\Delta T$.
   - Isochoric ($V = const$): $W = 0$, $\\Delta U = Q_v = nC_v\\Delta T$.

3. **Carnot Engine & Efficiency Rules:**
   - $\\eta = 1 - (T_C/T_H) = (W/Q_1)$.
   - Efficiency depends solely on absolute temperatures of source and sink, NOT on working substance.
   - Lowering sink temperature increases efficiency more effectively than raising source temperature by the same amount.

4. **Formulas Quick Sheet:**
   - $C_p - C_v = R$
   - $\\gamma = C_p / C_v$ (Monoatomic = 1.67, Diatomic = 1.40, Polyatomic = 1.33)
   - $\\Delta S = \\int \\frac{dQ}{T}$
`,
        createdAt: new Date().toISOString(),
        coinCost: 20,
      },
    ];
    set("syllabus_predictions", seed);
    return seed;
  }
  return existing;
}

export function addSyllabusPrediction(item: Omit<SyllabusPredictionReport, "id" | "createdAt">): SyllabusPredictionReport {
  const list = getSyllabusPredictions();
  const created: SyllabusPredictionReport = {
    ...item,
    id: uid(),
    createdAt: new Date().toISOString(),
  };
  list.unshift(created);
  set("syllabus_predictions", list);
  updateCoins(-item.coinCost);
  addWalletEntry(`AI Syllabus Exam Predictor: ${item.subject} (${item.chapter})`, -item.coinCost);
  return created;
}

export function deleteSyllabusPrediction(id: string): void {
  const list = getSyllabusPredictions();
  const filtered = list.filter((p) => p.id !== id);
  set("syllabus_predictions", filtered);
}

// ─── AI Question Analysis Database ──────────────────────────
export interface QuestionBankQuestion {
  id: string;
  text: string;
  year?: string | undefined;
  marks?: number | undefined;
  type?: string | undefined; // "CQ" | "MCQ" | "Short" | "Broad" etc.
}

export interface QuestionBankSubject {
  id: string;
  name: string;
  nameBn?: string | undefined;
  questions: QuestionBankQuestion[];
}

export interface QuestionBankSemester {
  id: string;
  name: string;
  subjects: QuestionBankSubject[];
}

export interface QuestionBankDepartment {
  id: string;
  name: string;
  semesters: QuestionBankSemester[];
}

export interface QuestionBankLevel {
  id: string;
  name: string;
  departments?: QuestionBankDepartment[] | undefined;
  subjects?: QuestionBankSubject[] | undefined; // for Class 9-10, 11-12 that don't have departments
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

export interface AIPredictedQuestionItem {
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
  examFormat?: string | undefined;
  modelAnswerHint?: string | undefined;
}

export interface AIQuestionAnalysisResult {
  id: string;
  educationLevel: string;
  department?: string | undefined;
  semester?: string | undefined;
  subject: string;
  totalQuestionsAnalyzed: number;
  requestedCount: number;
  generatedAt: string;
  analysisItems: AIAnalyzedQuestion[];
  coinCost: number;
  detectedYears?: string[] | undefined;
  latestYear?: string | undefined;
  upcomingPreparationYear?: string | undefined;
  yearWiseDistribution?: YearAnalysisStat[] | undefined;
  frequentlyRepeatedQuestions?: RepeatedQuestionStat[] | undefined;
  predictedQuestionSet?: AIPredictedQuestionItem[] | undefined;
  uploadedDocumentsSummary?: Array<{ name: string; questionCount: number; detectedYears: string[] }> | undefined;
}

export interface AIAnalyzedQuestion {
  rank: number;
  question: string;
  importance: "Critical" | "Very High" | "High" | "Medium";
  frequencyCount: number;
  frequencyYears: string[];
  topics: string[];
  reason: string;
  probabilityScore: number;
}

const QUESTION_BANK_DATA: QuestionBankLevel[] = [
  // ────────────── Class 9-10 ──────────────
  {
    id: "class-9-10",
    name: "Class 9-10",
    subjects: [
      { id: "c910-physics", name: "Physics", nameBn: "পদার্থবিজ্ঞান", questions: [] },
      { id: "c910-chemistry", name: "Chemistry", nameBn: "রসায়ন", questions: [] },
      { id: "c910-biology", name: "Biology", nameBn: "জীববিজ্ঞান", questions: [] },
      { id: "c910-higher-math", name: "Higher Mathematics", nameBn: "উচ্চতর গণিত", questions: [] },
      { id: "c910-general-math", name: "General Mathematics", nameBn: "সাধারণ গণিত", questions: [] },
      { id: "c910-ict", name: "ICT", nameBn: "তথ্য ও যোগাযোগ প্রযুক্তি", questions: [] },
      { id: "c910-bangla", name: "Bangla", nameBn: "বাংলা", questions: [] },
      { id: "c910-english", name: "English", nameBn: "ইংরেজি", questions: [] },
    ],
  },
  // ────────────── Class 11-12 (HSC) ──────────────
  {
    id: "class-11-12",
    name: "Class 11-12",
    subjects: [
      { id: "c1112-phy1", name: "Physics 1st Paper", nameBn: "পদার্থবিজ্ঞান ১ম পত্র", questions: [] },
      { id: "c1112-phy2", name: "Physics 2nd Paper", nameBn: "পদার্থবিজ্ঞান ২য় পত্র", questions: [] },
      { id: "c1112-chem1", name: "Chemistry 1st Paper", nameBn: "রসায়ন ১ম পত্র", questions: [] },
      { id: "c1112-chem2", name: "Chemistry 2nd Paper", nameBn: "রসায়ন ২য় পত্র", questions: [] },
      { id: "c1112-bio1", name: "Biology 1st Paper", nameBn: "জীববিজ্ঞান ১ম পত্র", questions: [] },
      { id: "c1112-bio2", name: "Biology 2nd Paper", nameBn: "জীববিজ্ঞান ২য় পত্র", questions: [] },
      { id: "c1112-hm1", name: "Higher Math 1st Paper", nameBn: "উচ্চতর গণিত ১ম পত্র", questions: [] },
      { id: "c1112-hm2", name: "Higher Math 2nd Paper", nameBn: "উচ্চতর গণিত ২য় পত্র", questions: [] },
      { id: "c1112-ict", name: "ICT", nameBn: "তথ্য ও যোগাযোগ প্রযুক্তি", questions: [] },
    ],
  },
  // ────────────── BSc / University ──────────────
  {
    id: "bsc",
    name: "BSc",
    departments: [
      {
        id: "cse",
        name: "Computer Science & Engineering (CSE)",
        semesters: [
          {
            id: "cse-sem-1",
            name: "Semester 1",
            subjects: [
              { id: "cse-s1-spl", name: "Structured Programming Language", questions: [] },
              { id: "cse-s1-dld", name: "Digital Logic Design", questions: [] },
              { id: "cse-s1-math1", name: "Differential and Integral Calculus", questions: [] },
            ],
          },
          {
            id: "cse-sem-2",
            name: "Semester 2",
            subjects: [
              { id: "cse-s2-oop", name: "Object-Oriented Programming (Java/C++)", questions: [] },
              { id: "cse-s2-ds", name: "Data Structures", questions: [] },
              { id: "cse-s2-dm", name: "Discrete Mathematics", questions: [] },
            ],
          },
          {
            id: "cse-sem-3",
            name: "Semester 3",
            subjects: [
              { id: "cse-s3-algo", name: "Design and Analysis of Algorithms", questions: [] },
              { id: "cse-s3-dbms", name: "Database Management Systems", questions: [] },
              { id: "cse-s3-toc", name: "Theory of Computation", questions: [] },
            ],
          },
          {
            id: "cse-sem-4",
            name: "Semester 4",
            subjects: [
              { id: "cse-s4-os", name: "Operating Systems", questions: [] },
              { id: "cse-s4-micro", name: "Microprocessors & Microcontrollers", questions: [] },
              { id: "cse-s4-cn", name: "Computer Networks", questions: [] },
            ],
          },
          {
            id: "cse-sem-5",
            name: "Semester 5",
            subjects: [
              { id: "cse-s5-se", name: "Software Engineering & Information System", questions: [] },
              { id: "cse-s5-ai", name: "Artificial Intelligence", questions: [] },
              { id: "cse-s5-web", name: "Web Technologies & Internet Programming", questions: [] },
            ],
          },
          {
            id: "cse-sem-6",
            name: "Semester 6",
            subjects: [
              { id: "cse-s6-compiler", name: "Compiler Design", questions: [] },
              { id: "cse-s6-cg", name: "Computer Graphics", questions: [] },
              { id: "cse-s6-ml", name: "Machine Learning", questions: [] },
            ],
          },
          {
            id: "cse-sem-7",
            name: "Semester 7",
            subjects: [
              { id: "cse-s7-dip", name: "Digital Image Processing", questions: [] },
              { id: "cse-s7-crypto", name: "Cryptography & Network Security", questions: [] },
              { id: "cse-s7-nlp", name: "Natural Language Processing", questions: [] },
            ],
          },
          {
            id: "cse-sem-8",
            name: "Semester 8",
            subjects: [
              { id: "cse-s8-dist", name: "Distributed Systems & Cloud Computing", questions: [] },
              { id: "cse-s8-iot", name: "Internet of Things (IoT)", questions: [] },
            ],
          },
        ],
      },
      {
        id: "eee",
        name: "Electrical & Electronic Engineering (EEE)",
        semesters: [
          {
            id: "eee-sem-1",
            name: "Semester 1",
            subjects: [
              { id: "eee-s1-circuit1", name: "Electrical Circuit Analysis I", questions: [] },
              { id: "eee-s1-eng-physics", name: "Engineering Physics", questions: [] },
            ],
          },
          {
            id: "eee-sem-2",
            name: "Semester 2",
            subjects: [
              { id: "eee-s2-electronics1", name: "Analog Electronics I", questions: [] },
              { id: "eee-s2-circuit2", name: "Electrical Circuit Analysis II", questions: [] },
            ],
          },
          {
            id: "eee-sem-3",
            name: "Semester 3",
            subjects: [
              { id: "eee-s3-signals", name: "Signals and Systems", questions: [] },
              { id: "eee-s3-machines1", name: "Electrical Machines I", questions: [] },
            ],
          },
          {
            id: "eee-sem-4",
            name: "Semester 4",
            subjects: [
              { id: "eee-s4-power", name: "Power System Analysis I", questions: [] },
              { id: "eee-s4-dsp", name: "Digital Signal Processing", questions: [] },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Question Bank Helper Functions ──────────────────────────

export function getQuestionBankData(): QuestionBankLevel[] {
  return QUESTION_BANK_DATA;
}

export function getAvailableEducationLevels(): { id: string; name: string }[] {
  return QUESTION_BANK_DATA.map((l) => ({ id: l.id, name: l.name }));
}

export function getDepartmentsForLevel(levelId: string): { id: string; name: string }[] {
  const level = QUESTION_BANK_DATA.find((l) => l.id === levelId);
  if (!level || !level.departments) return [];
  return level.departments.map((d) => ({ id: d.id, name: d.name }));
}

export function getSemestersForDepartment(levelId: string, deptId: string): { id: string; name: string }[] {
  const level = QUESTION_BANK_DATA.find((l) => l.id === levelId);
  if (!level || !level.departments) return [];
  const dept = level.departments.find((d) => d.id === deptId);
  if (!dept) return [];
  return dept.semesters.map((s) => ({ id: s.id, name: s.name }));
}

export function getSubjectsForSelection(levelId: string, deptId?: string, semesterId?: string): QuestionBankSubject[] {
  const level = QUESTION_BANK_DATA.find((l) => l.id === levelId);
  if (!level) return [];

  // Class 9-10 and 11-12 have direct subjects
  if (level.subjects) return level.subjects;

  // BSc has departments → semesters → subjects
  if (level.departments && deptId) {
    const dept = level.departments.find((d) => d.id === deptId);
    if (!dept) return [];
    if (semesterId) {
      const sem = dept.semesters.find((s) => s.id === semesterId);
      return sem ? sem.subjects : [];
    }
    // Return all subjects across all semesters
    return dept.semesters.flatMap((s) => s.subjects);
  }

  return [];
}

export function getQuestionsForSubject(levelId: string, subjectId: string, deptId?: string, semesterId?: string): QuestionBankQuestion[] {
  const subjects = getSubjectsForSelection(levelId, deptId, semesterId);
  const subject = subjects.find((s) => s.id === subjectId);
  return subject ? subject.questions : [];
}

// Store analysis results
export function getAIQuestionAnalyses(): AIQuestionAnalysisResult[] {
  return get<AIQuestionAnalysisResult[]>("ai_question_analyses", []);
}

export function addAIQuestionAnalysis(item: Omit<AIQuestionAnalysisResult, "id" | "generatedAt">): AIQuestionAnalysisResult {
  const list = getAIQuestionAnalyses();
  const created: AIQuestionAnalysisResult = {
    ...item,
    id: uid(),
    generatedAt: new Date().toISOString(),
  };
  list.unshift(created);
  set("ai_question_analyses", list);
  recordUserActivity({
    featureId: "question-analysis",
    featureTitle: "AI Question Analysis",
    actionType: "Exam Analysis",
    title: `${item.subject} Question Analysis`,
    details: `${item.requestedCount} questions analyzed · ${item.educationLevel || "Exam"}`,
    route: "/dashboard/question-analysis",
  });
  return created;
}

// ─── AI Syllabus & Book Analyzer ───────────────────────────
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

export interface SyllabusBookAnalysisReport {
  id: string;
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
  generatedAt: string;
  customNotes?: string;
}

export function getSyllabusBookAnalyses(): SyllabusBookAnalysisReport[] {
  return get<SyllabusBookAnalysisReport[]>("syllabus_book_analyses", []);
}

export function addSyllabusBookAnalysis(item: Omit<SyllabusBookAnalysisReport, "id" | "generatedAt">): SyllabusBookAnalysisReport {
  const list = getSyllabusBookAnalyses();
  const created: SyllabusBookAnalysisReport = {
    ...item,
    id: uid(),
    generatedAt: new Date().toISOString(),
  };
  list.unshift(created);
  set("syllabus_book_analyses", list);
  recordUserActivity({
    featureId: "prediction",
    featureTitle: "AI Syllabus & Book Analyzer",
    actionType: "Matched Syllabus & Book",
    title: item.courseTitle || "Syllabus & Book Analysis",
    documentName: item.referenceBookName || item.syllabusName,
    details: `${item.mappedChapters?.length || 0} chapters matched · ${item.overallCoverage || 90}% coverage`,
    route: "/dashboard/prediction",
  });
  return created;
}

export function updateSyllabusBookAnalysis(id: string, updates: Partial<SyllabusBookAnalysisReport>): SyllabusBookAnalysisReport | null {
  const list = getSyllabusBookAnalyses();
  const index = list.findIndex((a) => a.id === id);
  if (index === -1) return null;
  const updated = { ...list[index]!, ...updates };
  list[index] = updated;
  set("syllabus_book_analyses", list);
  return updated;
}

