import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMI4M — Réservation des salles",
  description:
    "Réservation et occupation des salles de l'École de Musique Itinérante des 4 Montagnes",
  // Preuve de propriété du site pour Google Search Console (validation du branding OAuth).
  verification: { google: "IW83x0RpN5VARDiLul9-YupolCpsAxT9oZiHsS_v1AM" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EMI4M Salles",
  },
};

export const viewport: Viewport = {
  themeColor: "#2C3E50",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
