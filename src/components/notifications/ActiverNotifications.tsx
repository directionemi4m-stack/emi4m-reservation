"use client";

import { useEffect, useState } from "react";
import { IconBell, IconBellOff } from "@tabler/icons-react";
import { abonnerPush, desabonnerPush, testerPush } from "@/app/(app)/notifications/actions";

type Etat = "chargement" | "non_supporte" | "ios_installer" | "refuse" | "inactif" | "actif";

function cleVapid(base64: string) {
  const rembourrage = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + rembourrage).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

// État des notifications sur cet appareil (enregistre au passage le service worker).
async function detecter(): Promise<{ etat: Etat; sub: PushSubscription | null }> {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const installee = window.matchMedia("(display-mode: standalone)").matches;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { etat: ios && !installee ? "ios_installer" : "non_supporte", sub: null };
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    const sub = await registration.pushManager.getSubscription();
    if (sub) return { etat: "actif", sub };
    return { etat: Notification.permission === "denied" ? "refuse" : "inactif", sub: null };
  } catch {
    return { etat: "non_supporte", sub: null };
  }
}

// Activation des notifications sur l'appareil courant (téléphone ou ordinateur). Sur
// iPhone, elles ne fonctionnent qu'une fois l'appli ajoutée à l'écran d'accueil.
export function ActiverNotifications({ bloque = false }: { bloque?: boolean }) {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [abonnement, setAbonnement] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    detecter().then(({ etat, sub }) => {
      setAbonnement(sub);
      setEtat(etat);
    });
  }, []);

  async function activer() {
    setEnCours(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: cleVapid(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const resultat = await abonnerPush(JSON.parse(JSON.stringify(sub)));
      if (!resultat.succes) {
        await sub.unsubscribe();
        setMessage(resultat.message ?? "Activation impossible.");
        return;
      }
      setAbonnement(sub);
      setEtat("actif");
    } catch {
      setMessage("Activation impossible sur cet appareil.");
    } finally {
      setEnCours(false);
    }
  }

  async function desactiver() {
    if (!abonnement) return;
    setEnCours(true);
    await desabonnerPush(abonnement.endpoint);
    await abonnement.unsubscribe();
    setAbonnement(null);
    setEtat("inactif");
    setEnCours(false);
  }

  async function tester() {
    setEnCours(true);
    const r = await testerPush();
    setMessage(r.succes ? "Notification envoyée : elle doit apparaître dans quelques secondes." : (r.message ?? "Échec."));
    setEnCours(false);
  }

  if (etat === "chargement") return null;

  const bouton = "rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60";
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {etat === "actif" ? (
          <IconBell size={18} className="text-status-dispo" aria-hidden />
        ) : (
          <IconBellOff size={18} className="text-slate-400" aria-hidden />
        )}
        <h2 className="text-sm font-semibold text-brand-slate">Notifications sur cet appareil</h2>
      </div>

      {etat === "actif" && (
        <>
          <p className="text-sm text-slate-600">Activées : vous serez prévenu·e quand les bulletins sont à remplir.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={tester} disabled={enCours} className={`${bouton} bg-slate-100 text-slate-700 hover:bg-slate-200`}>
              Envoyer un test
            </button>
            <button type="button" onClick={desactiver} disabled={enCours} className={`${bouton} text-slate-500 underline`}>
              Désactiver
            </button>
          </div>
        </>
      )}
      {etat === "inactif" && (
        <>
          <p className="text-sm text-slate-600">
            Recevez un rappel sur ce téléphone ou cet ordinateur quand c&apos;est le moment de remplir les bulletins.
          </p>
          <button
            type="button"
            onClick={activer}
            disabled={enCours || bloque}
            className={`${bouton} w-fit bg-brand-accent text-white hover:bg-brand-accent/90`}
          >
            Activer les notifications
          </button>
          {bloque && <p className="text-xs text-slate-400">Indisponible en mode « connecté en tant que ».</p>}
        </>
      )}
      {etat === "ios_installer" && (
        <p className="text-sm text-slate-600">
          Sur iPhone, ajoutez d&apos;abord l&apos;appli à l&apos;écran d&apos;accueil : bouton Partager{" "}
          <span aria-hidden>⎋</span>, puis « Sur l&apos;écran d&apos;accueil ». Ouvrez-la ensuite depuis son icône et revenez
          ici pour activer les notifications.
        </p>
      )}
      {etat === "refuse" && (
        <p className="text-sm text-slate-600">
          Les notifications ont été refusées pour ce site. Autorisez-les dans les réglages du navigateur, puis rechargez la page.
        </p>
      )}
      {etat === "non_supporte" && (
        <p className="text-sm text-slate-600">Ce navigateur ne permet pas les notifications. Vous recevrez les rappels par mail.</p>
      )}
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}
