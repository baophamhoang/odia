"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { FolderPlus, Upload, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { requestUploadUrls } from "@/app/actions/photos";
import type { FolderType } from "@/app/lib/types";

interface FolderToolbarProps {
  folderId: string;
  folderType: FolderType;
  runId: string | null;
  onFolderCreated: () => void;
  onPhotosUploaded: () => void;
}

export function FolderToolbar({
  folderId,
  folderType,
  runId,
  onFolderCreated,
  onPhotosUploaded,
}: FolderToolbarProps) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/vault/folders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: folderId, name: folderName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      setFolderName("");
      setShowNewFolder(false);
      onFolderCreated();
    } catch (e) {
      console.error("Create folder error:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async (fileList: FileList) => {
    if (fileList.length === 0) return;
    // Copy to array immediately — FileList gets cleared when input resets
    const files = Array.from(fileList);
    setUploading(true);
    try {
      const fileInfos = files.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      }));
      const uploadSlots = await requestUploadUrls(fileInfos);

      // Upload files to R2
      await Promise.all(
        uploadSlots.map(async (slot, i) => {
          await fetch(slot.uploadUrl, {
            method: "PUT",
            body: files[i],
            headers: { "Content-Type": files[i].type },
          });
        })
      );

      // Link photos to the current folder
      const photoIds = uploadSlots.map((s) => s.photoId);
      await fetch(`/api/vault/folders/${folderId}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds }),
      });

      onPhotosUploaded();
    } catch (e) {
      console.error("Upload error:", e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewFolder(true)}
        >
          <FolderPlus className="h-4 w-4" />
          New Folder
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading..." : "Upload Photos"}
        </Button>

        {folderType === "run" && runId && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/runs/${runId}`}>
              <ExternalLink className="h-4 w-4" />
              View Run
            </Link>
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in the current directory.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewFolder(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!folderName.trim() || creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
