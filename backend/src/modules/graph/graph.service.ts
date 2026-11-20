import { z } from "zod";
import { geminiService } from "../../lib/gemini.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { walletService } from "../wallet/wallet.service.js";
import { documentService } from "../documents/documents.service.js";

export const generateGraphSchema = z.object({
  targetTopic: z.string().min(1, "Topic or learning goal is required"),
  learningGoal: z.string().optional().nullable(),
  academicLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).default("intermediate"),
  subject: z.string().optional().nullable(),
  fileId: z.string().optional().nullable(),
  sourceText: z.string().optional().nullable(),
});

export type GenerateGraphInput = z.infer<typeof generateGraphSchema>;

export interface GraphNode {
  id: string;
  name: string;
  tier: "foundation" | "core" | "advanced";
  learningLevel: "Basic" | "Intermediate" | "Advanced";
  importance: "Essential" | "Recommended" | "Optional";
  estimatedEffort: string;
  summary: string;
  prerequisites: string[]; // IDs of prerequisite nodes
  unlocks: string[]; // IDs of unlocked nodes
  status: "mastered" | "learning" | "ready" | "locked";
  subject: string;
  chapter: string;
  keySubtopics?: string[];
  order: number;
  x: number; // 0-100 canvas position
  y: number; // 0-100 canvas position
}

export interface GraphEdge {
  id: string;
  from: string; // prerequisite node id
  to: string; // dependent node id
  type: "essential" | "recommended" | "optional";
  label?: string;
}

export interface DependencyGraphData {
  id: string;
  targetTopic: string;
  learningGoal: string;
  academicLevel: "beginner" | "intermediate" | "advanced" | "expert";
  subject: string;
  overview: string;
  totalEffortHours: string;
  prerequisiteCount: number;
  coreCount: number;
  advancedCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt: string;
  updatedAt: string;
  coinsRemaining?: number;
}

// In-memory persistent cache for user graphs if database table is pending migration
const graphStore = new Map<string, DependencyGraphData>();

// Pre-curated, highly realistic roadmaps for instant exploration & offline resilience
const CURATED_PRESETS: Record<string, DependencyGraphData> = {
  "cpp-programming": {
    id: "cpp-programming",
    targetTopic: "C++ Programming (Beginner to Expert)",
    learningGoal: "Master C++ from fundamental computer architecture and syntax to advanced metaprogramming, memory models, and STL.",
    academicLevel: "expert",
    subject: "Computer Science",
    overview: "A comprehensive, structured dependency roadmap covering computer architecture, core imperative syntax, memory management, object-oriented design patterns, templates, and modern C++20 concurrency.",
    totalEffortHours: "120-150 hours",
    prerequisiteCount: 4,
    coreCount: 6,
    advancedCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: "cs-fundamentals",
        name: "Computer Architecture & Binary Logic",
        tier: "foundation",
        learningLevel: "Basic",
        importance: "Essential",
        estimatedEffort: "4-6 hours",
        summary: "CPU registers, RAM organization, stack vs heap memory structure, and binary data representations.",
        prerequisites: [],
        unlocks: ["cpp-syntax"],
        status: "mastered",
        subject: "Computer Science",
        chapter: "Foundations",
        keySubtopics: ["CPU & ALU", "Stack & Heap Layout", "Two's Complement", "Endianness"],
        order: 1,
        x: 10,
        y: 20,
      },
      {
        id: "cpp-syntax",
        name: "C++ Syntax, Variables & Control Flow",
        tier: "foundation",
        learningLevel: "Basic",
        importance: "Essential",
        estimatedEffort: "8-10 hours",
        summary: "Primitive types, scope resolution, expressions, conditional branching (if/switch), and loop constructs.",
        prerequisites: ["cs-fundamentals"],
        unlocks: ["functions-modular", "pointers-references"],
        status: "mastered",
        subject: "Computer Science",
        chapter: "Language Basics",
        keySubtopics: ["Data Types", "Operators", "Loops", "Control Structures"],
        order: 2,
        x: 25,
        y: 20,
      },
      {
        id: "functions-modular",
        name: "Functions & Modular Decomposition",
        tier: "foundation",
        learningLevel: "Basic",
        importance: "Essential",
        estimatedEffort: "6-8 hours",
        summary: "Function prototypes, parameter passing by value vs reference, default arguments, and recursion.",
        prerequisites: ["cpp-syntax"],
        unlocks: ["pointers-references", "oop-basics"],
        status: "ready",
        subject: "Computer Science",
        chapter: "Functions",
        keySubtopics: ["Prototypes", "Pass-by-Reference", "Inline Functions", "Stack Frames"],
        order: 3,
        x: 25,
        y: 50,
      },
      {
        id: "pointers-references",
        name: "Pointers, References & Address Arithmetic",
        tier: "foundation",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "12-16 hours",
        summary: "Raw pointer mechanics, dereferencing, pointer arithmetic, void pointers, and nullptr safety.",
        prerequisites: ["cpp-syntax", "functions-modular"],
        unlocks: ["dynamic-memory", "oop-basics"],
        status: "learning",
        subject: "Computer Science",
        chapter: "Memory Model",
        keySubtopics: ["Memory Addresses", "Pointer Arithmetic", "Lvalue References", "Const Correctness"],
        order: 4,
        x: 42,
        y: 20,
      },
      {
        id: "dynamic-memory",
        name: "Dynamic Memory Allocation & RAII",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "10-12 hours",
        summary: "Manual allocation with new/delete, memory leak detection, and Resource Acquisition Is Initialization (RAII).",
        prerequisites: ["pointers-references"],
        unlocks: ["smart-pointers", "data-structures"],
        status: "ready",
        subject: "Computer Science",
        chapter: "Memory Management",
        keySubtopics: ["new/delete", "Memory Leaks", "RAII Idiom", "Destructors"],
        order: 5,
        x: 58,
        y: 20,
      },
      {
        id: "oop-basics",
        name: "Object-Oriented Programming (Classes & Encapsulation)",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "12-14 hours",
        summary: "Classes, objects, access specifiers, constructors/destructors, this pointer, and friend functions.",
        prerequisites: ["functions-modular", "pointers-references"],
        unlocks: ["oop-inheritance", "operator-overload"],
        status: "ready",
        subject: "Computer Science",
        chapter: "OOP",
        keySubtopics: ["Encapsulation", "Constructors & Initializer Lists", "Copy Semantics", "Const Members"],
        order: 6,
        x: 42,
        y: 55,
      },
      {
        id: "oop-inheritance",
        name: "Inheritance, Polymorphism & Virtual Tables",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "14-16 hours",
        summary: "Single/multiple inheritance, virtual functions, vtables, pure virtual functions, and abstract interfaces.",
        prerequisites: ["oop-basics"],
        unlocks: ["design-patterns", "smart-pointers"],
        status: "locked",
        subject: "Computer Science",
        chapter: "OOP",
        keySubtopics: ["vtable/vptr", "Dynamic Binding", "Override & Final", "Multiple Inheritance Pitfalls"],
        order: 7,
        x: 58,
        y: 55,
      },
      {
        id: "operator-overload",
        name: "Operator Overloading & Copy/Move Mechanics",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Recommended",
        estimatedEffort: "8-10 hours",
        summary: "Overloading arithmetic/stream operators, Rule of Three/Five/Zero, and move semantics (rvalue references).",
        prerequisites: ["oop-basics"],
        unlocks: ["smart-pointers", "stl-containers"],
        status: "locked",
        subject: "Computer Science",
        chapter: "Advanced Mechanics",
        keySubtopics: ["Rule of 5", "std::move", "Rvalue References", "Copy-and-Swap"],
        order: 8,
        x: 58,
        y: 80,
      },
      {
        id: "smart-pointers",
        name: "Modern Memory: std::unique_ptr & std::shared_ptr",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "8-10 hours",
        summary: "Ownership semantics with unique_ptr, reference counted shared_ptr, and cycle prevention with weak_ptr.",
        prerequisites: ["dynamic-memory", "oop-inheritance", "operator-overload"],
        unlocks: ["stl-containers", "concurrency"],
        status: "locked",
        subject: "Computer Science",
        chapter: "Modern C++",
        keySubtopics: ["std::make_unique", "std::make_shared", "std::weak_ptr", "Custom Deleters"],
        order: 9,
        x: 75,
        y: 20,
      },
      {
        id: "data-structures",
        name: "Custom Data Structures & Pointers",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Recommended",
        estimatedEffort: "12-14 hours",
        summary: "Building linked lists, stacks, queues, binary search trees, and dynamic arrays from scratch.",
        prerequisites: ["dynamic-memory"],
        unlocks: ["stl-containers"],
        status: "locked",
        subject: "Computer Science",
        chapter: "Algorithms & Structures",
        keySubtopics: ["Linked Lists", "Trees", "Pointer Manipulation", "Complexity"],
        order: 10,
        x: 75,
        y: 50,
      },
      {
        id: "stl-containers",
        name: "Standard Template Library (STL) Containers & Iterators",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "14-18 hours",
        summary: "std::vector, std::list, std::map, std::unordered_map, iterators, and std::ranges algorithms.",
        prerequisites: ["smart-pointers", "data-structures"],
        unlocks: ["templates-meta", "concurrency"],
        status: "locked",
        subject: "Computer Science",
        chapter: "STL",
        keySubtopics: ["Vector Allocation", "Hash Maps", "Iterator Categories", "std::sort / algorithms"],
        order: 11,
        x: 75,
        y: 80,
      },
      {
        id: "templates-meta",
        name: "Templates, Concepts & Generic Metaprogramming",
        tier: "advanced",
        learningLevel: "Advanced",
        importance: "Recommended",
        estimatedEffort: "16-20 hours",
        summary: "Function and class templates, template specialization, SFINAE, constexpr, and modern C++20 Concepts.",
        prerequisites: ["stl-containers"],
        unlocks: ["advanced-cpp"],
        status: "locked",
        subject: "Computer Science",
        chapter: "Metaprogramming",
        keySubtopics: ["Template Specialization", "C++20 Concepts", "SFINAE", "Type Traits"],
        order: 12,
        x: 90,
        y: 25,
      },
      {
        id: "concurrency",
        name: "Multithreading & Concurrency (std::thread, Mutex, Atomics)",
        tier: "advanced",
        learningLevel: "Advanced",
        importance: "Essential",
        estimatedEffort: "14-16 hours",
        summary: "Thread lifecycles, race conditions, mutex locking, lock guards, condition variables, and atomics.",
        prerequisites: ["smart-pointers", "stl-containers"],
        unlocks: ["advanced-cpp"],
        status: "locked",
        subject: "Computer Science",
        chapter: "Concurrency",
        keySubtopics: ["std::jthread", "std::mutex", "Atomic Operations", "Deadlock Avoidance"],
        order: 13,
        x: 90,
        y: 55,
      },
      {
        id: "advanced-cpp",
        name: "Modern C++20/23 Deep Dive & High Performance Optimization",
        tier: "advanced",
        learningLevel: "Advanced",
        importance: "Optional",
        estimatedEffort: "20-25 hours",
        summary: "Coroutines, Modules, SIMD vectorization, cache-friendly data alignment, and profiling tools (Valgrind, Perf).",
        prerequisites: ["templates-meta", "concurrency"],
        unlocks: [],
        status: "locked",
        subject: "Computer Science",
        chapter: "High-Performance Systems",
        keySubtopics: ["Coroutines", "Cache Locality", "Assembly Inspection", "Zero-Cost Abstractions"],
        order: 14,
        x: 90,
        y: 85,
      },
    ],
    edges: [
      { id: "e1", from: "cs-fundamentals", to: "cpp-syntax", type: "essential", label: "Prerequisite for execution model" },
      { id: "e2", from: "cpp-syntax", to: "functions-modular", type: "essential", label: "Syntax needed for function definitions" },
      { id: "e3", from: "cpp-syntax", to: "pointers-references", type: "essential", label: "Requires variables & types" },
      { id: "e4", from: "functions-modular", to: "pointers-references", type: "essential", label: "Pass-by-pointer/reference" },
      { id: "e5", from: "functions-modular", to: "oop-basics", type: "essential", label: "Member methods require function mechanics" },
      { id: "e6", from: "pointers-references", to: "dynamic-memory", type: "essential", label: "Heap allocation yields raw addresses" },
      { id: "e7", from: "pointers-references", to: "oop-basics", type: "essential", label: "The `this` pointer & object references" },
      { id: "e8", from: "dynamic-memory", to: "smart-pointers", type: "essential", label: "Smart pointers wrap dynamic memory" },
      { id: "e9", from: "dynamic-memory", to: "data-structures", type: "recommended", label: "Building node links in memory" },
      { id: "e10", from: "oop-basics", to: "oop-inheritance", type: "essential", label: "Inheritance builds on base class encapsulation" },
      { id: "e11", from: "oop-basics", to: "operator-overload", type: "recommended", label: "Overloading for class instances" },
      { id: "e12", from: "oop-inheritance", to: "smart-pointers", type: "essential", label: "Polymorphic storage in unique/shared ptrs" },
      { id: "e13", from: "operator-overload", to: "smart-pointers", type: "essential", label: "Move constructor and operator=" },
      { id: "e14", from: "data-structures", to: "stl-containers", type: "recommended", label: "Intuition behind container complexities" },
      { id: "e15", from: "smart-pointers", to: "stl-containers", type: "essential", label: "Ownership of objects inside containers" },
      { id: "e16", from: "stl-containers", to: "templates-meta", type: "essential", label: "STL relies fully on template syntax" },
      { id: "e17", from: "smart-pointers", to: "concurrency", type: "essential", label: "Safe memory sharing across worker threads" },
      { id: "e18", from: "stl-containers", to: "concurrency", type: "recommended", label: "Thread-safe data queues & buffers" },
      { id: "e19", from: "templates-meta", to: "advanced-cpp", type: "essential", label: "Concepts & compile-time metaprogramming" },
      { id: "e20", from: "concurrency", to: "advanced-cpp", type: "essential", label: "Coroutines and high-throughput thread pools" },
    ],
  },

  "biology-nucleus": {
    id: "biology-nucleus",
    targetTopic: "The Nucleus in Cell Biology",
    learningGoal: "Understand the nucleus in depth: from microscopic cell architecture to genomic regulation and ribosome biogenesis.",
    academicLevel: "intermediate",
    subject: "Biology",
    overview: "A focused prerequisite tree revealing the biological dependencies required to fully comprehend the structure, membrane mechanics, genomic expression, and ribosome synthesis of the eukaryotic nucleus.",
    totalEffortHours: "18-24 hours",
    prerequisiteCount: 3,
    coreCount: 5,
    advancedCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: "cell-theory",
        name: "Cell Theory & Chemical Foundations of Life",
        tier: "foundation",
        learningLevel: "Basic",
        importance: "Essential",
        estimatedEffort: "2-3 hours",
        summary: "The cell as the fundamental unit of life, phospholipid bilayer chemistry, and aqueous cytosol properties.",
        prerequisites: [],
        unlocks: ["prokaryote-eukaryote", "nucleic-acids"],
        status: "mastered",
        subject: "Biology",
        chapter: "Cell Biology",
        keySubtopics: ["Cell Theory", "Lipid Bilayers", "Water Polarity", "Macromolecules"],
        order: 1,
        x: 10,
        y: 25,
      },
      {
        id: "prokaryote-eukaryote",
        name: "Prokaryotic vs Eukaryotic Cell Organization",
        tier: "foundation",
        learningLevel: "Basic",
        importance: "Essential",
        estimatedEffort: "2-3 hours",
        summary: "Compartmentalization advantages, nucleoid vs membrane-bound organelles, and endosymbiotic origins.",
        prerequisites: ["cell-theory"],
        unlocks: ["nuclear-envelope", "cell-organelles"],
        status: "mastered",
        subject: "Biology",
        chapter: "Cell Structure",
        keySubtopics: ["Compartmentalization", "Organelles", "Membrane Systems", "Evolutionary Origins"],
        order: 2,
        x: 28,
        y: 25,
      },
      {
        id: "nucleic-acids",
        name: "Nucleic Acids: DNA & RNA Molecular Architecture",
        tier: "foundation",
        learningLevel: "Basic",
        importance: "Essential",
        estimatedEffort: "3-4 hours",
        summary: "Nucleotide structures (phosphate, deoxyribose, nitrogenous bases), double helix antiparallel chains, and hydrogen bonding.",
        prerequisites: ["cell-theory"],
        unlocks: ["chromatin-structure", "nucleolus-ribosome"],
        status: "learning",
        subject: "Biology",
        chapter: "Molecular Genetics",
        keySubtopics: ["Double Helix", "Purines & Pyrimidines", "Phosphodiester Bonds", "Base Pairing"],
        order: 3,
        x: 28,
        y: 60,
      },
      {
        id: "cell-organelles",
        name: "Cytoplasmic Organelles & Endomembrane System",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Recommended",
        estimatedEffort: "3-4 hours",
        summary: "Rough & Smooth Endoplasmic Reticulum, Golgi apparatus, and vesicular transport linked to the outer nuclear membrane.",
        prerequisites: ["prokaryote-eukaryote"],
        unlocks: ["nuclear-envelope"],
        status: "ready",
        subject: "Biology",
        chapter: "Organelles",
        keySubtopics: ["Rough ER Continuity", "Ribosome Anchoring", "Vesicular Budding"],
        order: 4,
        x: 48,
        y: 20,
      },
      {
        id: "nuclear-envelope",
        name: "Nuclear Envelope & Nuclear Lamina",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "2-3 hours",
        summary: "Double membrane bilayer, perinuclear space, intermediate filament meshwork (nuclear lamina), and mechanical structural integrity.",
        prerequisites: ["prokaryote-eukaryote", "cell-organelles"],
        unlocks: ["nuclear-pore-complex", "target-nucleus"],
        status: "ready",
        subject: "Biology",
        chapter: "The Nucleus",
        keySubtopics: ["Inner & Outer Membranes", "Lamin A/B/C Filaments", "Perinuclear Space", "Progeria Mutations"],
        order: 5,
        x: 48,
        y: 45,
      },
      {
        id: "chromatin-structure",
        name: "Chromatin Packaging, Histones & Chromosomes",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "4-5 hours",
        summary: "Nucleosomes (histone octamers), 30-nm solenoids, euchromatin vs heterochromatin territories within the nucleoplasm.",
        prerequisites: ["nucleic-acids"],
        unlocks: ["target-nucleus", "transcription-control"],
        status: "ready",
        subject: "Biology",
        chapter: "Genomic Organization",
        keySubtopics: ["Histone Octamer", "Euchromatin vs Heterochromatin", "Epigenetic Acetylation", "Mitotic Condensation"],
        order: 6,
        x: 48,
        y: 75,
      },
      {
        id: "nuclear-pore-complex",
        name: "Nuclear Pore Complexes (NPC) & Gated Transport",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "3-4 hours",
        summary: "FG-nucleoporin hydrogel barrier, Importin/Exportin karyopherin receptors, and the Ran-GTPase chemical energy gradient.",
        prerequisites: ["nuclear-envelope"],
        unlocks: ["target-nucleus"],
        status: "locked",
        subject: "Biology",
        chapter: "Molecular Transport",
        keySubtopics: ["FG Repeats", "Ran-GTP/GDP Gradient", "NLS & NES Signals", "Size Exclusion Limits"],
        order: 7,
        x: 68,
        y: 30,
      },
      {
        id: "nucleolus-ribosome",
        name: "Nucleolus Architecture & Ribosome Biogenesis",
        tier: "core",
        learningLevel: "Intermediate",
        importance: "Essential",
        estimatedEffort: "3-4 hours",
        summary: "Fibrillar center, dense fibrillar component, granular component, 45S pre-rRNA transcription, and 40S/60S subunit assembly.",
        prerequisites: ["nucleic-acids"],
        unlocks: ["target-nucleus"],
        status: "locked",
        subject: "Biology",
        chapter: "Nucleolus",
        keySubtopics: ["NOR Chromosomal Regions", "rRNA Processing", "Ribosomal Protein Import", "Subunit Assembly"],
        order: 8,
        x: 68,
        y: 70,
      },
      {
        id: "target-nucleus",
        name: "Comprehensive Nuclear Function & Cellular Master Controller",
        tier: "advanced",
        learningLevel: "Advanced",
        importance: "Essential",
        estimatedEffort: "5-6 hours",
        summary: "Integration of nuclear envelope, NPC transport, chromatin dynamics, and nucleolus into the master genetic command center of the cell.",
        prerequisites: ["nuclear-envelope", "nuclear-pore-complex", "chromatin-structure", "nucleolus-ribosome"],
        unlocks: ["transcription-control", "mitosis-breakdown"],
        status: "locked",
        subject: "Biology",
        chapter: "The Nucleus (Core Master Topic)",
        keySubtopics: ["Genomic Protection", "Gene Expression Orchestration", "Spatial Nucleoplasm Organization"],
        order: 9,
        x: 85,
        y: 45,
      },
      {
        id: "transcription-control",
        name: "Transcriptional Regulation & Pre-mRNA Processing",
        tier: "advanced",
        learningLevel: "Advanced",
        importance: "Recommended",
        estimatedEffort: "4-5 hours",
        summary: "RNA Polymerase II, transcription factor binding at promoters/enhancers, 5' capping, polyadenylation, and spliceosome editing.",
        prerequisites: ["target-nucleus", "chromatin-structure"],
        unlocks: [],
        status: "locked",
        subject: "Biology",
        chapter: "Gene Regulation",
        keySubtopics: ["Promoters & Enhancers", "Intron Splicing", "5' Cap / 3' Poly-A", "mRNP Nuclear Export"],
        order: 10,
        x: 92,
        y: 20,
      },
      {
        id: "mitosis-breakdown",
        name: "Nuclear Envelope Breakdown & Reassembly in Mitosis",
        tier: "advanced",
        learningLevel: "Advanced",
        importance: "Optional",
        estimatedEffort: "3-4 hours",
        summary: "Phosphorylation of nuclear lamins by CDK1/Cyclin B, spindle assembly access, and post-telophase nuclear envelope reformation.",
        prerequisites: ["target-nucleus"],
        unlocks: [],
        status: "locked",
        subject: "Biology",
        chapter: "Cell Cycle",
        keySubtopics: ["Lamin Phosphorylation", "Prometaphase Envelope Dispersal", "Telophase Reassembly", "ESCRT III Sealing"],
        order: 11,
        x: 92,
        y: 75,
      },
    ],
    edges: [
      { id: "eb1", from: "cell-theory", to: "prokaryote-eukaryote", type: "essential", label: "Understands cell foundations" },
      { id: "eb2", from: "cell-theory", to: "nucleic-acids", type: "essential", label: "Biochemical basis of genetic polymers" },
      { id: "eb3", from: "prokaryote-eukaryote", to: "cell-organelles", type: "recommended", label: "Membrane compartmentalization" },
      { id: "eb4", from: "prokaryote-eukaryote", to: "nuclear-envelope", type: "essential", label: "Eukaryotic defining membrane" },
      { id: "eb5", from: "cell-organelles", to: "nuclear-envelope", type: "recommended", label: "Rough ER outer membrane continuity" },
      { id: "eb6", from: "nucleic-acids", to: "chromatin-structure", type: "essential", label: "DNA coils around histones" },
      { id: "eb7", from: "nucleic-acids", to: "nucleolus-ribosome", type: "essential", label: "rRNA gene clusters code for ribosomes" },
      { id: "eb8", from: "nuclear-envelope", to: "nuclear-pore-complex", type: "essential", label: "Pores perforate the envelope" },
      { id: "eb9", from: "nuclear-envelope", to: "target-nucleus", type: "essential", label: "Physical boundary of nucleus" },
      { id: "eb10", from: "nuclear-pore-complex", to: "target-nucleus", type: "essential", label: "Molecular gateway of nucleus" },
      { id: "eb11", from: "chromatin-structure", to: "target-nucleus", type: "essential", label: "Genetic content of nucleus" },
      { id: "eb12", from: "nucleolus-ribosome", to: "target-nucleus", type: "essential", label: "Largest sub-nuclear organelle" },
      { id: "eb13", from: "target-nucleus", to: "transcription-control", type: "essential", label: "Nuclear execution of central dogma" },
      { id: "eb14", from: "target-nucleus", to: "mitosis-breakdown", type: "recommended", label: "Nuclear dynamics during cell division" },
    ],
  },
};

export class GraphService {
  /**
   * Generate an intelligent dependency graph using Gemini
   */
  public async generateGraph(userId: string, input: GenerateGraphInput): Promise<DependencyGraphData> {
    const coinCost = 10;

    // Deduct coins atomically
    const topicLabel = (input.targetTopic || "Curriculum Roadmap").slice(0, 30);
    const deduction = await walletService.deductCoins(
      userId,
      coinCost,
      `AI Content Dependency Graph: ${topicLabel}`
    );

    if (!deduction.success) {
      throw new Error(deduction.message || "Insufficient coins to generate dependency roadmap (10 coins required).");
    }

    try {
      // 1. Resolve document context if fileId or subject provided (auto-resolves Class 9-10 Physics & Biology)
      let docText = input.sourceText || "";
      let documentName = "";
      let detectedDocSubject = "";
      if (!docText) {
        const resolved = await documentService.resolveDocumentContext({
          userId,
          fileId: input.fileId,
          subject: input.subject,
        });
        if (resolved.text) {
          docText = resolved.text.slice(0, 20000);
          documentName = resolved.docName || "";
          detectedDocSubject = resolved.subject || "";
        }
      }

      const cleanDocTitle = documentName
        ? documentName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim()
        : "";

      const resolvedTargetTopic =
        input.targetTopic && input.targetTopic.trim() && input.targetTopic !== "Uploaded Document Syllabus"
          ? input.targetTopic.trim()
          : cleanDocTitle || "Target Knowledge Mastery";

      const prompt = `You are an elite educational taxonomist, curriculum architect, and prerequisite dependency graph engineer.
Generate an intelligent, logically accurate Knowledge Dependency Graph & Prerequisite Roadmap for:
- Target Topic / Concept: "${resolvedTargetTopic}"
- Academic Depth / Level: "${input.academicLevel}" (beginner, intermediate, advanced, expert)
${input.learningGoal ? `- Specific Learning Goal: "${input.learningGoal}"` : ""}
${documentName ? `- Source Document Name: "${documentName}"` : ""}

${
  docText
    ? `SOURCE DOCUMENT / TEXTBOOK CONTENT:
"""
${docText}
"""
CRITICAL REAL DOCUMENT ANALYSIS RULES:
1. STRICT DISCIPLINE DETECTION: Accurately detect the real academic subject from the document content (e.g. "Computer Science / Image Processing" for digital image processing, "Biology" for genetics/cells, "Physics" ONLY if the document is genuinely about physics). Do NOT classify image processing as physics!
2. IDENTIFY REAL TOPICS FROM DOCUMENT: Extract the actual chapters, major concepts, algorithms, and models discussed in the document (e.g. Sampling & Quantization, Gray-Level Transformations, Spatial & Frequency Filtering, Image Restoration, Compression & Huffman Coding, Morphological Segmentation).
3. DISCOVER PREREQUISITES: What fundamental mathematics (e.g. Linear Algebra, Matrix operations, Discrete Signals, Calculus, Fourier Transform basics) and foundational concepts must a student study BEFORE starting these topics?
4. DEPENDENCY RELATIONSHIPS: Connect each topic to its true prerequisites using directed dependency edges (from prerequisite TO unlocked topic).`
    : `CRITICAL TOPIC PREREQUISITE RULES:
1. Conduct an authentic, rigorous prerequisite decomposition for "${resolvedTargetTopic}".
2. Foundation Tier (Stage 1): Foundational concepts with 0 prerequisites that must be understood first.
3. Core Tier (Stage 2): Intermediate mechanisms, bridging principles, and practical constructs.
4. Advanced Tier (Stage 3): Complex abstractions, optimization, specialization, and apex mastery.
5. Create logically sound prerequisite connections (from prerequisite TO next concept).`
}

LEVEL SPECIFICITY:
- "beginner": Emphasize foundational building blocks and clear definitions. Label complex theoretical derivations as "Optional".
- "intermediate": Balance core theoretical mechanics with applied problem solving.
- "advanced" or "expert": Dive directly into deep architectural abstractions, rigorous mathematics, optimization, and edge cases.

Return a STRICT, VALID JSON object with this exact structure:
{
  "subject": "<Accurate discipline, e.g. Computer Science, Biology, Mathematics, Physics, Chemistry, Economics>",
  "targetTopic": "<Precise, descriptive title for this roadmap, e.g. 'Digital Image Processing: Prerequisite Architecture'>",
  "learningGoal": "<1-2 sentence learning objective>",
  "academicLevel": "${input.academicLevel}",
  "overview": "<2-3 sentence overview explaining how this roadmap guides the student from foundation to target mastery>",
  "totalEffortHours": "<Estimated total study hours, e.g. 35-50 hours>",
  "nodes": [
    {
      "id": "<short-kebab-slug, e.g. 'fourier-transform', 'histogram-eq', 'matrix-algebra'>",
      "name": "<Clear Concept Title>",
      "tier": "<'foundation' | 'core' | 'advanced'>",
      "learningLevel": "<'Basic' | 'Intermediate' | 'Advanced'>",
      "importance": "<'Essential' | 'Recommended' | 'Optional'>",
      "estimatedEffort": "<e.g. '3-4 hours', '6-8 hours'>",
      "summary": "<2-3 sentence explanation of the concept, what it covers, and why it is a prerequisite>",
      "prerequisites": ["<ids of prerequisite nodes that MUST be learned before this>"],
      "unlocks": ["<ids of successor nodes unlocked after mastering this>"],
      "chapter": "<Sub-domain or Chapter name>",
      "keySubtopics": ["<Subtopic 1>", "<Subtopic 2>", "<Subtopic 3>"],
      "order": 1
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "<source prerequisite node id>",
      "to": "<target unlocked node id>",
      "type": "<'essential' | 'recommended' | 'optional'>",
      "label": "<brief reason, e.g. 'Provides mathematical basis', 'Pixel representation required'>"
    }
  ]
}

Ensure you provide between 8 and 14 well-structured nodes. Return ONLY valid JSON with no markdown wrapping.`;

      const raw = await geminiService.generateJSON<{
        subject?: string;
        targetTopic?: string;
        learningGoal?: string;
        academicLevel?: "beginner" | "intermediate" | "advanced" | "expert";
        overview?: string;
        totalEffortHours?: string;
        nodes?: any[];
        edges?: any[];
      }>(prompt, "You are Brain Nest AI, an elite educational intelligence and curriculum dependency graph engine.");

      // Post-process and sanitize nodes and edges
      const graphId = `graph-${Date.now()}`;
      const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
      const nodeMap = new Map<string, GraphNode>();

      // Accurate detected subject: Prioritize AI detected subject from document content
      const resolvedSubject = raw.subject || detectedDocSubject || input.subject || "General Academic";
      const finalTargetTopic = raw.targetTopic || resolvedTargetTopic;

      // Group nodes by tier for deterministic layout coordinates
      const tierCounts: Record<string, number> = { foundation: 0, core: 0, advanced: 0 };

      // Sanitize nodes
      const nodes: GraphNode[] = rawNodes.map((n, idx) => {
        const id = String(n.id || `node-${idx + 1}`).toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const tier = (["foundation", "core", "advanced"].includes(n.tier) ? n.tier : idx < 3 ? "foundation" : idx < 8 ? "core" : "advanced") as GraphNode["tier"];
        const importance = (["Essential", "Recommended", "Optional"].includes(n.importance) ? n.importance : "Essential") as GraphNode["importance"];
        const learningLevel = (["Basic", "Intermediate", "Advanced"].includes(n.learningLevel) ? n.learningLevel : tier === "foundation" ? "Basic" : tier === "core" ? "Intermediate" : "Advanced") as GraphNode["learningLevel"];

        const prereqs = Array.isArray(n.prerequisites) ? n.prerequisites.map(String) : [];
        const unlocks = Array.isArray(n.unlocks) ? n.unlocks.map(String) : [];

        // Initial status logic: nodes with 0 prerequisites are ready, others locked
        const status: GraphNode["status"] = prereqs.length === 0 ? (idx === 0 ? "mastered" : "ready") : "locked";

        // Layout positioning: Foundation at x=50, Core at x=440, Advanced at x=830
        const tierIndex = tierCounts[tier] || 0;
        tierCounts[tier] = tierIndex + 1;

        const x = tier === "foundation" ? 50 : tier === "core" ? 440 : 830;
        const y = 40 + tierIndex * 155;

        const node: GraphNode = {
          id,
          name: n.name || `Concept ${idx + 1}`,
          tier,
          learningLevel,
          importance,
          estimatedEffort: n.estimatedEffort || "3-5 hours",
          summary: n.summary || `Core prerequisite concept in ${finalTargetTopic}.`,
          prerequisites: prereqs,
          unlocks,
          status,
          subject: resolvedSubject,
          chapter: n.chapter || finalTargetTopic,
          keySubtopics: Array.isArray(n.keySubtopics) ? n.keySubtopics.slice(0, 5) : [],
          order: idx + 1,
          x,
          y,
        };

        nodeMap.set(id, node);
        return node;
      });

      // Filter and harmonize edges
      const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];
      const edges: GraphEdge[] = [];
      const edgeSet = new Set<string>();

      rawEdges.forEach((e, idx) => {
        const from = String(e.from || "");
        const to = String(e.to || "");
        if (nodeMap.has(from) && nodeMap.has(to) && from !== to) {
          const key = `${from}->${to}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({
              id: e.id || `e-${idx + 1}`,
              from,
              to,
              type: ["essential", "recommended", "optional"].includes(e.type) ? e.type : "essential",
              label: e.label || "Prerequisite",
            });
          }
        }
      });

      // If edges were sparse, auto-derive from nodes' prerequisites & unlocks
      nodes.forEach((n) => {
        n.prerequisites.forEach((pId) => {
          if (nodeMap.has(pId)) {
            const key = `${pId}->${n.id}`;
            if (!edgeSet.has(key)) {
              edgeSet.add(key);
              edges.push({
                id: `e-auto-${edges.length + 1}`,
                from: pId,
                to: n.id,
                type: n.importance === "Essential" ? "essential" : "recommended",
                label: "Required knowledge",
              });
            }
            // Ensure bidirectional consistency
            const pNode = nodeMap.get(pId)!;
            if (!pNode.unlocks.includes(n.id)) pNode.unlocks.push(n.id);
          }
        });

        n.unlocks.forEach((uId) => {
          if (nodeMap.has(uId)) {
            const key = `${n.id}->${uId}`;
            if (!edgeSet.has(key)) {
              edgeSet.add(key);
              edges.push({
                id: `e-auto-${edges.length + 1}`,
                from: n.id,
                to: uId,
                type: "essential",
                label: "Unlocks next topic",
              });
            }
            const uNode = nodeMap.get(uId)!;
            if (!uNode.prerequisites.includes(n.id)) uNode.prerequisites.push(n.id);
          }
        });
      });

      // Counts
      const foundationCount = nodes.filter((n) => n.tier === "foundation").length;
      const coreCount = nodes.filter((n) => n.tier === "core").length;
      const advancedCount = nodes.filter((n) => n.tier === "advanced").length;

      const graphData: DependencyGraphData = {
        id: graphId,
        targetTopic: raw.targetTopic || input.targetTopic,
        learningGoal: raw.learningGoal || input.learningGoal || `Master ${input.targetTopic}`,
        academicLevel: input.academicLevel,
        subject: raw.subject || input.subject || "General Academic",
        overview: raw.overview || `Intelligent dependency roadmap charting prerequisites and progression for ${input.targetTopic}.`,
        totalEffortHours: raw.totalEffortHours || `${nodes.length * 4} hours`,
        prerequisiteCount: foundationCount,
        coreCount,
        advancedCount,
        nodes,
        edges,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        coinsRemaining: deduction.newBalance,
      };

      // Store in memory cache
      graphStore.set(graphId, graphData);

      // Attempt to store in Supabase table if table exists
      try {
        await supabaseAdmin.from("dependency_graphs").insert({
          id: graphId,
          user_id: userId,
          document_id: input.fileId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.fileId) ? input.fileId : null,
          target_topic: graphData.targetTopic,
          learning_goal: graphData.learningGoal,
          academic_level: graphData.academicLevel,
          subject: graphData.subject,
          nodes: graphData.nodes,
          edges: graphData.edges,
          metadata: {
            overview: graphData.overview,
            totalEffortHours: graphData.totalEffortHours,
            prerequisiteCount: foundationCount,
            coreCount,
            advancedCount,
          },
        });
      } catch (dbErr) {
        // Non-blocking: memory cache handles persistence for session
        console.warn("Notice: dependency_graphs db write skipped:", dbErr);
      }

      return graphData;
    } catch (err: any) {
      console.error("AI Dependency Graph Generation Failed, refunding coins:", err);
      await walletService.addCoins(
        userId,
        coinCost,
        `Refund: Failed Dependency Graph (${input.targetTopic})`
      );
      throw err;
    }
  }

  /**
   * Get pre-curated presets
   */
  public getPresets(): DependencyGraphData[] {
    return Object.values(CURATED_PRESETS);
  }

  /**
   * Get specific graph by ID
   */
  public async getGraphById(graphId: string, userId: string): Promise<DependencyGraphData | null> {
    // Check presets first
    if (CURATED_PRESETS[graphId]) {
      return CURATED_PRESETS[graphId];
    }

    // Check memory store
    if (graphStore.has(graphId)) {
      return graphStore.get(graphId)!;
    }

    // Check Supabase
    try {
      const { data, error } = await supabaseAdmin
        .from("dependency_graphs")
        .select("*")
        .eq("id", graphId)
        .eq("user_id", userId)
        .single();

      if (!error && data) {
        const graph: DependencyGraphData = {
          id: data.id,
          targetTopic: data.target_topic,
          learningGoal: data.learning_goal || "",
          academicLevel: data.academic_level || "intermediate",
          subject: data.subject || "General Studies",
          overview: data.metadata?.overview || "",
          totalEffortHours: data.metadata?.totalEffortHours || "30 hours",
          prerequisiteCount: data.metadata?.prerequisiteCount || 3,
          coreCount: data.metadata?.coreCount || 5,
          advancedCount: data.metadata?.advancedCount || 2,
          nodes: data.nodes || [],
          edges: data.edges || [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        graphStore.set(graphId, graph);
        return graph;
      }
    } catch (e) {
      // Ignored
    }

    return null;
  }

  /**
   * Update student progress on a node (mark as mastered, currently learning, ready)
   */
  public async updateNodeStatus(
    userId: string,
    graphId: string,
    nodeId: string,
    status: "mastered" | "learning" | "ready" | "locked"
  ): Promise<DependencyGraphData> {
    let graph = await this.getGraphById(graphId, userId);

    // If preset, clone it for the user
    if (CURATED_PRESETS[graphId]) {
      const clonedId = `graph-${Date.now()}`;
      graph = JSON.parse(JSON.stringify(CURATED_PRESETS[graphId]));
      graph!.id = clonedId;
      graphStore.set(clonedId, graph!);
    }

    if (!graph) {
      throw new Error("Graph not found");
    }

    // Update target node status
    const targetNode = graph.nodes.find((n) => n.id === nodeId);
    if (!targetNode) {
      throw new Error(`Node ${nodeId} not found in graph`);
    }
    targetNode.status = status;

    // Smart status cascade: If this node is now 'mastered', check its unlocked children.
    // If all prerequisites of a child are mastered, upgrade the child from 'locked' to 'ready'!
    if (status === "mastered") {
      const masteredSet = new Set(
        graph.nodes.filter((n) => n.status === "mastered").map((n) => n.id)
      );

      graph.nodes.forEach((n) => {
        if (n.status === "locked" && n.prerequisites.length > 0) {
          const allPrereqsDone = n.prerequisites.every((pId) => masteredSet.has(pId));
          if (allPrereqsDone) {
            n.status = "ready";
          }
        }
      });
    }

    graph.updatedAt = new Date().toISOString();
    graphStore.set(graph.id, graph);

    // Try saving to database
    try {
      await supabaseAdmin
        .from("dependency_graphs")
        .update({
          nodes: graph.nodes,
          updated_at: graph.updatedAt,
        })
        .eq("id", graph.id)
        .eq("user_id", userId);
    } catch {}

    return graph;
  }
}

export const graphService = new GraphService();
