import Link from "next/link";
import { getRuns } from "@/app/actions/runs";
import { RunCard } from "@/app/components/run-card";
import { NavBar } from "@/app/components/nav-bar";

export default async function FeedPage() {
  const runs = await getRuns();

  return (
    <>
      <main className="max-w-xl mx-auto px-4 pt-4 md:pt-20 pb-20">
        <h1 className="text-2xl font-bold text-foreground mb-4">Runs</h1>

        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <p className="text-foreground-secondary text-base">
              No runs yet. Be the first to post one.
            </p>
            <Link
              href="/runs/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent-hover transition-colors active:scale-95"
            >
              Post a Run
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </main>

      <NavBar />
    </>
  );
}
