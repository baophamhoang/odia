import { notFound, redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { getRun } from "@/app/actions/runs";
import { NavBar } from "@/app/components/nav-bar";
import { RunDetail } from "./run-detail";

interface RunPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RunPageProps) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) return { title: "Run not found — Odia" };
  const label = run.title ?? `Run on ${run.run_date}`;
  return { title: `${label} — Odia` };
}

export default async function RunPage({ params }: RunPageProps) {
  const { id } = await params;

  const [session, run] = await Promise.all([auth(), getRun(id)]);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!run) {
    notFound();
  }

  const isOwner = session.user.id === run.created_by;

  return (
    <>
      <div className="md:pt-14">
        <RunDetail run={run} isOwner={isOwner} />
      </div>
      <NavBar />
    </>
  );
}
