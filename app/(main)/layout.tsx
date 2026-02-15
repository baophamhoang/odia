"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
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
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const { data: members } = useTeamMembers();

  const handleDrop = useCallback((files: File[]) => {
    setDroppedFiles(files);
    setUploadOpen(true);
  }, []);

  const handleOpenUpload = useCallback(() => {
    setDroppedFiles([]);
    setUploadOpen(true);
  }, []);

  return (
    <DropZone onDrop={handleDrop}>
      <div className="min-h-screen">
        <Nav />
        <main className="md:pt-14 pb-20 md:pb-0">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>

        {/* Floating upload button — gradient accent */}
        <motion.button
          onClick={handleOpenUpload}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 25 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-xl shadow-foreground/10 dark:shadow-white/5 hover:shadow-2xl hover:shadow-foreground/20 dark:hover:shadow-white/10 transition-shadow duration-300"
          aria-label="Upload photos"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </motion.button>
      </div>

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        initialFiles={droppedFiles}
        members={members ?? []}
      />
    </DropZone>
  );
}
