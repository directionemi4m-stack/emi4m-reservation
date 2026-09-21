import type { MetadataRoute } from "next";

// Icônes en attente du logo EMI4M (voir public/icons/README.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EMI4M — Réservation des salles",
    short_name: "EMI4M Salles",
    description:
      "Réservation et occupation des salles de l'École de Musique Itinérante des 4 Montagnes",
    // "/" est désormais la page d'accueil publique : l'appli installée s'ouvre directement
    // sur le planning (ou la connexion si la session a expiré).
    start_url: "/planning",
    display: "standalone",
    background_color: "#2C3E50",
    theme_color: "#2C3E50",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
