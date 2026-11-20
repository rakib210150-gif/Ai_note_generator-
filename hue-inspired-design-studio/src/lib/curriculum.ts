export interface CurriculumChapter {
  id: number;
  number: string;
  en: string;
  bn: string;
}

export interface ClassCurriculum {
  [subject: string]: CurriculumChapter[];
}

export interface DatabaseBookMeta {
  id: string;
  name: string;
  subject: "Physics" | "Biology";
  targetClass: "9-10";
  totalChapters: number;
  description: string;
}

/**
 * The ONLY two official curriculum books pre-indexed in the Brain Nest database.
 * Strictly available for Class 9-10 students.
 */
export const CLASS_9_10_DATABASE_BOOKS: DatabaseBookMeta[] = [
  {
    id: "7967a517-4b9b-4332-ba95-f9986be1cfdb",
    name: "Physics pdf class 9-10 .pdf",
    subject: "Physics",
    targetClass: "9-10",
    totalChapters: 14,
    description: "Official NCTB Secondary Physics Class 9-10 Complete Textbook (Chapters 1-14)",
  },
  {
    id: "02e130f9-9ee4-4537-bb61-521971e93424",
    name: "Biology pdf class 9-10 com.pdf",
    subject: "Biology",
    targetClass: "9-10",
    totalChapters: 14,
    description: "Official NCTB Secondary Biology Class 9-10 Complete Textbook (Chapters 1-14)",
  },
];

/**
 * Returns true strictly if the given class has preloaded database books (only Class 9-10).
 */
export function hasClassDatabaseBooks(cls: string): boolean {
  return cls === "9-10";
}

/**
 * Returns the list of database subjects supported for this class.
 * For "9-10", returns ["Physics", "Biology"].
 * For all other classes ("11-12", "bsc", etc.), returns [] (no database books).
 */
export function getDatabaseSubjectsForClass(cls: string): string[] {
  if (cls === "9-10") {
    return ["Physics", "Biology"];
  }
  return [];
}

/**
 * Returns the database chapters for a given class and subject.
 * Returns chapters strictly for Class 9-10 Physics and Biology.
 */
export function getDatabaseChaptersForSubject(cls: string, subject: string): CurriculumChapter[] {
  if (cls === "9-10" && (subject === "Physics" || subject === "Biology")) {
    return DATABASE_CURRICULUM["9-10"][subject] || [];
  }
  return [];
}

/**
 * Returns the database book metadata for a subject in Class 9-10.
 */
export function getDatabaseBookForSubject(cls: string, subject: string): DatabaseBookMeta | undefined {
  if (cls !== "9-10") return undefined;
  return CLASS_9_10_DATABASE_BOOKS.find((b) => b.subject.toLowerCase() === subject.toLowerCase());
}

export const DATABASE_CURRICULUM: Record<"9-10" | "11-12", ClassCurriculum> = {
  "9-10": {
    Physics: [
      { id: 1, number: "01", en: "Physical World and Measurement", bn: "ভৌত রাশি ও পরিমাপ" },
      { id: 2, number: "02", en: "Motion", bn: "গতি" },
      { id: 3, number: "03", en: "Force", bn: "বল" },
      { id: 4, number: "04", en: "Work, Power and Energy", bn: "কাজ, ক্ষমতা ও শক্তি" },
      { id: 5, number: "05", en: "Pressure and States of Matter", bn: "পদার্থের অবস্থা ও চাপ" },
      { id: 6, number: "06", en: "Effect of Heat on Matter", bn: "বস্তুর উপর তাপের প্রভাব" },
      { id: 7, number: "07", en: "Waves and Sound", bn: "তরঙ্গ ও শব্দ" },
      { id: 8, number: "08", en: "Reflection of Light", bn: "আলোর প্রতিফলন" },
      { id: 9, number: "09", en: "Refraction of Light", bn: "আলোর প্রতিসরণ" },
      { id: 10, number: "10", en: "Static Electricity", bn: "স্থির তড়িৎ" },
      { id: 11, number: "11", en: "Current Electricity", bn: "চল তড়িৎ" },
      { id: 12, number: "12", en: "Magnetic Effect of Current", bn: "বিদ্যুতের চৌম্বক ক্রিয়া" },
      { id: 13, number: "13", en: "Modern Physics and Electronics", bn: "আধুনিক পদার্থবিজ্ঞান ও ইলেকট্রনিক্স" },
      { id: 14, number: "14", en: "Physics in Saving Lives", bn: "জীবন বাঁচাতে পদার্থবিজ্ঞান" },
    ],
    Biology: [
      { id: 1, number: "01", en: "Lessons on Life", bn: "জীবন পাঠ" },
      { id: 2, number: "02", en: "Cells and Tissues", bn: "জীবকোষ ও টিস্যু" },
      { id: 3, number: "03", en: "Cell Division", bn: "কোষ বিভাজন" },
      { id: 4, number: "04", en: "Bioenergetics", bn: "জীবনীশক্তি" },
      { id: 5, number: "05", en: "Food, Nutrition and Digestion", bn: "খাদ্য, পুষ্টি ও পরিপাক" },
      { id: 6, number: "06", en: "Transport in Organisms", bn: "জীবে পরিবহন" },
      { id: 7, number: "07", en: "Gaseous Exchange", bn: "গ্যাসীয় বিনিময়" },
      { id: 8, number: "08", en: "Excretory System", bn: "রেচন প্রক্রিয়া" },
      { id: 9, number: "09", en: "Movement and Locomotion", bn: "দৃঢ়তা প্রদান ও চলন" },
      { id: 10, number: "10", en: "Coordination", bn: "সমন্বয়" },
      { id: 11, number: "11", en: "Reproduction in Organisms", bn: "জীবের প্রজনন" },
      { id: 12, number: "12", en: "Heredity and Evolution", bn: "জীবের বংশগতি ও বিবর্তন" },
      { id: 13, number: "13", en: "Environment and Ecosystem", bn: "জীবের পরিবেশ" },
      { id: 14, number: "14", en: "Biotechnology", bn: "জীবপ্রযুক্তি" },
    ],
    Chemistry: [
      { id: 1, number: "01", en: "Concepts of Chemistry", bn: "রসায়নের ধারণা" },
      { id: 2, number: "02", en: "States of Matter", bn: "পদার্থের অবস্থা" },
      { id: 3, number: "03", en: "Structure of Matter", bn: "পদার্থের গঠন" },
      { id: 4, number: "04", en: "Periodic Table", bn: "পর্যায় সারণি" },
      { id: 5, number: "05", en: "Chemical Bonds", bn: "রাসায়নিক বন্ধন" },
      { id: 6, number: "06", en: "Concept of Mole & Chemical Calculation", bn: "মোলের ধারণা ও রাসায়নিক গণনা" },
      { id: 7, number: "07", en: "Chemical Reactions", bn: "রাসায়নিক বিক্রিয়া" },
      { id: 8, number: "08", en: "Chemistry and Energy", bn: "রসায়ন ও শক্তি" },
      { id: 9, number: "09", en: "Acid-Base Balance", bn: "এসিড-ক্ষার সমতা" },
      { id: 10, number: "10", en: "Mineral Resources: Metals and Non-metals", bn: "খনিজ সম্পদ: ধাতু ও অধাতু" },
      { id: 11, number: "11", en: "Mineral Resources: Fossil", bn: "খনিজ সম্পদ: জীবাশ্ম" },
      { id: 12, number: "12", en: "Chemistry in Our Lives", bn: "আমাদের জীবনে রসায়ন" },
    ],
    "Higher Math": [
      { id: 1, number: "01", en: "Sets and Functions", bn: "সেট ও ফাংশন" },
      { id: 2, number: "02", en: "Algebraic Expressions", bn: "বীজগাণিতিক রাশি" },
      { id: 3, number: "03", en: "Geometry", bn: "জ্যামিতি" },
      { id: 4, number: "04", en: "Geometric Constructions", bn: "জ্যামিতিক অঙ্কন" },
      { id: 5, number: "05", en: "Equations", bn: "সমীকরণ" },
      { id: 6, number: "06", en: "Inequalities", bn: "অসমতা" },
      { id: 7, number: "07", en: "Infinite Series", bn: "অসীম ধারা" },
      { id: 8, number: "08", en: "Trigonometry", bn: "ত্রিকোণমিতি" },
      { id: 9, number: "09", en: "Exponential and Logarithmic Functions", bn: "সূচকীয় ও লগারিদমীয় ফাংশন" },
      { id: 10, number: "10", en: "Binomial Expansion", bn: "দ্বিপদী বিস্তৃতি" },
      { id: 11, number: "11", en: "Coordinate Geometry", bn: "স্থানাঙ্ক জ্যামিতি" },
      { id: 12, number: "12", en: "Planar Vectors", bn: "সমতলীয় ভেক্টর" },
      { id: 13, number: "13", en: "Solid Geometry", bn: "ঘন জ্যামিতি" },
      { id: 14, number: "14", en: "Probability", bn: "সম্ভাবনা" },
    ],
    ICT: [
      { id: 1, number: "01", en: "ICT and Our Bangladesh", bn: "তথ্য ও যোগাযোগ প্রযুক্তি এবং আমাদের বাংলাদেশ" },
      { id: 2, number: "02", en: "Computer and User Safety", bn: "কম্পিউটার ও কম্পিউটার ব্যবহারকারীর নিরাপত্তা" },
      { id: 3, number: "03", en: "Internet in My Education", bn: "আমার শিক্ষায় ইন্টারনেট" },
      { id: 4, number: "04", en: "Word Processing and Spreadsheets", bn: "আমার লেখালেখি ও হিসাব" },
      { id: 5, number: "05", en: "Multimedia and Graphics", bn: "মাল্টিমিডিয়া ও গ্রাফিক্স" },
      { id: 6, number: "06", en: "Use of Database", bn: "ডাটাবেজ এর ব্যবহার" },
    ],
  },
  "11-12": {
    Physics: [
      { id: 1, number: "01", en: "Physical World and Measurement", bn: "ভৌত জগৎ ও পরিমাপ" },
      { id: 2, number: "02", en: "Vectors and Coordinate Systems", bn: "ভেক্টর ও স্থানাঙ্ক ব্যবস্থা" },
      { id: 3, number: "03", en: "Kinematics and Dynamics", bn: "গতিবিদ্যা ও নিউটনীয় বলবিদ্যা" },
      { id: 4, number: "04", en: "Work, Energy and Power", bn: "কাজ, শক্তি ও ক্ষমতা" },
      { id: 5, number: "05", en: "Gravitation and Gravity", bn: "মহাকর্ষ ও অভিকর্ষ" },
      { id: 6, number: "06", en: "Structural Properties of Matter", bn: "পদার্থের গাঠনিক ধর্ম" },
      { id: 7, number: "07", en: "Periodic Motion and Oscillations", bn: "পর্যায়বৃত্ত গতি ও স্পন্দন" },
      { id: 8, number: "08", en: "Waves and Acoustics", bn: "তরঙ্গ ও শব্দ" },
      { id: 9, number: "09", en: "Thermodynamics and Heat Engines", bn: "তাপগতিবিদ্যা ও তাপ ইঞ্জিন" },
      { id: 10, number: "10", en: "Electrostatics and Gauss's Law", bn: "স্থির তড়িৎ ও গাউসের সূত্র" },
      { id: 11, number: "11", en: "Current Electricity and Circuits", bn: "চল তড়িৎ ও বর্তনী" },
      { id: 12, number: "12", en: "Electromagnetism and Induction", bn: "তড়িৎ চুম্বকত্ব ও আবেশ" },
      { id: 13, number: "13", en: "Optics and Wave Nature of Light", bn: "জ্যামিতিক ও ভৌত আলোকবিজ্ঞান" },
      { id: 14, number: "14", en: "Modern Physics and Atomic Model", bn: "আধুনিক পদার্থবিজ্ঞান ও পরমাণু মডেল" },
    ],
    Biology: [
      { id: 1, number: "01", en: "Cell Structure and Biomolecules", bn: "কোষ ও এর গঠন" },
      { id: 2, number: "02", en: "Cell Division (Mitosis & Meiosis)", bn: "কোষ বিভাজন" },
      { id: 3, number: "03", en: "Cell Chemistry and Enzymes", bn: "কোষ রসায়ন ও এনজাইম" },
      { id: 4, number: "04", en: "Microbiology (Viruses & Bacteria)", bn: "অণুজীববিজ্ঞান: ভাইরাস ও ব্যাকটেরিয়া" },
      { id: 5, number: "05", en: "Plant Physiology and Photosynthesis", bn: "উদ্ভিদ শারীরতত্ত্ব ও সালোকসংশ্লেষণ" },
      { id: 6, number: "06", en: "Animal Diversity and Classification", bn: "প্রাণীর বিভিন্নতা ও শ্রেণিবিন্যাস" },
      { id: 7, number: "07", en: "Human Physiology: Digestion", bn: "মানব শারীরতত্ত্ব: পরিপাক ও শোষণ" },
      { id: 8, number: "08", en: "Cardiovascular System and Blood", bn: "রক্ত ও সংবহনতন্ত্র" },
      { id: 9, number: "09", en: "Nervous Coordination and Senses", bn: "স্নায়ুতন্ত্র ও সমন্বয়" },
      { id: 10, number: "10", en: "Genetics and Evolution", bn: "জিনতত্ত্ব ও বিবর্তন" },
    ],
    Chemistry: [
      { id: 1, number: "01", en: "Safe Use of Laboratory", bn: "ল্যাবরেটরির নিরাপদ ব্যবহার" },
      { id: 2, number: "02", en: "Qualitative Chemistry", bn: "গুণগত রসায়ন" },
      { id: 3, number: "03", en: "Periodic Properties and Chemical Bonds", bn: "পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন" },
      { id: 4, number: "04", en: "Chemical Changes and Equilibrium", bn: "রাসায়নিক পরিবর্তন ও সাম্যাবস্থা" },
      { id: 5, number: "05", en: "Environmental Chemistry", bn: "পরিবেশ রসায়ন" },
      { id: 6, number: "06", en: "Organic Chemistry", bn: "জৈব রসায়ন" },
      { id: 7, number: "07", en: "Quantitative Chemistry", bn: "পরিমাণগত রসায়ন" },
      { id: 8, number: "08", en: "Electrochemistry", bn: "তড়িৎ রসায়ন" },
    ],
    "Higher Math": [
      { id: 1, number: "01", en: "Matrices and Determinants", bn: "ম্যাট্রিক্স ও নির্ণায়ক" },
      { id: 2, number: "02", en: "Vectors", bn: "ভেক্টর" },
      { id: 3, number: "03", en: "Straight Lines", bn: "সরলরেখা" },
      { id: 4, number: "04", en: "Circles", bn: "বৃত্ত" },
      { id: 5, number: "05", en: "Permutation and Combination", bn: "বিন্যাস ও সমাবেশ" },
      { id: 6, number: "06", en: "Trigonometric Ratios", bn: "ত্রিকোণমিতিক অনুপাত" },
      { id: 7, number: "07", en: "Differentiation and Calculus", bn: "অন্তরীকরণ" },
      { id: 8, number: "08", en: "Integration", bn: "যৌগজীকরণ" },
      { id: 9, number: "09", en: "Complex Numbers", bn: "জটিল সংখ্যা" },
      { id: 10, number: "10", en: "Polynomials", bn: "বহুপদী ও বহুপদী সমীকরণ" },
    ],
    ICT: [
      { id: 1, number: "01", en: "Global and Bangladesh Perspectives", bn: "তথ্য ও যোগাযোগ প্রযুক্তি: বিশ্ব ও বাংলাদেশ প্রেক্ষিত" },
      { id: 2, number: "02", en: "Communication Systems & Networking", bn: "কমিউনিকেশন সিস্টেমস ও নেটওয়ার্কিং" },
      { id: 3, number: "03", en: "Number Systems & Digital Logic", bn: "সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস" },
      { id: 4, number: "04", en: "Web Design and HTML", bn: "ওয়েব ডিজাইন পরিচিতি এবং এইচটিএমএল" },
      { id: 5, number: "05", en: "Programming Language (C Language)", bn: "প্রোগ্রামিং ভাষা (সি প্রোগ্রামিং)" },
      { id: 6, number: "06", en: "Database Management System (DBMS)", bn: "ডাটাবেজ ম্যানেজমেন্ট সিস্টেম" },
    ],
  },
};

