import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { Role } from "@/lib/constants";
import { resolveAuthSecret } from "@/lib/auth-secret";
import { prisma } from "@/lib/prisma";
import { isPinFormat, parseLoginIdentifier } from "@/lib/user-identifiers";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username or email", type: "text" },
        password: { label: "Password or PIN", type: "password" },
      },
      async authorize(credentials) {
        const rawId = credentials?.username?.trim() ?? "";
        const secret = credentials?.password ?? "";
        if (!rawId || !secret) return null;

        const key = parseLoginIdentifier(rawId);
        const user = await prisma.user.findFirst({
          where: "email" in key ? { email: key.email } : { username: key.username },
        });
        if (!user) return null;

        if (user.role === "OWNER") {
          if (!user.passwordHash) return null;
          const ok = await compare(secret, user.passwordHash);
          if (!ok) return null;
        } else {
          // Non-owner users can authenticate via PIN (primary) or password (secondary).
          const hasPin = Boolean(user.pinHash);
          const hasPassword = Boolean(user.passwordHash);

          let pinOk = false;
          if (hasPin && isPinFormat(secret)) {
            pinOk = await compare(secret, user.pinHash!);
          }

          if (pinOk) {
            // PIN login success.
          } else if (hasPassword) {
            const passOk = await compare(secret, user.passwordHash!);
            if (!passOk) return null;
          } else {
            return null;
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          phone: user.phone ?? "",
          role: user.role as Role,
          shopId: user.shopId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = (user as { email?: string }).email ?? "";
        token.username = (user as { username?: string | null }).username ?? null;
        token.role = user.role;
        token.phone = user.phone;
        token.shopId = user.shopId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.email = (token.email as string) ?? "";
        session.user.username = (token.username as string | null) ?? null;
        session.user.role = token.role as Role;
        session.user.phone = token.phone as string;
        session.user.shopId = token.shopId ?? null;
      }
      return session;
    },
  },
  secret: resolveAuthSecret(),
};
