"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { X, Upload, Loader2, MapPin, Hash, Plus, Images } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { MemberChips } from "@/components/member-chips";
import { requestUploadUrls, addPhotosToRun } from "@/app/actions/photos";
import { createRun } from "@/app/actions/runs";
import { useSimpleRuns } from "@/app/lib/api";
import type { User } from "@/app/lib/types";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFiles?: File[];
  initialDate?: Date;
  members: User[];
  mode?: "create" | "add-to-existing";
  preSelectedRunId?: string;
}

interface FilePreview {
  file: File;
  preview: string;
  progress: number;
  uploaded: boolean;
}

export function UploadModal({
  open,
  onOpenChange,
  initialFiles,
  initialDate,
  members,
  mode: initialMode = "create",
  preSelectedRunId,
}: UploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [mode, setMode] = useState<"create" | "add-to-existing">(initialMode);
  const [selectedRunId, setSelectedRunId] = useState<string>(preSelectedRunId ?? "");
  const [date, setDate] = useState<Date | undefined>(initialDate ?? new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [runSearch, setRunSearch] = useState("");

  const { data: simpleRuns } = useSimpleRuns();

  // Sync mode & preSelectedRunId when props change
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setSelectedRunId(preSelectedRunId ?? "");
    }
  }, [open, initialMode, preSelectedRunId]);

  // Load initial files
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && open) {
      const previews = initialFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        uploaded: false,
      }));
      setFiles(previews);
    }
  }, [initialFiles, open]);

  // Cleanup previews
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  const addFiles = useCallback((newFiles: File[]) => {
    const imageFiles = newFiles.filter((f) => f.type.startsWith("image/"));
    const previews = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      uploaded: false,
    }));
    setFiles((prev) => [...prev, ...previews]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const resetForm = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setDate(new Date());
    setTitle("");
    setLocation("");
    setDescription("");
    setHashtags("");
    setSelectedMembers([]);
    setShowCalendar(false);
    setRunSearch("");
  }, [files]);

  async function uploadFiles(): Promise<string[]> {
    const fileInfos = files.map((f) => ({
      name: f.file.name,
      type: f.file.type,
      size: f.file.size,
    }));
    const uploadSlots = await requestUploadUrls(fileInfos);

    await Promise.all(
      uploadSlots.map(async (slot, index) => {
        const file = files[index].file;
        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setFiles((prev) =>
                prev.map((f, i) =>
                  i === index ? { ...f, progress: pct } : f
                )
              );
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setFiles((prev) =>
                prev.map((f, i) =>
                  i === index ? { ...f, uploaded: true, progress: 100 } : f
                )
              );
              resolve();
            } else {
              reject(new Error(`Upload failed for ${file.name}`));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error(`Upload failed for ${file.name}`))
          );

          xhr.open("PUT", slot.uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });
      })
    );

    return uploadSlots.map((s) => s.photoId);
  }

  async function handleSubmit() {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const photoIds = await uploadFiles();

      if (mode === "add-to-existing" && selectedRunId) {
        await addPhotosToRun(selectedRunId, photoIds);
        toast.success(`Added ${photoIds.length} photo${photoIds.length !== 1 ? "s" : ""} to run!`);
        resetForm();
        onOpenChange(false);
        router.refresh();
      } else {
        if (!date) return;
        const hashtagList = hashtags
          .split(/[,\s]+/)
          .map((t) => t.replace(/^#/, "").trim())
          .filter(Boolean);

        const { id } = await createRun({
          run_date: format(date, "yyyy-MM-dd"),
          title: title || undefined,
          description: description || undefined,
          location: location || undefined,
          hashtags: hashtagList.length > 0 ? hashtagList : undefined,
          participant_ids: selectedMembers,
          photo_ids: photoIds,
        });

        toast.success("Run uploaded successfully!");
        resetForm();
        onOpenChange(false);
        router.push(`/runs/${id}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setIsUploading(false);
    }
  }

  const filteredRuns = (simpleRuns ?? []).filter((r) => {
    if (!runSearch) return true;
    const search = runSearch.toLowerCase();
    return (
      r.title?.toLowerCase().includes(search) ||
      r.run_date.includes(search)
    );
  });

  const isSubmitDisabled =
    files.length === 0 ||
    isUploading ||
    (mode === "create" && !date) ||
    (mode === "add-to-existing" && !selectedRunId);

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!isUploading) {
        if (!o) resetForm();
        onOpenChange(o);
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle>Upload Photos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode toggle — only if not locked to add-to-existing */}
          {!preSelectedRunId && (
            <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
              {[
                { key: "create" as const, label: "New Run", icon: Plus },
                { key: "add-to-existing" as const, label: "Add to Existing", icon: Images },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setMode(opt.key)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    mode === opt.key
                      ? "text-foreground"
                      : "text-muted-foreground/50 hover:text-muted-foreground"
                  }`}
                >
                  {mode === opt.key && (
                    <motion.div
                      layoutId="upload-mode"
                      className="absolute inset-0 rounded-lg bg-background shadow-sm"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <opt.icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Run selector for "add to existing" mode */}
          {mode === "add-to-existing" && !preSelectedRunId && (
            <div>
              <Input
                placeholder="Search runs..."
                value={runSearch}
                onChange={(e) => setRunSearch(e.target.value)}
                className="mb-2 border-border/40 bg-muted/20 focus-visible:border-primary/50 focus-visible:ring-primary/20"
              />
              <div className="max-h-40 overflow-y-auto rounded-xl border border-border/30 bg-card/40">
                {filteredRuns.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground/50 text-center">No runs found</p>
                ) : (
                  filteredRuns.map((run) => (
                    <button
                      key={run.id}
                      onClick={() => setSelectedRunId(run.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/50 ${
                        selectedRunId === run.id
                          ? "bg-primary/5 text-primary border-l-2 border-primary"
                          : "text-foreground/80"
                      }`}
                    >
                      <span className="font-medium truncate">
                        {run.title ?? "Untitled"}
                      </span>
                      <span className="text-xs text-muted-foreground/50 shrink-0">
                        {run.run_date}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Photo previews */}
          <div>
            {files.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {files.map((f, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20, delay: index * 0.03 }}
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted"
                  >
                    <Image
                      src={f.preview}
                      alt={f.file.name}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                    {/* Upload progress ring */}
                    {isUploading && !f.uploaded && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="2.5" />
                          <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke="oklch(0.75 0.18 55)"
                            strokeWidth="2.5" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 15}`}
                            strokeDashoffset={`${2 * Math.PI * 15 * (1 - f.progress / 100)}`}
                            style={{ transition: "stroke-dashoffset 0.2s linear" }}
                          />
                        </svg>
                      </div>
                    )}
                    {isUploading && f.uploaded && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white fill-none stroke-white stroke-2">
                            <polyline points="2,6 5,9 10,3" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {!isUploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 border border-white/20 flex items-center justify-center hover:bg-red-500/80 transition-colors"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    )}
                  </motion.div>
                ))}
                {!isUploading && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors"
                  >
                    <Plus className="h-6 w-6 text-muted-foreground/40" />
                  </button>
                )}
              </div>
            ) : (
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/3 via-transparent to-ring/3 p-12 flex flex-col items-center gap-3 hover:border-primary/60 transition-all group"
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                <motion.div
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Upload className="h-6 w-6 text-primary/60" />
                </motion.div>
                <div className="text-center">
                  <p className="font-semibold text-foreground/80">Drop your run photos</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">or click to browse</p>
                </div>
              </motion.button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const newFiles = Array.from(e.target.files ?? []);
                addFiles(newFiles);
                e.target.value = "";
              }}
            />
          </div>

          {/* Metadata fields — only for "create" mode */}
          {mode === "create" && (
            <>
              {/* Date */}
              <div>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal border-border/40"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
                {showCalendar && (
                  <div className="mt-2">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        setDate(d);
                        setShowCalendar(false);
                      }}
                      initialFocus
                    />
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <Input
                  placeholder="Title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploading}
                  className="border-border/40 bg-muted/20 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                />
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isUploading}
                    className="border-border/40 bg-muted/20 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Hashtags (comma separated)"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    disabled={isUploading}
                    className="border-border/40 bg-muted/20 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                  />
                </div>
                <Textarea
                  placeholder="Notes (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  rows={2}
                  className="border-border/40 bg-muted/20 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                />
              </div>

              {/* Tag members */}
              <MemberChips
                members={members}
                selected={selectedMembers}
                onChange={setSelectedMembers}
              />
            </>
          )}

          {/* Submit */}
          <motion.button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="relative w-full h-12 rounded-xl font-semibold text-sm overflow-hidden bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-primary/30 transition-shadow duration-300"
            whileHover={!isSubmitDisabled ? { scale: 1.01 } : undefined}
            whileTap={!isSubmitDisabled ? { scale: 0.98 } : undefined}
          >
            {/* Progress bar background */}
            {isUploading && (
              <motion.div
                className="absolute inset-0 bg-white/10 origin-left"
                animate={{
                  scaleX: files.length
                    ? files.reduce((sum, f) => sum + f.progress, 0) / (files.length * 100)
                    : 0,
                }}
                transition={{ ease: "linear" }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isUploading ? (
                <>
                  <div className="accent-spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  Uploading {files.filter((f) => f.uploaded).length}/{files.length}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {mode === "add-to-existing"
                    ? `Add ${files.length} photo${files.length !== 1 ? "s" : ""}`
                    : `Upload ${files.length} photo${files.length !== 1 ? "s" : ""}`}
                </>
              )}
            </span>
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
