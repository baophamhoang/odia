"use client";

import Image from "next/image";
import { User } from "@/app/lib/types";

interface MemberTagsProps {
  members: User[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

function MemberChip({
  user,
  isSelected,
  onToggle,
}: {
  user: User;
  isSelected: boolean;
  onToggle: () => void;
}) {
  console.log('user :>> ', user);
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
        text-sm font-medium transition-colors border
        ${
          isSelected
            ? "bg-accent text-white border-accent"
            : "bg-surface text-foreground border-border hover:border-accent/40"
        }
      `}
    >
      {/* Avatar */}
      <span
        className={`
          w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center
          text-[10px] font-bold overflow-hidden
          ${isSelected ? "bg-white/20" : "bg-accent/10"}
        `}
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.name ?? "User"}
            width={20}
            height={20}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span className={isSelected ? "text-white" : "text-accent"}>
            {initial}
          </span>
        )}
      </span>

      {/* Name */}
      <span className="max-w-[120px] truncate">
        {user.name ?? user.email.split("@")[0]}
      </span>
    </button>
  );
}

export function MemberTags({ members, selected, onChange }: MemberTagsProps) {
  const handleToggle = (userId: string) => {
    if (selected.includes(userId)) {
      onChange(selected.filter((id) => id !== userId));
    } else {
      onChange([...selected, userId]);
    }
  };

  if (members.length === 0) {
    return (
      <p className="text-foreground-secondary text-sm">No members available.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Select members">
      {members.map((member) => (
        <MemberChip
          key={member.id}
          user={member}
          isSelected={selected.includes(member.id)}
          onToggle={() => handleToggle(member.id)}
        />
      ))}
    </div>
  );
}
