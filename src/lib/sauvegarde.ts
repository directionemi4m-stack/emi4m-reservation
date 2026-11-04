import { gzipSync, gunzipSync } from "node:zlib";
import { Client, types } from "pg";

// Sauvegarde complète de la base : chaque table, ligne par ligne, dans un fichier JSON
// compressé, déposé chaque semaine dans le Drive (cf. /api/cron/sauvegarde). Les dates et
// heures sont gardées telles que Postgres les écrit (aucun décalage de fuseau), les
// fichiers (PDF, signatures) en base64 : le fichier suffit à tout restaurer
// (cf. scripts/restaurer-sauvegarde.mts).

export interface Sauvegarde {
  version: 1;
  creeLe: string;
  tables: Record<string, { colonnes: Record<string, string>; lignes: Record<string, unknown>[] }>;
}

const TEXTE = (v: string) => v;
const TYPES_TEXTE = [
  types.builtins.DATE,
  types.builtins.TIME,
  types.builtins.TIMETZ,
  types.builtins.TIMESTAMP,
  types.builtins.TIMESTAMPTZ,
  types.builtins.INTERVAL,
] as number[];

// Client dédié : les dates et heures restent du texte, au lieu d'être converties en Date
// JavaScript (ce qui décalerait les dates « sans fuseau » selon le fuseau du serveur).
export function clientBrut(connectionString: string) {
  return new Client({
    connectionString,
    types: {
      getTypeParser: ((oid: number, format?: "text" | "binary") =>
        TYPES_TEXTE.includes(oid) ? TEXTE : types.getTypeParser(oid, format as "text")) as typeof types.getTypeParser,
    },
  });
}

function encoder(v: unknown): unknown {
  if (Buffer.isBuffer(v)) return { $octets: v.toString("base64") };
  if (Array.isArray(v)) return v.map(encoder);
  return v;
}

export function decoder(v: unknown): unknown {
  if (v && typeof v === "object" && !Array.isArray(v) && "$octets" in v) return Buffer.from(String((v as { $octets: string }).$octets), "base64");
  if (Array.isArray(v)) return v.map(decoder);
  return v;
}

export async function creerSauvegarde(connectionString = process.env.DATABASE_URL!): Promise<{ contenu: Buffer; nbTables: number; nbLignes: number }> {
  const client = clientBrut(connectionString);
  await client.connect();
  try {
    const { rows: colonnes } = await client.query<{ table_name: string; column_name: string; data_type: string }>(
      `SELECT c.table_name, c.column_name, c.data_type FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema
       WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' ORDER BY c.table_name, c.ordinal_position`
    );
    const sauvegarde: Sauvegarde = { version: 1, creeLe: new Date().toISOString(), tables: {} };
    for (const c of colonnes) {
      sauvegarde.tables[c.table_name] ??= { colonnes: {}, lignes: [] };
      sauvegarde.tables[c.table_name].colonnes[c.column_name] = c.data_type;
    }
    let nbLignes = 0;
    for (const nom of Object.keys(sauvegarde.tables)) {
      const { rows } = await client.query(`SELECT * FROM "${nom.replace(/"/g, '""')}"`);
      sauvegarde.tables[nom].lignes = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, encoder(v)])));
      nbLignes += rows.length;
    }
    return { contenu: gzipSync(JSON.stringify(sauvegarde)), nbTables: Object.keys(sauvegarde.tables).length, nbLignes };
  } finally {
    await client.end();
  }
}

export function lireSauvegarde(contenu: Buffer): Sauvegarde {
  const s = JSON.parse(gunzipSync(contenu).toString("utf8")) as Sauvegarde;
  if (s.version !== 1 || !s.tables) throw new Error("Fichier de sauvegarde inconnu.");
  return s;
}

// Ordre d'insertion respectant les clés étrangères : une table passe après celles qu'elle
// référence (les références d'une table vers elle-même sont ignorées).
export function ordreTables(tables: string[], dependances: { table: string; reference: string }[]): string[] {
  const restantes = new Set(tables);
  const ordre: string[] = [];
  while (restantes.size > 0) {
    const pretes = [...restantes].filter((t) =>
      dependances.every((d) => d.table !== t || d.reference === t || !restantes.has(d.reference))
    );
    if (pretes.length === 0) throw new Error("Dépendances circulaires entre tables.");
    for (const t of pretes.sort()) {
      ordre.push(t);
      restantes.delete(t);
    }
  }
  return ordre;
}
