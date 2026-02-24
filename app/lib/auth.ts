import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { WHITELIST_BYPASS_EMAIL } from '@/app/lib/constants';
import type { UserRole } from '@/app/lib/types';

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email;
      if (!email) return '/login?error=not_whitelisted';
      const normalizedEmail = email.toLowerCase().trim();

      const { db } = await import('@/app/lib/db');
      const { allowedEmails } = await import('@/app/lib/schema');
      const { or, eq } = await import('drizzle-orm');

      // Access-control gate:
      // - allow if sentinel marker exists (whitelist OFF)
      // - allow if user email is explicitly whitelisted
      const allowedRows = await db
        .select({ email: allowedEmails.email })
        .from(allowedEmails)
        .where(
          or(
            eq(allowedEmails.email, normalizedEmail),
            eq(allowedEmails.email, WHITELIST_BYPASS_EMAIL)
          )
        );

      const hasBypass = allowedRows.some(
        (row) => row.email === WHITELIST_BYPASS_EMAIL,
      );
      const isWhitelisted = allowedRows.some(
        (row) => row.email === normalizedEmail,
      );

      if (!hasBypass && !isWhitelisted) return '/login?error=not_whitelisted';
      return true;
    },

    async jwt({ token, user, account, profile }) {
      if (user?.email && !token.email) {
        token.email = user.email;
      }

      // On initial sign in, upsert user and read role from users table
      if (account && profile && user.email) {
        const { db } = await import('@/app/lib/db');
        const { users } = await import('@/app/lib/schema');
        const { eq } = await import('drizzle-orm');

        const avatarUrl =
          (profile as { picture?: string }).picture ??
          (profile as { avatar_url?: string }).avatar_url ??
          null;

        // Upsert user — role defaults to 'member' on first signup,
        // preserves existing role on subsequent logins
        const [upsertedUser] = await db
          .insert(users)
          .values({
            id: crypto.randomUUID(),
            email: user.email,
            name: user.name ?? null,
            avatarUrl: avatarUrl,
          })
          .onConflictDoUpdate({
            target: users.email,
            set: {
              name: user.name ?? null,
              avatarUrl: avatarUrl,
            },
          })
          .returning({ id: users.id, role: users.role });

        if (upsertedUser) {
          token.userId = upsertedUser.id;
          token.role = upsertedUser.role as UserRole;
        } else {
          // Fallback: read existing user
          const existing = await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.email, user.email))
            .get();

          if (existing) {
            token.userId = existing.id;
            token.role = existing.role as UserRole;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      session.user.role = (token.role as UserRole) ?? 'member';
      return session;
    },
  },
});
