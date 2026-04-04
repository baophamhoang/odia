"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Route, ImageUp } from "lucide-react";
import { Nav } from "@/components/nav";
import { DropZone } from "@/components/drop-zone";
import { UploadModal } from "@/components/upload-modal";
import { useTeamMembers } from "@/app/lib/api";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"create" | "add-to-existing">("create");
  const [preSelectedRunId, setPreSelectedRunId] = useState<string | undefined>(undefined);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [fabOpen, setFabOpen] = useState(false);
  const { data: members } = useTeamMembers();
  const pathname = usePathname();

  // Extract run ID if on a run detail page
  const runMatch = pathname.match(/^\/runs\/([^/]+)/);
  const currentRunId = runMatch?.[1];

  const handleDrop = useCallback((files: File[]) => {
    setDroppedFiles(files);
    setUploadMode("create");
    setPreSelectedRunId(undefined);
    setUploadOpen(true);
  }, []);

  const handleNewRun = useCallback(() => {
    setFabOpen(false);
    setDroppedFiles([]);
    setUploadMode("create");
    setPreSelectedRunId(undefined);
    setUploadOpen(true);
  }, []);

  const handleUploadPhotos = useCallback(() => {
    setFabOpen(false);
    setDroppedFiles([]);
    setUploadMode("add-to-existing");
    setPreSelectedRunId(currentRunId);
    setUploadOpen(true);
  }, [currentRunId]);

  const dialItems = [
    {
      label: "Upload photos",
      icon: ImageUp,
      onClick: handleUploadPhotos,
    },
    {
      label: "New run",
      icon: Route,
      onClick: handleNewRun,
    },
  ];

  return (
    <DropZone onDrop={handleDrop}>
      <div className="min-h-screen">
        <Nav />
        <main className="md:pt-14 pb-20 md:pb-0">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>

        {/* Backdrop */}
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              key="fab-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-20"
              onClick={() => setFabOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Speed dial */}
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-3">
          {/* Sub-buttons */}
          <AnimatePresence>
            {fabOpen && dialItems.map((item, i) => (
              <motion.button
                key={item.label}
                onClick={item.onClick}
                initial={{ opacity: 0, y: 16, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 28, delay: i * 0.05 }}
                className="flex h-14 items-center gap-3 rounded-full bg-foreground pl-5 pr-4 text-background shadow-xl shadow-foreground/10 dark:shadow-white/5"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              </motion.button>
            ))}
          </AnimatePresence>

          {/* Main FAB */}
          <motion.button
            onClick={() => setFabOpen((o) => !o)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: fabOpen ? 0.4 : 1 }}
            transition={{ delay: fabOpen ? 0 : 0.5, type: "spring", stiffness: 400, damping: 25 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-xl shadow-foreground/10 dark:shadow-white/5 hover:shadow-2xl hover:shadow-foreground/20 dark:hover:shadow-white/10 transition-shadow duration-300"
            aria-label="Actions"
          >
            <motion.span
              animate={{ rotate: fabOpen ? 45 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </motion.span>
          </motion.button>
        </div>
      </div>

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        initialFiles={droppedFiles}
        members={members ?? []}
        mode={uploadMode}
        preSelectedRunId={preSelectedRunId}
      />
    </DropZone>
  );
}
