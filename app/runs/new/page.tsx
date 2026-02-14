import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { getTeamMembers } from "@/app/actions/users";
import { CreateRunForm } from "./create-run-form";
import { APP_NAME } from "@/app/lib/constants";

export const metadata = {
  title: `New Run — ${APP_NAME}`,
};

export default async function NewRunPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const members = await getTeamMembers();

  return (
    <CreateRunForm
      members={members}
      currentUserId={session.user.id}
    />
  );
}
