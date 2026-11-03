// Vérifie que le contenu d'un fichier correspond bien au type annoncé par le navigateur
// (sa « signature » : les premiers octets), pour ne pas ranger dans le Drive un fichier
// déguisé en photo ou en PDF. Module pur.
export function contenuCorrespond(octets: Uint8Array, mime: string): boolean {
  const debut = (signature: number[], decalage = 0) => signature.every((o, i) => octets[decalage + i] === o);
  const texte = (t: string, decalage = 0) => debut([...t].map((c) => c.charCodeAt(0)), decalage);
  switch (mime) {
    case "application/pdf":
      return texte("%PDF");
    case "image/jpeg":
      return debut([0xff, 0xd8, 0xff]);
    case "image/png":
      return debut([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return texte("RIFF") && texte("WEBP", 8);
    case "image/heic":
    case "image/heif":
      return texte("ftyp", 4);
    default:
      return false;
  }
}
