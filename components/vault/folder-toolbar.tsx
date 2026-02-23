"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { FolderPlus, Upload, ExternalLink, Loader2, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { deleteFolder } from "@/app/actions/vault";
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
  folderName: string;
  runId: string | null;
  onFolderCreated: () => void;
  onPhotosUploaded: () => void;
  onFolderDeleted?: () => void;
}

export function FolderToolbar({
  folderId,
  folderType,
  folderName,
  runId,
  onFolderCreated,
  onPhotosUploaded,
  onFolderDeleted,
}: FolderToolbarProps) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteFolder, setShowDeleteFolder] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCopyLink() {
    navigator.clipboard.writeText(
      `${window.location.origin}/vault?tab=folders&folderId=${folderId}`
    );
    toast.success("Link copied!");
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/vault/folders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: folderId, name: newFolderName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      setNewFolderName("");
      setShowNewFolder(false);
      onFolderCreated();
    } catch (e) {
      console.error("Create folder error:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFolder = async () => {
    setDeleting(true);
    try {
      await deleteFolder(folderId);
      toast.success("Folder deleted");
      setShowDeleteFolder(false);
      onFolderDeleted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete folder");
    } finally {
      setDeleting(false);
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

        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <Link2 className="h-4 w-4" />
          Copy Link
        </Button>

        {folderType === "run" && runId && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/runs/${runId}`}>
              <ExternalLink className="h-4 w-4" />
              View Run
            </Link>
          </Button>
        )}

        {folderType === "custom" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteFolder(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Folder
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

      {/* Delete Folder Dialog */}
      <Dialog open={showDeleteFolder} onOpenChange={setShowDeleteFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &quot;{folderName}&quot;?</DialogTitle>
            <DialogDescription>
              This will permanently delete this folder, all its subfolders, and all
              photos inside them. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteFolder(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
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
              disabled={!newFolderName.trim() || creating}
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
