"use server";

import { auth } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { allowedEmails as allowedEmailsTable, users as usersTable } from "@/app/lib/schema";
import { eq, inArray, desc, and, ne } from "drizzle-orm";
import { WHITELIST_BYPASS_EMAIL } from "@/app/lib/constants";
import type { AllowedEmail, User, UserRole } from "@/app/lib/types";

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "admin") throw new Error("Forbidden: admin only");
  return session;
}

// ---------------------------------------------------------------------------
// getAllowedEmails
// ---------------------------------------------------------------------------

export interface AllowedEmailWithUser extends AllowedEmail {
  user: Pick<User, "id" | "name" | "avatar_url" | "role"> | null;
}

export interface AccessControlSettings {
  whitelistEnabled: boolean;
}

export async function getAllowedEmails(): Promise<AllowedEmailWithUser[]> {
  await requireAdminSession();

  const emails = await db
    .select()
    .from(allowedEmailsTable)
    .where(ne(allowedEmailsTable.email, WHITELIST_BYPASS_EMAIL))
    .orderBy(desc(allowedEmailsTable.createdAt));

  if (emails.length === 0) return [];

  const emailAddresses = emails.map((e) => e.email);
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(inArray(usersTable.email, emailAddresses));

  const usersByEmail = new Map(
    users.map((u) => [
      u.email,
      {
        id: u.id,
        name: u.name,
        avatar_url: u.avatarUrl,
        role: u.role as UserRole,
      },
    ])
  );

  return emails.map((email) => ({
    id: email.id,
    email: email.email,
    added_by: email.addedBy,
    created_at: email.createdAt,
    user: usersByEmail.get(email.email) ?? null,
  })) as AllowedEmailWithUser[];
}

// ---------------------------------------------------------------------------
// getAccessControlSettings
// ---------------------------------------------------------------------------

export async function getAccessControlSettings(): Promise<AccessControlSettings> {
  await requireAdminSession();

  const marker = await db.query.allowedEmails.findFirst({
    where: eq(allowedEmailsTable.email, WHITELIST_BYPASS_EMAIL),
  });

  return {
    whitelistEnabled: !marker,
  };
}

// ---------------------------------------------------------------------------
// setWhitelistEnabled
// ---------------------------------------------------------------------------

export async function setWhitelistEnabled(enabled: boolean): Promise<void> {
  await requireAdminSession();

  if (enabled) {
    await db
      .delete(allowedEmailsTable)
      .where(eq(allowedEmailsTable.email, WHITELIST_BYPASS_EMAIL));
    return;
  }

  await db
    .insert(allowedEmailsTable)
    .values({
      email: WHITELIST_BYPASS_EMAIL,
      addedBy: null,
    })
    .onConflictDoUpdate({
      target: allowedEmailsTable.email,
      set: { addedBy: null },
    });
}

// ---------------------------------------------------------------------------
// addAllowedEmail
// ---------------------------------------------------------------------------

export async function addAllowedEmail(email: string): Promise<void> {
  const session = await requireAdminSession();
  const normalizedEmail = email.toLowerCase().trim();

  if (normalizedEmail === WHITELIST_BYPASS_EMAIL) {
    throw new Error("This email is reserved for system access control");
  }

  try {
    await db.insert(allowedEmailsTable).values({
      email: normalizedEmail,
      addedBy: session.user.id,
    });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      throw new Error("This email is already on the whitelist");
    }
    throw new Error(`Failed to add email: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// updateUserRole
// ---------------------------------------------------------------------------

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  const session = await requireAdminSession();

  if (userId === session.user.id) {
    throw new Error("You cannot change your own role");
  }

  await db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.id, userId));
}

// ---------------------------------------------------------------------------
// removeAllowedEmail
// ---------------------------------------------------------------------------

export async function removeAllowedEmail(emailId: string): Promise<void> {
  const session = await requireAdminSession();

  const emailRow = await db.query.allowedEmails.findFirst({
    where: eq(allowedEmailsTable.id, emailId),
  });

  if (!emailRow) throw new Error(`Email not found`);

  // Prevent self-removal
  const currentUser = await db.query.users.findFirst({
    columns: { email: true },
    where: eq(usersTable.id, session.user.id),
  });

  if (currentUser && currentUser.email === emailRow.email) {
    throw new Error("You cannot remove your own email from the whitelist");
  }

  await db.delete(allowedEmailsTable).where(eq(allowedEmailsTable.id, emailId));
}
