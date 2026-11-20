import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import {
  getFiles, getUser, updateCoins, addWalletEntry, setClassLevel,
  getSelectedClass, setSelectedClass, getDatabaseBooks,
  CLASS_9_10_CHAPTERS, type UploadedFile
} from "@/lib/store";
import {
  Bot, Send, Sparkles, User, Copy, Check, RotateCcw,
  BookOpen, HelpCircle, Lightbulb, MessageSquare, Target,
  FileText, AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/dashboard/tutor")({
  head: () => ({
    meta: [
      { title: "AI Study Tutor — Brain Nest" },
      { name: "description", content: "Chat with your 24/7 AI academic tutor. Ask questions, get concept breakdowns, and solve difficult problems." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorPage,
});

interface ChatMessage {
  id: string;
  sender: "user" | "tutor";
  text: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  "Explain Thermodynamics First Law simply with a real-life example",
  "How does cellular respiration produce ATP?",
  "Newton এর ৩য় সূত্র বাংলায় উদাহরণসহ সহজ ভাষায় বুঝিয়ে দাও",
  "Give me a step-by-step calculus integration practice problem",
  "What is the difference between Isothermal and Adiabatic processes?",
];

function TutorPage() {
  const user = getUser();
  const [selectedClass, setSelectedClassState] = useState<string>(() => getSelectedClass());
  const [subject, setSubject] = useState<string>("Physics");
  const [chapter, setChapter] = useState<string>(() => CLASS_9_10_CHAPTERS["Physics"]?.[0]?.name || "");
  const [files, setFiles] = useState<UploadedFile[]>(() => getFiles());
  const [selectedFileId, setSelectedFileId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro-1",
      sender: "tutor",
      text: `Hello ${user.name}! 👋 I am your Brain Nest AI Academic Tutor.\n\nYou can ask me anything about your textbooks, request step-by-step problem breakdowns, ask for explanations in English or Bangla (বাংলা), or select one of your uploaded files as study context!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync external class change events across navigation
  useEffect(() => {
    const onClassChange = (e: any) => {
      const cls = e.detail?.classLevel;
      if (cls && cls !== selectedClass) {
        setSelectedClassState(cls);
      }
    };
    window.addEventListener("bn_class_changed", onClassChange);
    return () => window.removeEventListener("bn_class_changed", onClassChange);
  }, [selectedClass]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleClassSelect = (newClass: string) => {
    setSelectedClassState(newClass);
    setSelectedClass(newClass);
    const updatedFiles = getFiles();
    setFiles(updatedFiles);

    if (newClass === "9-10") {
      setSubject("Physics");
      const dbBooks = getDatabaseBooks("9-10");
      const physDoc = dbBooks.find((f) => f.subject === "Physics");
      setSelectedFileId(physDoc?.id || "");
      setChapter(CLASS_9_10_CHAPTERS["Physics"]?.[0]?.name || "");
    } else {
      setSelectedFileId("");
      setSubject("");
      setChapter("");
    }
  };

  const handleSubjectPick = (sub: string) => {
    setSubject(sub);
    if (selectedClass === "9-10") {
      const dbBooks = getDatabaseBooks("9-10");
      const doc = dbBooks.find((f) => f.subject?.toLowerCase() === sub.toLowerCase());
      if (doc) {
        setSelectedFileId(doc.id);
      }
      const chapList = CLASS_9_10_CHAPTERS[sub];
      if (chapList && chapList.length > 0 && chapList[0]) {
        setChapter(chapList[0].name);
      }
    }
  };

  // Sync official file on mount if Class 9-10
  useEffect(() => {
    if (selectedClass === "9-10") {
      const targetSub = subject || "Physics";
      const dbBooks = getDatabaseBooks("9-10");
      const doc = dbBooks.find((f) => f.subject?.toLowerCase() === targetSub.toLowerCase());
      if (doc && !selectedFileId) {
        setSelectedFileId(doc.id);
      }
      if (!chapter) {
        const chapList = CLASS_9_10_CHAPTERS[targetSub];
        if (chapList && chapList.length > 0 && chapList[0]) {
          setChapter(chapList[0].name);
        }
      }
    }
  }, [files, selectedClass, subject]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (user.coins < 5) {
      alert("You need at least 5 coins to ask the AI Tutor. Please visit your wallet to claim daily coins!");
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const selectedFile = files.find((f) => f.id === selectedFileId);
      let promptToSend = query;
      if (selectedClass === "9-10" && chapter) {
        promptToSend = `[Context: Class 9-10 (SSC) ${subject} - ${chapter}]\nQuestion: ${query}`;
      }

      const res = await api.sendTutorMessage({
        message: promptToSend,
        subject: selectedClass === "9-10" ? subject : selectedFile?.subject,
        fileId: selectedFileId || undefined,
      });

      let responseText = "";
      if (res.success && res.data?.tutorReply) {
        responseText = res.data.tutorReply;
        if (typeof res.data.coinsRemaining === "number") {
          const coinDiff = res.data.coinsRemaining - user.coins;
          updateCoins(coinDiff);
        } else {
          updateCoins(-5);
        }
        addWalletEntry("AI Tutor Query (Gemini Live)", -5);
      } else {
        updateCoins(-2);
        addWalletEntry("AI Tutor Query", -2);
        const isBangla = query.includes("বাংলা") || /[\u0980-\u09FF]/.test(query);
        if (isBangla) {
          responseText = `### সমাধান ও ব্যাখ্যা (${chapter || subject}):\n\n**"${query}"** এর মূল ধারণা:\n\n1. **সংজ্ঞা ও ধারণা:** এটি বিজ্ঞান ও গণিতের একটি অন্যতম মৌলিক নিয়ম।\n2. **সহজ উদাহরণ:** দৈনন্দিন জীবনে আমরা যখন কোনো বস্তুতে বল প্রয়োগ করি, তখন বিপরীতমুখী সমান প্রতিক্রিয়া সৃষ্টি হয়।\n3. **পরীক্ষার জন্য বিশেষ টিপ:** পরীক্ষার খাতায় সূত্র লেখার সাথে সাথে একক (Units) এবং সমীকরণ অবশ্যই উল্লেখ করবে।`;
        } else {
          responseText = `### Concept Breakdown & Explanation:\n\nRegarding: **"${query}"**\n\n1. **Core Principle:** ${
            selectedClass === "9-10"
              ? `Based on your NCTB Class 9-10 ${subject} curriculum (${chapter}), this concept forms a key foundation.`
              : selectedFile
              ? `Based on your uploaded material "${selectedFile.name}", this topic relates directly to ${selectedFile.chapter || "the core syllabus"}.`
              : "This is a foundational concept frequently tested in board examinations and competitive tests."
          }\n\n2. **Step-by-Step Understanding:**\n   - **Step 1:** Identify the known variables and foundational definitions.\n   - **Step 2:** Relate the theory to physical laws.\n   - **Step 3:** Verify edge cases.\n\n3. **Quick Memory Formula:** Always remember to check units and state functions.`;
        }
      }

      const botMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        sender: "tutor",
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setIsTyping(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl h-[calc(100vh-100px)] flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border mb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-0.5">
              <Bot className="h-4 w-4" /> 24/7 Academic Intelligence
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AI Study Tutor</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground bg-accent px-2.5 py-1 rounded-lg border border-border">
              2 Coins / query
            </span>
          </div>
        </div>

        {/* Class, Subject & Chapter Selector Bar */}
        <div className="p-3 mb-3 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-primary" /> Class:
              </span>
              <div className="flex items-center gap-1 bg-accent/50 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => handleClassSelect("9-10")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedClass === "9-10"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Class 9-10 (SSC)
                  {selectedClass === "9-10" && <Check className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleClassSelect("11-12")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedClass === "11-12"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Class 11-12 (HSC)
                  {selectedClass === "11-12" && <Check className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {selectedClass === "9-10" && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSubjectPick("Physics")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                    subject.toLowerCase() === "physics"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  পদার্থবিজ্ঞান (Physics)
                </button>
                <button
                  type="button"
                  onClick={() => handleSubjectPick("Biology")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                    subject.toLowerCase() === "biology"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  জীববিজ্ঞান (Biology)
                </button>
              </div>
            )}
          </div>

          {selectedClass === "11-12" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Class 11-12 Mode: Official NCTB textbooks in database are for Class 9-10. Tutor will answer HSC questions from general intelligence or your uploaded files.
              </span>
            </div>
          )}

          {/* Chapter Selector & Connected Textbook Status */}
          <div className="grid gap-2 sm:grid-cols-12 items-center">
            <div className="sm:col-span-7 flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-primary" /> Chapter:
              </span>
              {selectedClass === "9-10" && CLASS_9_10_CHAPTERS[subject] ? (
                <select
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full rounded-xl border border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                >
                  {CLASS_9_10_CHAPTERS[subject]?.map((chap) => (
                    <option key={chap.id} value={chap.name}>
                      {chap.name} ({chap.bn})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="e.g. Thermodynamics, Cell Biology"
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              )}
            </div>

            <div className="sm:col-span-5 flex items-center justify-end gap-2 text-xs">
              {selectedClass === "9-10" ? (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-lg">
                  <FileText className="h-3.5 w-3.5" />
                  NCTB Class 9-10 {subject} Active
                </span>
              ) : (
                <select
                  value={selectedFileId}
                  onChange={(e) => setSelectedFileId(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="">Attach Custom File (Optional)</option>
                  {files.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Chat message stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "tutor" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "panel bg-card/90 border-border text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                <div
                  className={`mt-2 flex items-center justify-between text-[10px] ${
                    msg.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.sender === "tutor" && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="hover:text-primary flex items-center gap-1 transition"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === "user" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground border border-border">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 items-center text-xs text-muted-foreground">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="panel px-4 py-2 flex items-center gap-1.5 text-primary">
                <Sparkles className="h-3.5 w-3.5 animate-spin" /> Tutor is analyzing and thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts chips */}
        {messages.length <= 2 && (
          <div className="py-2 shrink-0">
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" /> Suggested study questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="rounded-lg border border-border bg-card/60 px-2.5 py-1 text-xs text-muted-foreground hover:bg-card hover:text-foreground transition text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input box */}
        <div className="pt-3 border-t border-border shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about your syllabus, homework problem, or concepts (English or বাংলা)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
