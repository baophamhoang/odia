"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface HashtagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

function normalizeTag(raw: string): string {
  // Strip leading # and trim whitespace
  return raw.replace(/^#+/, "").trim().toLowerCase();
}

export function HashtagInput({ value, onChange }: HashtagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag) return;
    if (value.includes(tag)) return;
    onChange([...value, tag]);
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      // Remove last tag on backspace when input is empty
      onChange(value.slice(0, -1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Auto-add if user types comma or space at end
    if (raw.endsWith(",") || raw.endsWith(" ")) {
      addTag(raw.slice(0, -1));
    } else {
      setInputValue(raw);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? "Add hashtags..." : "Add more..."}
        className="
          w-full px-3 py-2.5 rounded-lg border border-border
          bg-surface text-foreground text-sm
          placeholder:text-foreground-secondary
          focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
          transition-colors
        "
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />

      {/* Tag chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-accent/10 text-accent rounded-full px-3 py-1 text-sm font-medium"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-accent/20 transition-colors"
                aria-label={`Remove #${tag}`}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <line x1="4" y1="4" x2="20" y2="20" />
                  <line x1="20" y1="4" x2="4" y2="20" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
