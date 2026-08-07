import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Un peu au-dessus de la limite de 10 Mo appliquée aux pièces jointes (frais/identite) :
      // cette limite couvre le corps multipart entier, pas juste le fichier.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
