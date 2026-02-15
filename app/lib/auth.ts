import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import type { UserRole } from '@/app/lib/types';

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email;
      if (!email) return false;

      const { supabase } = await import('@/app/lib/db');
      const { data, error } = await supabase
        .from('allowed_emails')
        .select('id')
        .eq('email', email)
        .single();

      if (error || !data) return false;
      return true;
    },

    async jwt({ token, user, account, profile }) {
      if (user?.email && !token.email) {
        token.email = user.email;
      }

      // On initial sign in, upsert user and read role from users table
      if (account && profile && user.email) {
        const { supabase } = await import('@/app/lib/db');

        const avatarUrl =
          (profile as { picture?: string }).picture ??
          (profile as { avatar_url?: string }).avatar_url ??
          null;

        // Upsert user — role defaults to 'member' on first signup,
        // preserves existing role on subsequent logins (ignoreDuplicates: false
        // updates name/avatar but NOT role since we omit it from the upsert)
        const { data, error } = await supabase
          .from('users')
          .upsert(
            {
              email: user.email,
              name: user.name ?? null,
              avatar_url: avatarUrl,
            },
            {
              onConflict: 'email',
              ignoreDuplicates: false,
            },
          )
          .select('id, role')
          .single();

        if (!error && data) {
          token.userId = data.id as string;
          token.role = data.role as UserRole;
        } else {
          // Fallback: read existing user
          const { data: existing, error: existingError } = await supabase
            .from('users')
            .select('id, role')
            .eq('email', user.email)
            .single();

          if (!existingError && existing) {
            token.userId = existing.id as string;
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
