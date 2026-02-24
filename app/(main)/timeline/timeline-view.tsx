"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TimelineSkeleton } from "@/components/skeleton";
import { PhotoViewer } from "@/components/photo-viewer";
import type { RunCard, Photo } from "@/app/lib/types";

interface TimelineViewProps {
  runs: RunCard[];
  isLoading?: boolean;
  isRefreshing?: boolean;
}

export function TimelineView({ runs, isLoading, isRefreshing }: TimelineViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date())
  );
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number; runLink: string } | null>(null);

  const runsByDate = useMemo(() => {
    const map = new Map<string, RunCard[]>();
    for (const run of runs) {
      const existing = map.get(run.run_date) ?? [];
      existing.push(run);
      map.set(run.run_date, existing);
    }
    return map;
  }, [runs]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-40 rounded-lg bg-muted/30 animate-pulse" />
            <div className="h-4 w-16 rounded-lg bg-muted/20 animate-pulse mt-2" />
          </div>
        </div>
        <TimelineSkeleton />
      </div>
    );
  }

  return (
    <div>
      {isRefreshing && !isLoading && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Refreshing…
        </div>
      )}

      {/* Month header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {format(currentMonth, "MMMM")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(currentMonth, "yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={() => setCurrentMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="grid grid-cols-7 gap-px bg-border/50">
          {/* Weekday headers */}
          {weekDays.map((day, i) => (
            <div
              key={`${day}-${i}`}
              className="bg-card/80 px-2 py-2.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-widest"
            >
              {day}
            </div>
          ))}

          {/* Empty cells */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-background/80 min-h-[90px] sm:min-h-[110px]" />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayRuns = runsByDate.get(dateStr);
            const hasRuns = !!dayRuns && dayRuns.length > 0;
            const isExpanded = expandedDate === dateStr;
            const today = isToday(day);

            return (
              <button
                key={dateStr}
                className={cn(
                  "bg-background/80 min-h-[90px] sm:min-h-[110px] p-1.5 text-left transition-all duration-200 relative",
                  hasRuns && "cursor-pointer hover:bg-accent/20",
                  isExpanded && "bg-accent/10 ring-1 ring-inset ring-accent/20",
                  !hasRuns && "cursor-default"
                )}
                onClick={() => {
                  if (hasRuns) setExpandedDate(isExpanded ? null : dateStr);
                }}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs transition-colors",
                    today &&
                      "bg-white text-black font-bold",
                    !today && !hasRuns && "text-muted-foreground/70",
                    !today && hasRuns && "text-foreground font-medium"
                  )}
                >
                  {format(day, "d")}
                </span>

                {hasRuns && (
                  <>
                    <div className="mt-1 grid grid-cols-2 gap-0.5">
                      {dayRuns
                        .flatMap((r) => r.photos)
                        .slice(0, 4)
                        .map((photo) => (
                          <div
                            key={photo.id}
                            className="relative aspect-square rounded-[3px] overflow-hidden"
                          >
                            <Image
                              src={photo.url ?? ""}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="60px"
                            />
                          </div>
                        ))}
                    </div>
                    <div className="absolute top-1.5 right-1.5">
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/80">
                        <Camera className="h-2.5 w-2.5" />
                        {dayRuns.reduce((sum, r) => sum + r.photo_count, 0)}
                      </span>
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded day view */}
      <AnimatePresence>
        {expandedDate && runsByDate.get(expandedDate) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="mt-4 overflow-hidden"
          >
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5">
              <h2 className="text-base font-semibold mb-4 text-muted-foreground">
                {format(parseISO(expandedDate), "EEEE, MMMM d")}
              </h2>
              <div className="space-y-6">
                {runsByDate.get(expandedDate)!.map((run) => {
                  const runPhotos = run.photos;
                  return (
                    <div key={run.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        {run.title && (
                          <span className="font-medium">{run.title}</span>
                        )}
                        {run.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {run.location}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/80 ml-auto">
                          {run.photo_count} photo
                          {run.photo_count !== 1 ? "s" : ""}
                        </span>
                        <Link
                          href={`/runs/${run.id}`}
                          className="text-xs text-primary hover:underline shrink-0"
                        >
                          View run →
                        </Link>
                      </div>

                      {runPhotos.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                          {runPhotos.map((photo, photoIndex) => (
                            <button
                              key={photo.id}
                              onClick={() =>
                                setViewer({
                                  photos: runPhotos,
                                  index: photoIndex,
                                  runLink: `/runs/${run.id}`,
                                })
                              }
                              className="relative h-28 w-28 sm:h-36 sm:w-36 shrink-0 rounded-xl overflow-hidden cursor-pointer"
                            >
                              <Image
                                src={photo.url ?? ""}
                                alt=""
                                fill
                                className="object-cover hover:scale-105 transition-transform duration-500"
                                sizes="144px"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {run.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {run.hashtags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[10px] text-muted-foreground border-border/50"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {runs.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-lg text-muted-foreground">No runs yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Upload photos from the vault to see them here
          </p>
        </div>
      )}

      {viewer && (
        <PhotoViewer
          photos={viewer.photos}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
          runLink={viewer.runLink}
        />
      )}
    </div>
  );
}
