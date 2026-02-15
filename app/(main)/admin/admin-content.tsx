"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  addAllowedEmail,
  removeAllowedEmail,
  updateUserRole,
  type AllowedEmailWithUser,
} from "@/app/actions/admin";
import { AdminSkeleton } from "@/components/skeleton";
import type { UserRole } from "@/app/lib/types";
import type { KeyedMutator } from "swr";

interface AdminContentProps {
  emails: AllowedEmailWithUser[];
  isLoading?: boolean;
  mutate?: KeyedMutator<AllowedEmailWithUser[]>;
}

export function AdminContent({ emails, isLoading, mutate }: AdminContentProps) {
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AllowedEmailWithUser | null>(
    null
  );

  async function handleAdd() {
    if (!newEmail.trim()) return;
    setIsAdding(true);
    try {
      await addAllowedEmail(newEmail);
      toast.success(`Added ${newEmail}`);
      setNewEmail("");
      mutate?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add email"
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove() {
    if (!deleteTarget) return;
    try {
      await removeAllowedEmail(deleteTarget.id);
      toast.success(`Removed ${deleteTarget.email}`);
      setDeleteTarget(null);
      mutate?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove email"
      );
    }
  }

  async function handleRoleChange(
    emailRow: AllowedEmailWithUser,
    role: UserRole
  ) {
    if (!emailRow.user) return;
    try {
      await updateUserRole(emailRow.user.id, role);
      toast.success(`Updated ${emailRow.email} to ${role}`);
      mutate?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  }

  if (isLoading) return <AdminSkeleton />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage who can access the vault
        </p>
      </div>

      {/* Add email form */}
      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 mb-8">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
          <UserPlus className="h-4 w-4" />
          Invite someone
        </h2>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            disabled={isAdding}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={isAdding || !newEmail.trim()}>
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Add
          </Button>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Email list */}
      <div className="space-y-2">
        {emails.map((emailRow) => (
          <div
            key={emailRow.id}
            className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 transition-colors hover:bg-card"
          >
            {emailRow.user ? (
              <Avatar className="h-10 w-10">
                <AvatarImage src={emailRow.user.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {emailRow.user.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">?</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {emailRow.user?.name ?? emailRow.email}
                </span>
                {emailRow.user ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-500/10 text-emerald-500 border-0"
                  >
                    Active
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-muted-foreground"
                  >
                    Pending
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {emailRow.user?.name ? emailRow.email + " · " : ""}
                Added {format(parseISO(emailRow.created_at), "MMM d, yyyy")}
              </div>
            </div>

            {/* Role — only changeable for signed-up users */}
            {emailRow.user ? (
              <Select
                value={emailRow.user.role}
                onValueChange={(v) =>
                  handleRoleChange(emailRow, v as UserRole)
                }
                disabled={false}
              >
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-muted-foreground w-28 text-center">
                —
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => setDeleteTarget(emailRow)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {emails.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No one here yet</p>
            <p className="text-sm mt-1">Invite your crew above</p>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove access?</DialogTitle>
            <DialogDescription>
              Remove <strong>{deleteTarget?.email}</strong> from the team? They
              won&apos;t be able to sign in anymore.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
