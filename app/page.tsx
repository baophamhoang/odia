import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect("/feed");
  } else {
    redirect("/login");
  }
}
