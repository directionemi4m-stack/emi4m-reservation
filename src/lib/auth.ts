import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : null;
        const motDePasse = typeof credentials?.password === "string" ? credentials.password : null;
        if (!email || !motDePasse) return null;

        const compte = await db.user.findUnique({ where: { email } });
        if (!compte || !compte.actif || !compte.motDePasseHash) return null;

        const valide = await bcrypt.compare(motDePasse, compte.motDePasseHash);
        if (!valide) return null;

        return {
          id: compte.id,
          email: compte.email,
          name: `${compte.prenom} ${compte.nom}`,
          role: compte.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
