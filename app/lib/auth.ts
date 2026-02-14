import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

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

      if (!email) {
        return false;
      }

      const { supabase } = await import("@/app/lib/db");
      const { data, error } = await supabase
        .from("allowed_emails")
        .select("id")
        .eq("email", email)
        .single();

      if (error || !data) {
        return false;
      }

      return true;
    },

    async jwt({ token, user, account, profile }) {
      // On initial sign in, account and profile are present
      if (account && profile && user.email) {
        const { supabase } = await import("@/app/lib/db");
        const avatarUrl =
          (profile as { picture?: string }).picture ??
          (profile as { avatar_url?: string }).avatar_url ??
          null;

        const { data, error } = await supabase
          .from("users")
          .upsert(
            {
              email: user.email,
              name: user.name ?? null,
              avatar_url: avatarUrl,
            },
            {
              onConflict: "email",
              ignoreDuplicates: false,
            }
          )
          .select("id")
          .single();

        if (!error && data) {
          token.userId = data.id as string;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }

      return session;
    },
  },
});
