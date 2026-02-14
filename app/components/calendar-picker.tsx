"use client";

import { useState } from "react";

interface CalendarPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toLocalDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

export function CalendarPicker({ value, onChange }: CalendarPickerProps) {
  // Parse the current value to determine focused year/month
  const parsedDate = value ? new Date(value + "T00:00:00") : new Date();
  const today = new Date();

  const [viewYear, setViewYear] = useState(
    parsedDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    parsedDate.getMonth()
  );

  const todayStr = toLocalDateString(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Fill leading empty cells
  const gridCells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (gridCells.length % 7 !== 0) {
    gridCells.push(null);
  }

  const handleDayClick = (day: number) => {
    const dateStr = toLocalDateString(viewYear, viewMonth, day);
    onChange(dateStr);
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 w-full max-w-xs mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-secondary hover:bg-border hover:text-foreground transition-colors"
          aria-label="Previous month"
        >
          <ChevronIcon direction="left" />
        </button>

        <h2 className="text-sm font-semibold text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </h2>

        <button
          type="button"
          onClick={goToNextMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-secondary hover:bg-border hover:text-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-[11px] font-medium text-foreground-secondary"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {gridCells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-8" />;
          }

          const dateStr = toLocalDateString(viewYear, viewMonth, day);
          const isSelected = dateStr === value;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDayClick(day)}
              aria-label={`${MONTHS[viewMonth]} ${day}, ${viewYear}`}
              aria-pressed={isSelected}
              className={`
                h-8 w-full rounded-lg text-sm font-medium transition-colors
                flex items-center justify-center
                ${
                  isSelected
                    ? "bg-accent text-white"
                    : isToday
                    ? "ring-2 ring-accent text-accent font-semibold hover:bg-accent/10"
                    : "text-foreground hover:bg-border"
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
