"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import {
  motion,
  useMotionValue,
  useSpring,
  useInView,
  animate,
} from "motion/react";
import { APP_NAME, CLUB_NAME } from "@/app/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split a string into individual letter spans for stagger animation. */
function LetterReveal({
  text,
  className,
  delay = 0,
  duration = 0.06,
}: {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const letters = Array.from(text);
  return (
    <span className={className} aria-label={text}>
      {letters.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40, rotateX: -90, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
          transition={{
            delay: delay + i * duration,
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block"
          style={{ transformOrigin: "bottom center" }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

/** Animates a number counting up when it scrolls into view. */
function AnimatedCounter({
  target,
  suffix = "",
  duration = 2,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Decorative photo frame — fills with a CSS gradient texture
// ---------------------------------------------------------------------------
function PhotoFrame({
  className,
  rotate,
  delay,
  gradient,
}: {
  className?: string;
  rotate: number;
  delay: number;
  gradient: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: rotate * 0.5 }}
      animate={{ opacity: 1, scale: 1, rotate }}
      transition={{ delay, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute rounded-2xl overflow-hidden ${className}`}
      style={{
        background: gradient,
        boxShadow:
          "0 25px 60px -15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      {/* Inner shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
      {/* Photo placeholder strips */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 gap-1.5">
        <div className="h-1.5 rounded-full bg-white/10 w-3/4" />
        <div className="h-1.5 rounded-full bg-white/10 w-1/2" />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Animated gradient orb
// ---------------------------------------------------------------------------
function Orb({
  className,
  color,
  delay = 0,
}: {
  className?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      style={{ background: color }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: [0, 0.6, 0.4, 0.6],
        scale: [0.6, 1, 1.08, 1],
        x: ["0%", "4%", "-3%", "0%"],
        y: ["0%", "-5%", "3%", "0%"],
      }}
      transition={{
        delay,
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.3, 0.7, 1],
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Google icon SVG (inline so no extra dependency)
// ---------------------------------------------------------------------------
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function LandingPage() {
  // ---- Cursor-following glow ----
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 80, damping: 20 });
  const springY = useSpring(cursorY, { stiffness: 80, damping: 20 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      cursorX.set(e.clientX - rect.left);
      cursorY.set(e.clientY - rect.top);
    },
    [cursorX, cursorY]
  );

  // ---- Scroll-based parallax for hero strip ----
  const heroRef = useRef<HTMLDivElement>(null);

  // ---- Horizontal scroll strip animation ----
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stripRef.current) return;
    const el = stripRef.current;
    // Continuously scroll the strip
    let rafId: number;
    let offset = 0;
    function tick() {
      offset += 0.4;
      const totalWidth = el.scrollWidth / 2;
      if (offset >= totalWidth) offset = 0;
      el.style.transform = `translateX(-${offset}px)`;
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ---- Stats section in-view ref ----
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-80px" });

  // Photo strip frames (colour swatches simulating photos)
  const stripItems = [
    { bg: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", w: 200, h: 280 },
    { bg: "linear-gradient(135deg,#2d1b69 0%,#11998e 100%)", w: 160, h: 220 },
    { bg: "linear-gradient(135deg,#f7971e 0%,#ffd200 100%)", w: 180, h: 260 },
    { bg: "linear-gradient(135deg,#cc2b5e 0%,#753a88 100%)", w: 220, h: 300 },
    { bg: "linear-gradient(135deg,#43cea2 0%,#185a9d 100%)", w: 170, h: 240 },
    { bg: "linear-gradient(135deg,#f953c6 0%,#b91d73 100%)", w: 190, h: 270 },
    { bg: "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)", w: 155, h: 215 },
    { bg: "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)", w: 210, h: 290 },
    { bg: "linear-gradient(135deg,#fa709a 0%,#fee140 100%)", w: 175, h: 250 },
    { bg: "linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)", w: 185, h: 265 },
  ];
  // Duplicate for seamless loop
  const allStrip = [...stripItems, ...stripItems];

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-background text-foreground select-none"
      onMouseMove={handleMouseMove}
      ref={heroRef}
    >
      {/* ================================================================
          CURSOR GLOW
      ================================================================ */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-50 hidden md:block"
        aria-hidden="true"
      >
        <motion.div
          className="absolute rounded-full"
          style={{
            x: springX,
            y: springY,
            translateX: "-50%",
            translateY: "-50%",
            width: 400,
            height: 400,
            background:
              "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.06) 50%, transparent 70%)",
            filter: "blur(1px)",
          }}
        />
      </motion.div>

      {/* ================================================================
          ANIMATED GRADIENT ORBS
      ================================================================ */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Primary violet orb */}
        <Orb
          className="w-[600px] h-[600px] -top-48 -left-32"
          color="radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(124,58,237,0.1) 50%, transparent 70%)"
          delay={0}
        />
        {/* Warm amber orb */}
        <Orb
          className="w-[500px] h-[500px] -top-16 -right-48"
          color="radial-gradient(circle, rgba(251,146,60,0.25) 0%, rgba(251,146,60,0.08) 50%, transparent 70%)"
          delay={1.5}
        />
        {/* Cool blue orb */}
        <Orb
          className="w-[700px] h-[700px] top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2"
          color="radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 60%)"
          delay={3}
        />
        {/* Pink accent orb */}
        <Orb
          className="w-[400px] h-[400px] bottom-0 right-0"
          color="radial-gradient(circle, rgba(236,72,153,0.2) 0%, rgba(236,72,153,0.06) 50%, transparent 70%)"
          delay={2}
        />

        {/* Light-mode specific orbs (more pastel) */}
        <div className="dark:hidden">
          <Orb
            className="w-[500px] h-[500px] -top-32 -left-24"
            color="radial-gradient(circle, rgba(167,139,250,0.25) 0%, rgba(167,139,250,0.08) 50%, transparent 70%)"
            delay={0}
          />
          <Orb
            className="w-[400px] h-[400px] top-1/3 -right-32"
            color="radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 60%)"
            delay={2}
          />
        </div>
      </div>

      {/* ================================================================
          FILM-GRAIN TEXTURE
      ================================================================ */}
      <div
        className="absolute inset-0 z-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ================================================================
          HORIZONTAL PHOTO STRIP (blurred background band)
      ================================================================ */}
      <div
        className="absolute top-0 left-0 right-0 h-[55vh] overflow-hidden pointer-events-none"
        aria-hidden="true"
        style={{ zIndex: 0 }}
      >
        {/* Faded, blurred photo strip */}
        <div className="absolute inset-0 scale-110 overflow-hidden opacity-[0.18] dark:opacity-[0.12]">
          <div
            ref={stripRef}
            className="flex gap-4 items-end pb-8 will-change-transform"
            style={{ width: "max-content" }}
          >
            {allStrip.map((item, i) => (
              <div
                key={i}
                className="flex-shrink-0 rounded-2xl"
                style={{
                  width: item.w,
                  height: item.h,
                  background: item.bg,
                }}
              />
            ))}
          </div>
        </div>
        {/* Gradient masks to blend strip edges */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-background to-transparent" />
      </div>

      {/* ================================================================
          DECORATIVE FLOATING PHOTO FRAMES
      ================================================================ */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
        style={{ zIndex: 1 }}
      >
        <PhotoFrame
          className="w-44 h-60 top-[8%] left-[4%] opacity-30 dark:opacity-20"
          rotate={-7}
          delay={0.8}
          gradient="linear-gradient(135deg,#1e3a5f 0%,#4a90d9 100%)"
        />
        <PhotoFrame
          className="w-36 h-48 top-[12%] right-[6%] opacity-25 dark:opacity-15"
          rotate={5}
          delay={1.1}
          gradient="linear-gradient(135deg,#6d28d9 0%,#db2777 100%)"
        />
        <PhotoFrame
          className="w-40 h-52 top-[55%] left-[2%] opacity-20 dark:opacity-10"
          rotate={10}
          delay={1.4}
          gradient="linear-gradient(135deg,#064e3b 0%,#10b981 100%)"
        />
        <PhotoFrame
          className="w-32 h-44 bottom-[18%] right-[4%] opacity-20 dark:opacity-10"
          rotate={-4}
          delay={1.2}
          gradient="linear-gradient(135deg,#7c2d12 0%,#f97316 100%)"
        />
        <PhotoFrame
          className="w-28 h-36 bottom-[10%] left-[30%] opacity-15 dark:opacity-10"
          rotate={6}
          delay={1.6}
          gradient="linear-gradient(135deg,#312e81 0%,#7c3aed 100%)"
        />
        <PhotoFrame
          className="w-36 h-48 top-[38%] right-[2%] opacity-15 dark:opacity-10"
          rotate={-9}
          delay={1.8}
          gradient="linear-gradient(135deg,#881337 0%,#f43f5e 100%)"
        />
      </div>

      {/* ================================================================
          MAIN CONTENT
      ================================================================ */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ---- HERO SECTION ---- */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-12 text-center">
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-violet-400/20 dark:border-violet-400/20 bg-violet-50/80 dark:bg-violet-950/40 backdrop-blur-md px-5 py-2 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-700 dark:text-violet-300">
              {CLUB_NAME} Photo Vault
            </span>
          </motion.div>

          {/* ---- App name — huge display ---- */}
          <div className="mb-4 overflow-hidden" style={{ perspective: 800 }}>
            <h1
              className="text-[clamp(5rem,18vw,14rem)] font-black leading-none tracking-tight"
              aria-label={APP_NAME}
            >
              <LetterReveal
                text={APP_NAME}
                delay={0.3}
                duration={0.07}
                className="bg-clip-text text-transparent bg-gradient-to-br from-violet-600 via-pink-500 to-amber-400 dark:from-violet-300 dark:via-pink-300 dark:to-amber-200"
              />
            </h1>
          </div>

          {/* Subtitle word reveal */}
          <div className="overflow-hidden mb-2" style={{ perspective: 600 }}>
            <h2 className="text-[clamp(1.1rem,3.5vw,2.2rem)] font-light tracking-tight text-slate-700 dark:text-white/80">
              {["Every", "mile.", "Every", "memory."].map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 30, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    delay: 0.8 + i * 0.1,
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block mr-[0.3em]"
                >
                  {word}
                </motion.span>
              ))}
            </h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 text-base sm:text-lg text-slate-500 dark:text-white/40 font-light max-w-sm leading-relaxed"
          >
            {CLUB_NAME}&apos;s run photos, safe and{" "}
            <span className="text-slate-700 dark:text-white/70 font-medium">
              beautifully organised
            </span>
            .
          </motion.p>

          {/* ---- CTA BUTTON — premium glass ---- */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10"
          >
            <button
              onClick={() => signIn("google", { callbackUrl: "/vault" })}
              className={[
                "group relative inline-flex items-center gap-3 rounded-full",
                "px-7 py-3.5 text-sm font-semibold",
                // Glass base
                "border border-slate-300/60 dark:border-white/10",
                "bg-white/70 dark:bg-white/[0.06]",
                "backdrop-blur-xl",
                // Text
                "text-slate-800 dark:text-white",
                // Glow + shadow
                "shadow-[0_4px_32px_-4px_rgba(124,58,237,0.18)] dark:shadow-[0_4px_32px_-4px_rgba(124,58,237,0.35)]",
                // Hover
                "hover:border-violet-400/60 dark:hover:border-violet-400/40",
                "hover:shadow-[0_8px_48px_-4px_rgba(124,58,237,0.35)] dark:hover:shadow-[0_8px_48px_-4px_rgba(124,58,237,0.55)]",
                "hover:bg-white/90 dark:hover:bg-white/[0.1]",
                "hover:scale-[1.03]",
                // Active
                "active:scale-[0.97]",
                // Transitions
                "transition-all duration-300 ease-out",
              ].join(" ")}
            >
              {/* Inner highlight shimmer */}
              <span
                className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(105deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
                }}
              />

              <GoogleIcon className="w-5 h-5 relative z-10" />

              <span className="relative z-10 tracking-wide">
                Continue with Google
              </span>

              {/* Arrow with animated slide */}
              <motion.span
                className="relative z-10 text-slate-400 dark:text-white/30 group-hover:text-violet-500 dark:group-hover:text-violet-300 transition-colors duration-300"
                initial={false}
                whileHover={{ x: 2 }}
              >
                &rarr;
              </motion.span>
            </button>
          </motion.div>

          {/* Invite notice */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.9, duration: 0.5 }}
            className="mt-5 text-[11px] tracking-wide text-slate-400/60 dark:text-white/20 uppercase font-medium"
          >
            Invite-only &middot; You need to be on the team list
          </motion.p>
        </section>

        {/* ================================================================
            DIVIDER LINE
        ================================================================ */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 2.0, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-[1px] h-16 bg-gradient-to-b from-transparent via-slate-300 dark:via-white/20 to-transparent origin-top"
        />

        {/* ================================================================
            STATS SECTION
        ================================================================ */}
        <section
          ref={statsRef}
          className="px-6 pb-24 pt-4 flex flex-col items-center gap-16"
        >
          {/* Section label */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-400/80 dark:text-white/30"
          >
            Built for running crews
          </motion.p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-16 text-center">
            {[
              {
                value: 100,
                suffix: "%",
                label: "Private",
                description: "Only your crew",
              },
              {
                value: 0,
                suffix: " ads",
                label: "Ad-free",
                description: "Pure experience",
              },
              {
                value: 1,
                suffix: " vault",
                label: "One place",
                description: "All your runs",
              },
              {
                value: 0,
                suffix: " limits",
                label: "No caps",
                description: "Upload freely",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 24 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: i * 0.1,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex flex-col items-center gap-1"
              >
                <div className="text-3xl sm:text-4xl font-black tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-500 dark:from-white dark:to-white/50">
                  <AnimatedCounter
                    target={stat.value}
                    suffix={stat.suffix}
                    duration={1.5}
                  />
                </div>
                <div className="text-xs font-semibold tracking-widest uppercase text-violet-600 dark:text-violet-400">
                  {stat.label}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-white/30">
                  {stat.description}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center justify-center gap-3 max-w-lg"
          >
            {[
              "Upload & share instantly",
              "Organised by run date",
              "Download in bulk",
              "Tag your running crew",
              "No storage limits",
            ].map((feat, i) => (
              <motion.span
                key={feat}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={statsInView ? { opacity: 1, scale: 1 } : {}}
                transition={{
                  delay: 0.5 + i * 0.07,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-white/50 backdrop-blur-sm"
              >
                <span className="w-1 h-1 rounded-full bg-violet-400 dark:bg-violet-500" />
                {feat}
              </motion.span>
            ))}
          </motion.div>
        </section>
      </div>

      {/* ================================================================
          BOTTOM GRADIENT FADE
      ================================================================ */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent z-[2]"
        aria-hidden="true"
      />

      {/* ================================================================
          SUBTLE GRID OVERLAY (fashion editorial texture)
      ================================================================ */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.015] dark:opacity-[0.025]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
    </div>
  );
}
