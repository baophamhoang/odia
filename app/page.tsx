import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { LandingPage } from "./landing";

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect("/vault");
  }

  return <LandingPage />;
}
