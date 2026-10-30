import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Un peu au-dessus de la limite de 10 Mo appliquée aux pièces jointes (frais/identite) :
      // cette limite couvre le corps multipart entier, pas juste le fichier.
      bodySizeLimit: "11mb",
    },
  },
  async headers() {
    return [
      {
        // Le service worker des notifications : jamais mis en cache, pour que chaque
        // téléphone récupère tout de suite la dernière version.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
