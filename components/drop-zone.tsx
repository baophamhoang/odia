"use client";

import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onDrop: (files: File[]) => void;
  children: React.ReactNode;
}

export function DropZone({ onDrop, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      if (prev === 0) setIsDragging(true);
      return prev + 1;
    });
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const next = prev - 1;
      if (next === 0) setIsDragging(false);
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) {
        onDrop(files);
      }
    },
    [onDrop]
  );

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <>
      {children}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                  <Upload className="h-8 w-8 text-white/60" />
                </div>
                {/* Pulsing rings */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-4 rounded-[2rem] border border-white/15"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute -inset-2 rounded-[1.6rem] border border-white/10"
                />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white/90 tracking-tight">
                  Drop to upload
                </p>
                <p className="text-sm text-white/30 mt-1.5">
                  JPG, PNG, WebP, HEIC
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
