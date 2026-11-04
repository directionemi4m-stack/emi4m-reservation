import { describe, expect, it } from "vitest";
import { decoder, ordreTables } from "./sauvegarde";

describe("ordreTables", () => {
  it("insère une table après celles qu'elle référence", () => {
    const ordre = ordreTables(
      ["Seance", "Classe", "User", "Pointage"],
      [
        { table: "Classe", reference: "User" },
        { table: "Seance", reference: "Classe" },
        { table: "Pointage", reference: "Seance" },
        { table: "Pointage", reference: "User" },
        { table: "User", reference: "User" }, // référence vers elle-même : ignorée
      ]
    );
    expect(ordre).toEqual(["User", "Classe", "Seance", "Pointage"]);
  });
});

describe("decoder", () => {
  it("rend les fichiers sous forme d'octets", () => {
    const v = decoder({ $octets: Buffer.from("%PDF").toString("base64") });
    expect(Buffer.isBuffer(v) && v.toString()).toBe("%PDF");
    expect(decoder(["a", 1, null])).toEqual(["a", 1, null]);
  });
});
