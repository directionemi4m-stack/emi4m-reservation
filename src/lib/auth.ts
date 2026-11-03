import NextAuth, { type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

export const COOKIE_IMPERSONATION = "impersonation_prof_id";

// Au-delà de 10 échecs en 15 minutes pour une même adresse, la connexion est refusée
// jusqu'à ce que les plus anciens sortent de la fenêtre (même avec le bon mot de passe).
const ECHECS_MAX = 10;
const FENETRE_ECHECS_MS = 15 * 60 * 1000;

async function tropDEchecs(email: string) {
  const depuis = new Date(Date.now() - FENETRE_ECHECS_MS);
  return (await db.echecConnexion.count({ where: { email, le: { gte: depuis } } })) >= ECHECS_MAX;
}

async function noterEchec(email: string) {
  await db.echecConnexion.create({ data: { email } });
  // Ménage : les échecs anciens ne servent plus à rien.
  await db.echecConnexion.deleteMany({ where: { le: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
}

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
        if (await tropDEchecs(email)) return null;

        const compte = await db.user.findUnique({ where: { email } });
        const valide = !!compte?.actif && !!compte.motDePasseHash && (await bcrypt.compare(motDePasse, compte.motDePasseHash));
        if (!compte || !valide) {
          await noterEchec(email);
          return null;
        }
        await db.echecConnexion.deleteMany({ where: { email } });

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
async function authVerifiee(): Promise<Session | null> {
  const sessionJeton = await authReel();
  if (!sessionJeton?.user?.id) return sessionJeton;

  // Le jeton de session reste valable 30 jours : on revérifie à chaque requête que le
  // compte existe encore et est actif (un prof désactivé perd l'accès tout de suite),
  // et on prend son rôle actuel plutôt que celui du jour de la connexion.
  const compte = await db.user.findUnique({ where: { id: sessionJeton.user.id }, select: { actif: true, role: true, email: true } });
  if (!compte || !compte.actif) return null;
  const session: Session = { ...sessionJeton, user: { ...sessionJeton.user, role: compte.role, email: compte.email } };
  if (session.user.role !== "ADMIN") return session;

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

// Une seule vérification par requête, même si layout, page et actions l'appellent chacun.
export const auth = cache(authVerifiee);
