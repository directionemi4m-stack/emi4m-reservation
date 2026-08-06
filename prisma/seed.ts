import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const COMMUNES: Array<{ nom: string; slug: string; salles: string[] }> = [
  {
    nom: "Villard-de-Lans",
    slug: "villard-de-lans",
    salles: ["Berlioz", "Paganini", "Debussy", "Chopin", "Gershwin", "Bartók", "Lodéon"],
  },
  {
    nom: "Lans-en-Vercors",
    slug: "lans-en-vercors",
    salles: ["Petite Salle", "Grande Salle"],
  },
  {
    nom: "Saint-Nizier-du-Moucherotte",
    slug: "saint-nizier-du-moucherotte",
    salles: ["Salle unique"],
  },
  {
    nom: "Autrans",
    slug: "autrans",
    salles: ["Salle unique"],
  },
  {
    nom: "Méaudre",
    slug: "meaudre",
    salles: ["Salle unique"],
  },
];

const LIEUX_PRESENCES = [
  "Villard-de-Lans",
  "Lans-en-Vercors",
  "Méaudre",
  "Autrans",
  "Corrençon",
  "Engins",
  "Saint-Nizier",
];

const NIVEAUX_FM = [
  "Éveil",
  "Initiation",
  "FM Débutant",
  "FM1",
  "FM2",
  "FM3",
  "FM4",
  "FM5",
  "FM6",
  "FM7",
  "FM8",
  "Ados/Adultes",
];

async function main() {
  for (const { nom, slug, salles } of COMMUNES) {
    const commune = await db.commune.upsert({
      where: { slug },
      update: { nom },
      create: { nom, slug },
    });

    for (const nomSalle of salles) {
      await db.salle.upsert({
        where: { communeId_nom: { communeId: commune.id, nom: nomSalle } },
        update: {},
        create: { nom: nomSalle, communeId: commune.id },
      });
    }

    console.log(`${nom} : ${salles.length} salle(s)`);
  }

  for (const nom of LIEUX_PRESENCES) {
    await db.lieuPresence.upsert({ where: { nom }, update: {}, create: { nom } });
  }
  console.log(`Présences : ${LIEUX_PRESENCES.length} lieu(x)`);

  for (const nom of NIVEAUX_FM) {
    await db.niveauFM.upsert({ where: { nom }, update: {}, create: { nom } });
  }
  console.log(`Présences : ${NIVEAUX_FM.length} niveau(x) FM`);

  // Premier compte admin, pour pouvoir se connecter et provisionner les
  // profs ensuite depuis l'interface d'administration.
  const emailAdmin = process.env.SEED_ADMIN_EMAIL;
  if (emailAdmin) {
    await db.user.upsert({
      where: { email: emailAdmin },
      update: { role: "ADMIN", actif: true },
      create: {
        email: emailAdmin,
        nom: process.env.SEED_ADMIN_NOM ?? "Direction",
        prenom: process.env.SEED_ADMIN_PRENOM ?? "EMI4M",
        role: "ADMIN",
        actif: true,
      },
    });
    console.log(`Compte admin : ${emailAdmin}`);
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (erreur) => {
    console.error(erreur);
    await db.$disconnect();
    process.exit(1);
  });
