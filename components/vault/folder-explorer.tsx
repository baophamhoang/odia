"use client";

import { useState, useCallback } from "react";
import { PanelLeft } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FolderTree } from "@/components/vault/folder-tree";
import { FolderBrowser } from "@/components/vault/folder-browser";
import { FolderToolbar } from "@/components/vault/folder-toolbar";
import { Breadcrumbs } from "@/components/vault/breadcrumbs";
import { useFolderContents, useBreadcrumbs } from "@/app/lib/api";
import { mutate } from "swr";

export function FolderExplorer({ initialFolderId }: { initialFolderId?: string | null }) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId ?? null);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

  // Fetch contents/breadcrumbs for the selected folder
  const { data: contents } = useFolderContents(selectedFolderId);
  const { data: breadcrumbs } = useBreadcrumbs(
    selectedFolderId ?? contents?.folder?.id ?? null
  );

  const currentFolder = contents?.folder ?? null;
  const currentFolderId = selectedFolderId ?? currentFolder?.id ?? null;

  const handleNavigate = useCallback(
    (folderId: string) => {
      setSelectedFolderId(folderId);
      setMobileTreeOpen(false);
    },
    []
  );

  const handleRefresh = useCallback(() => {
    if (currentFolderId) {
      mutate(`/api/vault/folders/${currentFolderId}`);
      mutate(`/api/vault/folders/${currentFolderId}/children`);
    }
    mutate("/api/vault/folders");
  }, [currentFolderId]);

  return (
    <div className="flex gap-0 min-h-[500px]">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0 border-r border-border/40 overflow-y-auto">
        <FolderTree
          selectedId={currentFolderId}
          onSelect={handleNavigate}
        />
      </aside>

      {/* Right content panel */}
      <div className="flex-1 min-w-0">
        {/* Header: mobile tree toggle + breadcrumbs + toolbar */}
        <div className="flex flex-col gap-3 mb-6 px-1 md:px-4 pt-1">
          <div className="flex items-center gap-2">
            {/* Mobile tree toggle */}
            <Sheet open={mobileTreeOpen} onOpenChange={setMobileTreeOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="md:hidden shrink-0">
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="px-4 py-3 border-b border-border/40">
                  <SheetTitle className="text-sm">Folders</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto h-full">
                  <FolderTree
                    selectedId={currentFolderId}
                    onSelect={handleNavigate}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 min-w-0"
              >
                <Breadcrumbs items={breadcrumbs} onNavigate={handleNavigate} />
              </motion.div>
            )}
          </div>

          {/* Toolbar */}
          {currentFolderId && currentFolder && (
            <FolderToolbar
              folderId={currentFolderId}
              folderType={currentFolder.folder_type}
              runId={currentFolder.run_id}
              onFolderCreated={handleRefresh}
              onPhotosUploaded={handleRefresh}
            />
          )}
        </div>

        {/* Content */}
        <div className="px-1 md:px-4">
          <FolderBrowser
            folderId={selectedFolderId}
            onNavigate={handleNavigate}
            onPhotosChanged={handleRefresh}
          />
        </div>
      </div>
    </div>
  );
}
