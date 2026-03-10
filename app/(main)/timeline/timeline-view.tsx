"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { format, parseISO } from "date-fns";
import { MapPin, Camera, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimelineSkeleton } from "@/components/skeleton";
import type { RunCard } from "@/app/lib/types";

interface TimelineViewProps {
  runs: RunCard[];
  isLoading?: boolean;
  isRefreshing?: boolean;
}

interface MonthGroup {
  label: string;
  runs: RunCard[];
}

export function TimelineView({ runs, isLoading, isRefreshing }: TimelineViewProps) {
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, RunCard[]>();
    for (const run of runs) {
      const key = run.run_date.slice(0, 7); // "yyyy-MM"
      const group = map.get(key) ?? [];
      group.push(run);
      map.set(key, group);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, monthRuns]) => ({
        label: format(parseISO(`${key}-01`), "MMMM yyyy"),
        runs: monthRuns,
      }));
  }, [runs]);

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-48 rounded-lg bg-muted/30 animate-pulse mb-8" />
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

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          {runs.length} run{runs.length !== 1 ? "s" : ""}
        </p>
      </div>

      {runs.length === 0 && (
        <div className="text-center py-24">
          <p className="text-lg text-muted-foreground">No runs yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Upload photos from the vault to see them here
          </p>
        </div>
      )}

      <div className="space-y-12">
        {monthGroups.map((group, gi) => (
          <div key={group.label}>
            {/* Sticky month divider */}
            <div className="sticky top-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2.5 mb-6 bg-background/90 backdrop-blur-sm border-b border-border/40">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </h2>
            </div>

            <div className="space-y-6">
              {group.runs.map((run, ri) => (
                <RunCard
                  key={run.id}
                  run={run}
                  delay={gi * 0.05 + ri * 0.04}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunCard({ run, delay }: { run: RunCard; delay: number }) {
  const coverPhoto = run.photos[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/runs/${run.id}`}
        className="group flex gap-4 sm:gap-5 rounded-2xl p-3 sm:p-4 hover:bg-accent/40 transition-colors duration-200"
      >
        {/* Cover photo */}
        <div className="shrink-0 relative h-20 w-20 sm:h-24 sm:w-24 rounded-xl overflow-hidden bg-muted/30">
          {coverPhoto ? (
            <Image
              src={coverPhoto.url ?? ""}
              alt={run.title ?? "Run"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="96px"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Camera className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          {/* Date */}
          <time className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            {format(parseISO(run.run_date), "EEE, MMM d")}
          </time>

          {/* Title */}
          {run.title && (
            <h3 className="font-semibold text-foreground/90 truncate leading-tight">
              {run.title}
            </h3>
          )}

          {/* Location */}
          {run.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/70 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {run.location}
            </span>
          )}

          {/* Participants + photo count */}
          <div className="flex items-center gap-3 mt-0.5">
            {run.participants.length > 0 && (
              <div className="flex -space-x-1.5">
                {run.participants.slice(0, 4).map((p) => (
                  <Avatar key={p.id} className="h-5 w-5 border border-background">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[7px] bg-accent">
                      {p.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {run.participants.length > 4 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-muted text-[7px] font-medium">
                    +{run.participants.length - 4}
                  </span>
                )}
              </div>
            )}

            {run.photo_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                <Camera className="h-3 w-3" />
                {run.photo_count}
              </span>
            )}

            {run.hashtags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-muted-foreground/60 border-border/50 hidden sm:inline-flex"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
