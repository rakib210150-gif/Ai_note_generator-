import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { addFile, getFiles, deleteFile, isOfficialDatabaseMaterial, type UploadedFile } from "@/lib/store";
import {
  FileUp, Upload, FileText, CheckCircle2, Trash2, ArrowRight,
  BookOpen, Sparkles, HelpCircle, AlertCircle, File, Eye
} from "lucide-react";

export const Route = createFileRoute("/dashboard/upload")({
  head: () => ({
    meta: [
      { title: "Upload Files — Brain Nest" },
      { name: "description", content: "Upload your PDFs, documents, or lecture notes to generate instant study aids." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>(() => getFiles().filter((f) => !isOfficialDatabaseMaterial(f)));
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  // Manual text input toggle
  const [manualSubject, setManualSubject] = useState("");
  const [manualChapter, setManualChapter] = useState("");
  const [manualText, setManualText] = useState("");
  const [showManual, setShowManual] = useState(false);

  const refreshFiles = () => {
    setFiles(getFiles().filter((f) => !isOfficialDatabaseMaterial(f)));
  };

  useEffect(() => {
    refreshFiles();
    api.getDocuments().then((res: any) => {
      const docs = res?.data || res || [];
      if (Array.isArray(docs) && docs.length > 0) {
        const currentFiles = getFiles();
        let changed = false;
        docs.forEach((doc: any) => {
          if (!doc.is_system_material && !isOfficialDatabaseMaterial({ id: doc.id, name: doc.name }) && !currentFiles.some((f) => f.id === doc.id || f.name === doc.name)) {
            currentFiles.push({
              id: doc.id,
              name: doc.name,
              type: doc.file_type || "application/pdf",
              size: doc.size_bytes || 1024,
              content: doc.extracted_text || `Document: ${doc.name}`,
              subject: doc.subject || "General Studies",
              chapter: doc.chapter || "Overview",
              uploadedAt: doc.created_at || new Date().toISOString(),
            });
            changed = true;
          }
        });
        if (changed) {
          const userOnly = currentFiles.filter((f) => !isOfficialDatabaseMaterial(f));
          setFiles(userOnly);
        }
      }
    }).catch(() => {});
  }, []);

  const handle1ClickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processFileList = async (fileList: FileList | File[]) => {
    setIsProcessing(true);
    const filesArray = Array.from(fileList);
    for (const file of filesArray) {
      if (!file) continue;
      setProcessingStatus(`Extracting and indexing "${file.name}"...`);

      // Infer subject and chapter from file name
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      const parts = cleanName.split(/[-_]+/);
      const subject = parts[0]?.trim() || "General Studies";
      const chapter = parts.slice(1).join(" ").trim() || "Overview";

      let content = "";
      let serverFileId: string | undefined = undefined;

      // Extract text directly from plain text/markdown
      if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        try {
          content = await file.text();
        } catch {}
      }

      // Upload to backend to run deep PDF / DOCX text extraction
      try {
        const uploadRes = await api.uploadDocument(file, subject, chapter);
        if (uploadRes.success && uploadRes.data) {
          serverFileId = uploadRes.data.id;
          if (uploadRes.data.extractedText && uploadRes.data.extractedText.length > 20) {
            content = uploadRes.data.extractedText;
          }
        }
      } catch (uploadErr) {
        console.warn("Backend document upload skipped or offline:", uploadErr);
      }

      // If text is still empty (e.g. offline PDF), extract printable characters
      if (!content || content.length < 20) {
        try {
          const raw = await file.text();
          const printable = raw.replace(/[^\x20-\x7E\u0980-\u09FF\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
          if (printable.length > 50) {
            content = printable.slice(0, 30000);
          }
        } catch {}
      }

      if (!content) {
        content = `${subject}: ${chapter}. Comprehensive study material uploaded from file "${file.name}".`;
      }

      addFile({
        ...(serverFileId ? { id: serverFileId } : {}),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        content,
        subject,
        chapter,
      });
    }

    setIsProcessing(false);
    setProcessingStatus("");
    refreshFiles();
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDelete = (id: string) => {
    deleteFile(id);
    refreshFiles();
    if (previewFile?.id === id) {
      setPreviewFile(null);
    }
  };

  const handleSaveManual = () => {
    if (!manualText.trim() || !manualSubject.trim()) return;
    addFile({
      name: `${manualSubject}_${manualChapter || "Notes"}.txt`,
      type: "text/plain",
      size: new Blob([manualText]).size,
      content: manualText,
      subject: manualSubject,
      chapter: manualChapter || "Chapter 1",
    });
    setManualSubject("");
    setManualChapter("");
    setManualText("");
    setShowManual(false);
    refreshFiles();
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
            <FileUp className="h-4 w-4" /> Local Device Upload
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Study Materials</h1>
          <p className="mt-2 text-muted-foreground">
            Select files directly from your computer or phone. Upload PDFs, slides, textbooks, or lecture notes to generate instant AI notes and quizzes.
          </p>
        </div>

        {/* 1-Click Upload Hero Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`panel relative overflow-hidden border-2 border-dashed p-10 text-center transition-all ${
            isDragging
              ? "border-primary bg-primary/10 shadow-glow"
              : "border-border/80 hover:border-primary/50"
          }`}
        >
          {/* Hidden standard file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.md,.rtf,.pptx,image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow animate-float">
            <Upload className="h-8 w-8" />
          </div>

          <h2 className="mt-5 text-xl font-bold">1-Click File Upload from Device</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Click the button below to browse files from your computer, or drag and drop any file directly here.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handle1ClickUpload}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="h-5 w-5" />
              {isProcessing ? "Reading Document..." : "Choose Files from Device"}
            </button>

            <button
              onClick={() => setShowManual(!showManual)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-3 font-medium text-foreground hover:bg-card transition"
            >
              <FileText className="h-4 w-4 text-primary" />
              {showManual ? "Close Manual Input" : "Paste Text Directly"}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> PDF, DOCX, TXT, MD, Images</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Instant OCR & text extraction</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Free & unlimited uploads</span>
          </div>

          {isProcessing && (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm">
                <Sparkles className="h-4 w-4 animate-spin" />
                {processingStatus || "Processing your document..."}
              </div>
            </div>
          )}
        </div>

        {/* Manual Paste Section */}
        {showManual && (
          <div className="mt-6 panel p-6 border-primary/40 bg-card/90">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Paste Raw Lecture Notes or Syllabus Text
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Physics, Economics, Bangla"
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Chapter / Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Mechanics, Market Structures"
                  value={manualChapter}
                  onChange={(e) => setManualChapter(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes Content</label>
              <textarea
                rows={5}
                placeholder="Paste or write textbook content, definitions, or bullet points here..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowManual(false)}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveManual}
                disabled={!manualText.trim() || !manualSubject.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Save as Study Material
              </button>
            </div>
          </div>
        )}

        {/* Uploaded Files Section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Uploaded Materials ({files.length})</h2>
              <p className="text-xs text-muted-foreground">Files available for immediate AI note & quiz creation</p>
            </div>
            {files.length > 0 && (
              <button
                onClick={handle1ClickUpload}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                <Upload className="h-3.5 w-3.5" /> + Upload More
              </button>
            )}
          </div>

          {files.length === 0 ? (
            <div className="panel p-10 text-center">
              <File className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">No files uploaded yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click "Choose Files from Device" above to upload your first study file.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="panel p-5 flex flex-col justify-between transition hover:border-border/80"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-sm" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {file.subject} • {file.chapter}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        title="Delete file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground/80 line-clamp-2 bg-muted/30 p-2 rounded-lg font-mono">
                      {file.content.slice(0, 140)}...
                    </p>
                  </div>

                  {/* Actions for this file */}
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate({ to: "/dashboard/notes", search: { fileId: file.id } as any })}
                        className="text-xs font-medium text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/30 flex items-center gap-1 transition"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Notes
                      </button>
                      <button
                        onClick={() => navigate({ to: "/dashboard/quiz", search: { fileId: file.id } as any })}
                        className="text-xs font-medium text-foreground hover:bg-accent px-2.5 py-1 rounded-lg border border-border flex items-center gap-1 transition"
                      >
                        <HelpCircle className="h-3.5 w-3.5 text-primary" /> Quiz
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Preview Modal */}
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="panel max-w-2xl w-full max-h-[80vh] flex flex-col p-6 bg-card border-border shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-base">{previewFile.name}</h3>
                </div>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <div className="my-4 overflow-y-auto max-h-[55vh] rounded-lg bg-background p-4 text-xs font-mono leading-relaxed text-foreground whitespace-pre-wrap">
                {previewFile.content}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {previewFile.subject} — {previewFile.chapter}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const id = previewFile.id;
                      setPreviewFile(null);
                      navigate({ to: "/dashboard/notes", search: { fileId: id } as any });
                    }}
                    className="rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Generate Study Notes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
