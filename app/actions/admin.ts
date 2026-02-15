"use server";

import { auth } from "@/app/lib/auth";
import { supabase } from "@/app/lib/db";
import type { AllowedEmail, User, UserRole } from "@/app/lib/types";

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "admin") throw new Error("Forbidden: admin only");
  return session;
}

// ---------------------------------------------------------------------------
// getAllowedEmails — returns whitelist with joined user info
// ---------------------------------------------------------------------------

export interface AllowedEmailWithUser extends AllowedEmail {
  user: Pick<User, "id" | "name" | "avatar_url" | "role"> | null;
}

export async function getAllowedEmails(): Promise<AllowedEmailWithUser[]> {
  await requireAdminSession();

  const { data: emails, error } = await supabase
    .from("allowed_emails")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch allowed emails: ${error.message}`);
  if (!emails || emails.length === 0) return [];

  const emailAddresses = emails.map((e) => e.email);
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, name, avatar_url, role")
    .in("email", emailAddresses);

  if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

  const usersByEmail = new Map(
    (users ?? []).map((u) => [
      u.email,
      u as Pick<User, "id" | "name" | "avatar_url" | "role">,
    ])
  );

  return emails.map((email) => ({
    ...(email as AllowedEmail),
    user: usersByEmail.get(email.email) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// addAllowedEmail — just adds to the whitelist, no role
// ---------------------------------------------------------------------------

export async function addAllowedEmail(email: string): Promise<void> {
  const session = await requireAdminSession();

  const { error } = await supabase.from("allowed_emails").insert({
    email: email.toLowerCase().trim(),
    added_by: session.user.id,
  });

  if (error) {
    if (error.code === "23505") throw new Error("This email is already on the whitelist");
    throw new Error(`Failed to add email: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// updateUserRole — changes role on users table only
// ---------------------------------------------------------------------------

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  const session = await requireAdminSession();

  if (userId === session.user.id) {
    throw new Error("You cannot change your own role");
  }

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update user role: ${error.message}`);
}

// ---------------------------------------------------------------------------
// removeAllowedEmail
// ---------------------------------------------------------------------------

export async function removeAllowedEmail(emailId: string): Promise<void> {
  const session = await requireAdminSession();

  const { data: emailRow, error: fetchError } = await supabase
    .from("allowed_emails")
    .select("email")
    .eq("id", emailId)
    .single();

  if (fetchError || !emailRow) throw new Error(`Email not found: ${fetchError?.message}`);

  // Prevent self-removal
  const { data: currentUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", session.user.id)
    .single();

  if (currentUser && currentUser.email === emailRow.email) {
    throw new Error("You cannot remove your own email from the whitelist");
  }

  const { error } = await supabase.from("allowed_emails").delete().eq("id", emailId);
  if (error) throw new Error(`Failed to remove email: ${error.message}`);
}
