// Lance la copie de test de l'appli en local (http://localhost:3001) : la base est celle
// de .env.test.local (une branche Neon, copie de la production), et APPLI_TEST=1 coupe
// mails, notifications, Drive et tableurs Google (cf. src/lib/modeTest.ts).
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

if (!existsSync(".env.test.local")) {
  console.error("Fichier .env.test.local absent : voir la procédure dans scripts/preparer-copie-test.mts.");
  process.exit(1);
}
const env = { ...process.env, APPLI_TEST: "1" };
for (const ligne of readFileSync(".env.test.local", "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(ligne);
  if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
const port = /^\d+$/.test(env.PORT ?? "") ? env.PORT : "3001";
const enfant = spawn("npx", ["next", "dev", "-p", port], { env, stdio: "inherit", shell: true });
enfant.on("exit", (code) => process.exit(code ?? 0));
