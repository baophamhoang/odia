"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { User } from "@/app/lib/types";

interface MemberChipsProps {
  members: User[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MemberChips({ members, selected, onChange }: MemberChipsProps) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  if (members.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-medium mb-2 text-muted-foreground">
        Tag members
      </p>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => {
          const isSelected = selected.includes(member.id);
          return (
            <button
              key={member.id}
              onClick={() => toggle(member.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className="text-[8px]">
                  {member.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              {member.name ?? member.email}
            </button>
          );
        })}
      </div>
    </div>
  );
}
