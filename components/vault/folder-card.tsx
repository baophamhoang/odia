"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Folder, Footprints } from "lucide-react";
import type { FolderWithMeta } from "@/app/lib/types";

interface FolderCardProps {
  folder: FolderWithMeta;
  index: number;
  onClick?: (folderId: string) => void;
}

function getFolderIcon(folderType: string) {
  switch (folderType) {
    case "run":
      return <Footprints className="h-8 w-8 text-primary/40" />;
    default:
      return <Folder className="h-8 w-8 text-primary/40" />;
  }
}

function getFolderAccent(folderType: string) {
  switch (folderType) {
    case "run":
      return "from-orange-500/10 to-amber-500/5";
    default:
      return "from-primary/10 to-ring/5";
  }
}

function TypeBadge({ folderType }: { folderType: string }) {
  if (folderType === "run") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 backdrop-blur-sm">
        <Footprints className="h-2.5 w-2.5" />
        Run
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white/70 backdrop-blur-sm">
      <Folder className="h-2.5 w-2.5" />
      Folder
    </span>
  );
}

export function FolderCard({ folder, index, onClick }: FolderCardProps) {
  const hasPreview = folder.preview_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.05 + index * 0.04,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4 }}
    >
      <button
        onClick={() => onClick?.(folder.id)}
        className="group block w-full text-left rounded-2xl overflow-hidden bg-card/50 dark:bg-card/30 shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 card-shine"
      >
        {hasPreview ? (
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={folder.preview_url!}
              alt={folder.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

            {/* Type badge */}
            <div className="absolute top-3 left-3">
              <TypeBadge folderType={folder.folder_type} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-base font-bold text-white truncate">
                {folder.name}
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                {folder.item_count} item{folder.item_count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`aspect-[4/3] bg-gradient-to-br ${getFolderAccent(
              folder.folder_type
            )} flex flex-col items-center justify-center gap-3 relative`}
          >
            {/* Type badge */}
            <div className="absolute top-3 left-3">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                folder.folder_type === "run"
                  ? "bg-orange-500/15 text-orange-600/70 dark:text-orange-400/70"
                  : "bg-primary/10 text-muted-foreground/60"
              }`}>
                {folder.folder_type === "run" ? (
                  <><Footprints className="h-2.5 w-2.5" /> Run</>
                ) : (
                  <><Folder className="h-2.5 w-2.5" /> Folder</>
                )}
              </span>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
              {getFolderIcon(folder.folder_type)}
            </div>
            <div className="text-center px-4">
              <h3 className="text-base font-bold text-foreground/80 truncate max-w-full">
                {folder.name}
              </h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {folder.item_count} item{folder.item_count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </button>
    </motion.div>
  );
}
