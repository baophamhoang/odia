"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "motion/react";
import { APP_NAME, CLUB_NAME } from "@/app/lib/constants";

function LoginCard() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const isAccessDenied =
    error === "AccessDenied" ||
    error === "access_denied" ||
    error === "not_whitelisted";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Atmospheric background — deep purple in dark, warm in light */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.15),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.25),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(251,146,60,0.1),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_right,rgba(251,146,60,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08),transparent_40%)] dark:bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_40%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm text-center"
        >
          <h1 className="text-5xl font-bold tracking-tighter mb-2">
            {APP_NAME}
          </h1>
          <p className="text-xs text-muted-foreground/40 font-medium uppercase tracking-widest mb-1">
            {CLUB_NAME}
          </p>
          <p className="text-sm text-muted-foreground/60 mb-10">
            Sign in to continue
          </p>

          {isAccessDenied && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border-l-4 border-l-destructive border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              We don&apos;t recognize your email. Please contact the leader to be added to the whitelist.
            </motion.div>
          )}

          <button
            onClick={() => signIn("google", { callbackUrl: searchParams.get("redirectTo") || "/vault" })}
            className="group relative inline-flex w-full items-center justify-center gap-3 rounded-full border border-border/50 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] backdrop-blur-xl text-foreground px-6 py-4 text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 active:scale-[0.98]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-5 h-5"
            >
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <p className="mt-6 text-xs text-muted-foreground/30">
            Invite-only &middot; You need to be on the team list
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-muted-foreground/30 text-sm">Loading...</div>
        </div>
      }
    >
      <LoginCard />
    </Suspense>
  );
}
