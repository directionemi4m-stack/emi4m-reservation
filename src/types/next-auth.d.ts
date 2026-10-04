import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      // Présent seulement quand la direction « se connecte en tant que » un collègue :
      // le rôle réel (ADMIN) ci-dessus ne change jamais, pour ne jamais perdre l'accès
      // aux pages d'administration ni au bouton « Quitter » pendant l'impersonation.
      impersonation?: {
        direction: { id: string; nom: string };
        cible: { id: string; nom: string; prenom: string };
      };
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}
