import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import type { UserRole } from "@/app/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string;
    role?: UserRole;
  }
}
