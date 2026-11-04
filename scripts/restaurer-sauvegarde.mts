// Restaure une sauvegarde hebdomadaire (fichier « sauvegarde-AAAA-MM-JJ.json.gz » du Drive)
// dans une base VIDE dont les tables ont déjà été créées (npx prisma migrate deploy).
//
//   RESTAURER_VERS="postgresql://…" npx tsx scripts/restaurer-sauvegarde.mts sauvegarde-2026-11-08.json.gz
//
// Par sécurité, le script refuse d'écrire dans la base de production (DATABASE_URL) et
// dans une base qui contient déjà des données.
import "dotenv/config";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { clientBrut, decoder, lireSauvegarde, ordreTables } from "../src/lib/sauvegarde";

config({ path: ".env.local", override: false });

const fichier = process.argv[2];
const cible = process.env.RESTAURER_VERS;
if (!fichier || !cible) {
  console.error("Usage : RESTAURER_VERS=<base vide> npx tsx scripts/restaurer-sauvegarde.mts <fichier.json.gz>");
  process.exit(1);
}
const hote = (url: string) => new URL(url).host.split(".")[0];
if (process.env.DATABASE_URL && hote(cible) === hote(process.env.DATABASE_URL)) {
  console.error("Refus : la cible est la base de production.");
  process.exit(1);
}

const sauvegarde = lireSauvegarde(readFileSync(fichier));
const client = clientBrut(cible);
await client.connect();
try {
  const { rows: fk } = await client.query<{ table: string; reference: string }>(
    `SELECT tc.table_name AS "table", ccu.table_name AS reference FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`
  );
  const tables = Object.keys(sauvegarde.tables).filter((t) => t !== "_prisma_migrations");
  for (const t of tables) {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM "${t}"`);
    if (rows[0].n > 0) throw new Error(`La table ${t} n'est pas vide : restauration annulée.`);
  }

  await client.query("BEGIN");
  for (const t of ordreTables(tables, fk)) {
    const { colonnes, lignes } = sauvegarde.tables[t];
    if (lignes.length === 0) continue;
    const noms = Object.keys(colonnes);
    for (let i = 0; i < lignes.length; i += 200) {
      const lot = lignes.slice(i, i + 200);
      const valeurs: unknown[] = [];
      const tuples = lot.map((l) =>
        `(${noms
          .map((c) => {
            const v = decoder(l[c]);
            valeurs.push(colonnes[c] === "json" || colonnes[c] === "jsonb" ? (v === null ? null : JSON.stringify(v)) : v);
            return `$${valeurs.length}`;
          })
          .join(", ")})`
      );
      await client.query(`INSERT INTO "${t}" (${noms.map((c) => `"${c}"`).join(", ")}) VALUES ${tuples.join(", ")}`, valeurs);
    }
    console.log(`${t} : ${lignes.length}`);
  }
  await client.query("COMMIT");
  console.log(`Restauration terminée (sauvegarde du ${sauvegarde.creeLe}).`);
} catch (erreur) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(erreur);
  process.exitCode = 1;
} finally {
  await client.end();
}
