// Côté navigateur uniquement. Réduit une photo de téléphone (souvent 4 à 8 Mo) à une
// taille maximale en JPEG, remise à l'endroit : l'envoi est rapide même en 4G.
export async function reduirePhoto(fichier: Blob, cote: number, qualite = 0.82): Promise<Blob> {
  const image = await createImageBitmap(fichier);
  const echelle = Math.min(1, cote / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return new Promise((resoudre, rejeter) =>
    canvas.toBlob((b) => (b ? resoudre(b) : rejeter(new Error("conversion"))), "image/jpeg", qualite)
  );
}
