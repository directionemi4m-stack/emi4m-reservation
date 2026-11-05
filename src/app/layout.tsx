import type { Metadata, Viewport } from "next";
import "./globals.css";
import { estCopieDeTest } from "@/lib/modeTest";

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
      <body className="min-h-full flex flex-col">
        {estCopieDeTest() && (
          <div className="sticky top-0 z-50 bg-amber-400 px-4 py-1 print:hidden text-center text-xs font-semibold text-amber-950">
            COPIE DE TEST — données de test, aucun mail ni notification envoyés, Drive non modifié
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
