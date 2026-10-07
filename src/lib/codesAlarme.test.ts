import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { chiffrerCode, codeValide, dechiffrerCode } from "./codesAlarme";

beforeAll(() => {
  process.env.CLE_CHIFFREMENT_CODES = randomBytes(32).toString("base64");
});

describe("chiffrerCode / dechiffrerCode", () => {
  it("fait un aller-retour fidèle", () => {
    expect(dechiffrerCode(chiffrerCode("4821"))).toBe("4821");
  });

  it("ne stocke jamais le code en clair, et chiffre différemment à chaque fois", () => {
    const a = chiffrerCode("4821");
    const b = chiffrerCode("4821");
    expect(a).not.toContain("4821");
    expect(a).not.toBe(b);
  });

  it("refuse un contenu falsifié (authentification GCM)", () => {
    const [iv, tag, chiffre] = chiffrerCode("4821").split(".");
    const altere = Buffer.from(chiffre, "base64");
    altere[0] ^= 1;
    expect(() => dechiffrerCode([iv, tag, altere.toString("base64")].join("."))).toThrow();
  });
});

describe("codeValide", () => {
  it("accepte les codes usuels et refuse les saisies invalides", () => {
    expect(codeValide("4821")).toBe(true);
    expect(codeValide("12#A")).toBe(true);
    expect(codeValide("12 34")).toBe(false);
    expect(codeValide("")).toBe(false);
  });
});
