"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { FolderPlus, Upload, ExternalLink, Loader2, Trash2, Link2, Globe } from "lucide-react";
import { toast } from "sonner";
import { deleteFolder, createShareToken } from "@/app/actions/vault";
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

async function generateThumbnail(file: File, maxWidth = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.75,
      );
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

async function uploadWithConcurrency(
  slots: { uploadUrl: string; thumbUploadUrl: string; photoId: string }[],
  files: File[],
  limit = 5
) {
  let i = 0;
  const workers = Array(Math.min(limit, slots.length))
    .fill(null)
    .map(async () => {
      while (i < slots.length) {
        const idx = i++;
        await fetch(slots[idx].uploadUrl, {
          method: "PUT",
          body: files[idx],
          headers: { "Content-Type": files[idx].type },
        });
        // Upload thumbnail after original (fire-and-forget on error)
        generateThumbnail(files[idx])
          .then((blob) =>
            fetch(slots[idx].thumbUploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "image/jpeg" },
              body: blob,
            })
          )
          .catch(() => {});
      }
    });
  await Promise.all(workers);
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
  const [sharing, setSharing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCopyTeamLink() {
    const url = `${window.location.origin}/vault?tab=folders&folderId=${folderId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Team link copied!");
  }

  async function handleSharePublicly() {
    setSharing(true);
    try {
      const token = await createShareToken(folderId);
      const url = `${window.location.origin}/s/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Public link copied!");
    } catch {
      toast.error("Failed to generate share link");
    } finally {
      setSharing(false);
    }
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
    const files = Array.from(fileList);
    setUploading(true);
    try {
      const fileInfos = files.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      }));
      const uploadSlots = await requestUploadUrls(fileInfos);

      await uploadWithConcurrency(uploadSlots, files);

      const photoIds = uploadSlots.map((s) => s.photoId);
      await fetch(`/api/vault/folders/${folderId}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds }),
      });

      toast.success(`${files.length} photo${files.length !== 1 ? "s" : ""} uploaded`);
      onPhotosUploaded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
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

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyTeamLink}
        >
          <Link2 className="h-4 w-4" />
          Copy Team Link
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSharePublicly}
          disabled={sharing}
        >
          {sharing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          Share Publicly
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
