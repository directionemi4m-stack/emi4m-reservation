import NextAuth, { type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

export const COOKIE_IMPERSONATION = "impersonation_prof_id";

const { handlers, auth: authReel, signIn, signOut } = NextAuth({
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

export { handlers, signIn, signOut };

// Permet à la direction de « se connecter en tant que » n'importe quel collègue, pour
// voir exactement ce qu'il voit et corriger des choses en son nom (ex. un bug remonté).
// Le cookie seul ne donne jamais cet accès à lui seul : il n'est honoré que si la vraie
// session (vérifiée par NextAuth, infalsifiable) est bien celle d'un compte direction —
// le rôle réel (ADMIN) est toujours conservé, pour ne jamais perdre l'accès aux pages
// d'administration ni au bouton « Quitter » pendant l'impersonation.
export async function auth(): Promise<Session | null> {
  const session = await authReel();
  if (!session?.user || session.user.role !== "ADMIN") return session;

  const profIdImpersonne = (await cookies()).get(COOKIE_IMPERSONATION)?.value;
  if (!profIdImpersonne) return session;

  const cible = await db.user.findUnique({ where: { id: profIdImpersonne } });
  if (!cible || !cible.actif) return session;

  return {
    ...session,
    user: {
      ...session.user,
      id: cible.id,
      name: `${cible.prenom} ${cible.nom}`,
      email: cible.email,
      impersonation: {
        direction: { id: session.user.id, nom: session.user.name ?? "" },
        cible: { id: cible.id, nom: cible.nom, prenom: cible.prenom },
      },
    },
  };
}
