"use client";

import { ChevronRight, Home } from "lucide-react";
import type { BreadcrumbItem } from "@/app/lib/types";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate?: (folderId: string) => void;
}

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  const showCollapsed = items.length > 3;

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto scrollbar-none">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isRoot = item.folder_type === "root";
        const isCollapsed =
          showCollapsed && index > 0 && index < items.length - 1;

        return (
          <span key={item.id} className="flex items-center gap-1 shrink-0">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}

            {isCollapsed && (
              <span className="sm:hidden text-muted-foreground/50">&hellip;</span>
            )}

            <span className={isCollapsed ? "hidden sm:inline" : ""}>
              {isLast ? (
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  {isRoot ? (
                    <Home className="h-3.5 w-3.5 inline -mt-0.5" />
                  ) : (
                    item.name
                  )}
                </span>
              ) : (
                <button
                  onClick={() => onNavigate?.(item.id)}
                  className="text-muted-foreground/70 hover:text-foreground transition-colors duration-200 truncate max-w-[150px]"
                >
                  {isRoot ? (
                    <Home className="h-3.5 w-3.5 inline -mt-0.5" />
                  ) : (
                    item.name
                  )}
                </button>
              )}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
