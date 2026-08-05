import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../src/generated/prisma/client";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
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
