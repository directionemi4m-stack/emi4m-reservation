import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ErreurTableur, lireCsv, lireTableur } from "./lectureTableur";

// Fabrique une petite archive zip (comme un vrai .xlsx) à partir de fichiers texte.
function zip(fichiers: Record<string, string>): Uint8Array {
  const locaux: Buffer[] = [];
  const centraux: Buffer[] = [];
  let decalage = 0;
  for (const [nom, contenu] of Object.entries(fichiers)) {
    const nomOctets = Buffer.from(nom);
    const donnees = deflateRawSync(Buffer.from(contenu));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(donnees.length, 18);
    local.writeUInt16LE(nomOctets.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(donnees.length, 20);
    central.writeUInt16LE(nomOctets.length, 28);
    central.writeUInt32LE(decalage, 42);
    locaux.push(local, nomOctets, donnees);
    centraux.push(central, nomOctets);
    decalage += 30 + nomOctets.length + donnees.length;
  }
  const repertoire = Buffer.concat(centraux);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(Object.keys(fichiers).length, 10);
  fin.writeUInt32LE(repertoire.length, 12);
  fin.writeUInt32LE(decalage, 16);
  return new Uint8Array(Buffer.concat([...locaux, repertoire, fin]));
}

const xlsx = zip({
  "xl/workbook.xml":
    '<workbook xmlns:r="x"><sheets><sheet name="Inscrits 2026" sheetId="1" r:id="rId1"/><sheet name="Tarifs" sheetId="2" r:id="rId2"/></sheets></workbook>',
  "xl/_rels/workbook.xml.rels":
    '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>',
  "xl/sharedStrings.xml":
    '<sst><si><t>Nom</t></si><si><t>Prénom</t></si><si><r><t>Trom</t></r><r><t xml:space="preserve">pette</t></r></si><si><t>Ma&amp;rie</t></si></sst>',
  "xl/worksheets/sheet1.xml":
    '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="inlineStr"><is><t>Tél</t></is></c></row>' +
    '<row r="3"><c r="A3" t="str"><v>DUPONT</v></c><c r="B3" t="s"><v>3</v></c><c r="C3" t="s"><v>2</v></c><c r="D3"><v>612345678</v></c></row></sheetData></worksheet>',
  "xl/worksheets/sheet2.xml": "<worksheet><sheetData/></worksheet>",
});

describe("lireTableur", () => {
  it("lit les feuilles d'un fichier Excel", () => {
    const feuilles = lireTableur(xlsx, "inscrits.xlsx");
    expect(feuilles.map((f) => f.nom)).toEqual(["Inscrits 2026", "Tarifs"]);
    expect(feuilles[0].lignes).toEqual([["Nom", "Prénom", "", "Tél"], [], ["DUPONT", "Ma&rie", "Trompette", "612345678"]]);
    expect(feuilles[1].lignes).toEqual([]);
  });

  it("lit un CSV Excel (point-virgule, guillemets, codage Windows)", () => {
    const windows = new Uint8Array([...Buffer.from("Nom;Ville\r\nL"), 0xe9, ...Buffer.from('a;"Lans; en"\r\n')]);
    expect(lireTableur(windows, "x.csv")[0].lignes).toEqual([["Nom", "Ville"], ["Léa", "Lans; en"]]);
    expect(lireCsv('a,"b ""c"""\n1,2')).toEqual([["a", 'b "c"'], ["1", "2"]]);
  });

  it("explique quoi faire avec un format non lu", () => {
    expect(() => lireTableur(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]), "vieux.xls")).toThrow(/\.xlsx/);
    expect(() => lireTableur(new Uint8Array([1, 2, 3]), "photo.png")).toThrow(ErreurTableur);
  });
});
