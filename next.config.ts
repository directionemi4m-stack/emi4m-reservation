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
        // En-têtes de sécurité de toutes les pages : l'appli ne peut pas être affichée dans
        // le cadre d'un autre site (anti-« clickjacking »), le navigateur ne devine pas le
        // type des fichiers servis, et l'adresse des pages n'est pas transmise aux autres sites.
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
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
