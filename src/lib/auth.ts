import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { envoyerMagicLink } from "@/lib/mail";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },
  providers: [
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      maxAge: 15 * 60, // lien valable 15 minutes
      sendVerificationRequest: envoyerMagicLink,
    }),
  ],
  callbacks: {
    // Défense en profondeur : même si un compte existe déjà, on bloque
    // la connexion si la direction l'a désactivé entre-temps.
    async signIn({ user }) {
      if (!user?.id) return false;
      const compte = await db.user.findUnique({ where: { id: user.id } });
      return !!compte?.actif;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
  },
});
