// Prépare la COPIE DE TEST de l'appli, sur une branche Neon (copie gratuite de la base).
//
// 1. Neon (console.neon.tech) › le projet › Branches › « Create branch » (nom : test),
//    puis « Connect » : copier l'adresse de connexion de la branche.
// 2. Créer à la racine du projet un fichier .env.test.local contenant :
//      DATABASE_URL="postgresql://…adresse de la branche test…"
// 3. npx tsx scripts/preparer-copie-test.mts
// 4. npm run dev:test → http://localhost:3001 (bandeau jaune « COPIE DE TEST »).
//
// Le script refuse de toucher la base de production. Sur la copie, il remplace toutes les
// adresses mail (profs, mairies) par des adresses fictives, sauf celle du compte partagé de
// la direction que l'appli reconnaît à son adresse (aucun mail ne part de la copie). Il
// retire aussi les abonnements aux notifications et la connexion Google, puis crée deux
// comptes d'essai (direction et prof) dont les mots de passe sont écrits dans
// .env.test.local (jamais versionné).
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { Client } from "pg";

// Même valeur que MAIL_DIRECTION (src/lib/clesServeur.ts), recopiée ici pour que le script
// n'ait pas à charger l'appli.
const MAIL_DIRECTION = "direction.emi4m@gmail.com";

const lireEnv = (fichier: string) =>
  Object.fromEntries(
    readFileSync(fichier, "utf8")
      .split(/\r?\n/)
      .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => [m[1], m[2].replace(/^"(.*)"$/, "$1")])
  ) as Record<string, string>;

const production = lireEnv(".env").DATABASE_URL;
const envTest = lireEnv(".env.test.local");
const test = envTest.DATABASE_URL;
const hote = (url: string) => new URL(url).host.split(".")[0];
if (!test) throw new Error("DATABASE_URL manquant dans .env.test.local.");
if (!production || hote(test) === hote(production)) {
  throw new Error("Refus : .env.test.local doit pointer vers la branche de test, pas vers la production.");
}

const COMPTES = [
  { cle: "TEST_DIRECTION", email: "test.direction@exemple.test", prenom: "Test", nom: "DIRECTION", role: "ADMIN" },
  { cle: "TEST_PROF", email: "test.prof@exemple.test", prenom: "Test", nom: "PROF", role: "PROF" },
] as const;

const client = new Client({ connectionString: test });
await client.connect();
try {
  await client.query("BEGIN");
  const { rowCount: profs } = await client.query(
    `UPDATE "User" SET email = 'compte-' || id || '@exemple.test', "emailPartage" = NULL
     WHERE email NOT LIKE '%@exemple.test' AND email <> $1`,
    [MAIL_DIRECTION]
  );
  const { rowCount: contacts } = await client.query(
    `UPDATE "Contact" SET email = 'mairie-' || id || '@exemple.test' WHERE email NOT LIKE '%@exemple.test'`
  );
  await client.query(`DELETE FROM "AbonnementPush"`);
  await client.query(`DELETE FROM "ConfigGoogle"`);
  await client.query(`DELETE FROM "TokenMotDePasse"`);

  const lignes = Object.entries(envTest).filter(([k]) => !k.startsWith("TEST_"));
  for (const c of COMPTES) {
    const motDePasse = randomBytes(9).toString("base64url");
    await client.query(
      `INSERT INTO "User" (id, email, "motDePasseHash", nom, prenom, role, actif)
       VALUES ($1, $2, $3, $4, $5, $6::"Role", true)
       ON CONFLICT (email) DO UPDATE SET "motDePasseHash" = EXCLUDED."motDePasseHash", role = EXCLUDED.role, actif = true`,
      [`${c.cle.toLowerCase()}`, c.email, await bcrypt.hash(motDePasse, 10), c.nom, c.prenom, c.role]
    );
    lignes.push([`${c.cle}_EMAIL`, c.email], [`${c.cle}_MOT_DE_PASSE`, motDePasse]);
  }
  await client.query("COMMIT");

  writeFileSync(
    ".env.test.local",
    `# Copie de test (branche Neon) — cf. scripts/preparer-copie-test.mts. Jamais versionné.\n${lignes
      .map(([k, v]) => `${k}="${v}"`)
      .join("\n")}\n`
  );
  console.log(`Copie de test prête : ${profs} comptes et ${contacts} contacts passés en adresses fictives.`);
  console.log("Comptes d'essai (mots de passe dans .env.test.local) :", COMPTES.map((c) => c.email).join(", "));
} catch (erreur) {
  await client.query("ROLLBACK").catch(() => {});
  throw erreur;
} finally {
  await client.end();
}
