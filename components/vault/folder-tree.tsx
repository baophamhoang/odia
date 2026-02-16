"use client";

import { useState, useCallback } from "react";
import { ChevronRight, Folder, Footprints, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFolderChildren, useFolderContents } from "@/app/lib/api";
import type { FolderWithMeta, FolderType } from "@/app/lib/types";

interface FolderTreeProps {
  selectedId: string | null;
  onSelect: (folderId: string) => void;
}

export function FolderTree({ selectedId, onSelect }: FolderTreeProps) {
  const { data: rootContents } = useFolderContents(null);
  const rootId = rootContents?.folder?.id ?? null;

  if (!rootContents || !rootId) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <nav className="p-2 text-sm select-none" role="tree">
      <TreeNode
        id={rootId}
        name="Vault"
        folderType="root"
        runId={null}
        depth={0}
        selectedId={selectedId}
        onSelect={onSelect}
        defaultExpanded
      />
    </nav>
  );
}

interface TreeNodeProps {
  id: string;
  name: string;
  folderType: FolderType;
  runId: string | null;
  depth: number;
  selectedId: string | null;
  onSelect: (folderId: string) => void;
  defaultExpanded?: boolean;
}

function TreeNode({
  id,
  name,
  folderType,
  runId,
  depth,
  selectedId,
  onSelect,
  defaultExpanded = false,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isSelected = selectedId === id;

  // Only fetch children when expanded
  const { data: children } = useFolderChildren(expanded ? id : null);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded((prev) => !prev);
    },
    []
  );

  const select = useCallback(() => {
    onSelect(id);
    if (!expanded) setExpanded(true);
  }, [id, onSelect, expanded]);

  const hasChildren = children === undefined || (children && children.length > 0);
  const Icon = getFolderTreeIcon(folderType, expanded);

  return (
    <div role="treeitem" aria-expanded={expanded} aria-selected={isSelected}>
      <div
        onClick={select}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 cursor-pointer transition-colors duration-150",
          isSelected
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          onClick={toggle}
          className={cn(
            "shrink-0 p-0.5 rounded hover:bg-accent/50 transition-transform duration-200",
            !hasChildren && "invisible"
          )}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              expanded && "rotate-90"
            )}
          />
        </button>

        <Icon className="h-4 w-4 shrink-0 opacity-60" />

        <span className="truncate text-[13px]">{name}</span>
      </div>

      {expanded && children && children.length > 0 && (
        <div role="group">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              id={child.id}
              name={child.name}
              folderType={child.folder_type}
              runId={child.run_id}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getFolderTreeIcon(folderType: FolderType, expanded: boolean) {
  switch (folderType) {
    case "run":
      return Footprints;
    default:
      return expanded ? FolderOpen : Folder;
  }
}
