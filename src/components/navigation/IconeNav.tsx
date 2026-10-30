import {
  IconAddressBook,
  IconBeach,
  IconBrandGoogleDrive,
  IconBuilding,
  IconCalendar,
  IconConfetti,
  IconCar,
  IconChecklist,
  IconClock,
  IconDoor,
  IconDots,
  IconFileCertificate,
  IconHistory,
  IconHome,
  IconHourglass,
  IconId,
  IconInbox,
  IconLayoutDashboard,
  IconMapPin,
  IconMicrophone2,
  IconMusic,
  IconPhone,
  IconRoute,
  IconSchool,
  IconSettings,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react";
import type { CleIcone, CouleurTuile } from "@/lib/navigation";

const ICONES: Record<CleIcone, typeof IconHome> = {
  accueil: IconHome,
  calendrier: IconCalendar,
  presences: IconChecklist,
  horloge: IconClock,
  porte: IconDoor,
  voiture: IconCar,
  musique: IconMusic,
  fiche: IconId,
  saison: IconConfetti,
  ecole: IconSchool,
  annuaire: IconAddressBook,
  securite: IconShieldCheck,
  boite: IconInbox,
  profs: IconUsers,
  parametres: IconSettings,
  plus: IconDots,
  tableau: IconLayoutDashboard,
  salle: IconBuilding,
  contacts: IconPhone,
  lieux: IconMapPin,
  vacances: IconBeach,
  trajet: IconRoute,
  evenement: IconMicrophone2,
  forfait: IconHourglass,
  drive: IconBrandGoogleDrive,
  journal: IconHistory,
  bulletin: IconFileCertificate,
};

// Pastille ronde colorée derrière l'icône, comme sur Home Assistant.
export const STYLE_ROND: Record<CouleurTuile, string> = {
  bleu: "bg-sky-100 text-sky-700",
  vert: "bg-emerald-100 text-emerald-700",
  ambre: "bg-amber-100 text-amber-700",
  neutre: "bg-slate-100 text-slate-600",
};

export function IconeNav({ cle, taille = 20, className }: { cle: CleIcone; taille?: number; className?: string }) {
  const Icone = ICONES[cle];
  return <Icone size={taille} stroke={1.75} className={className} aria-hidden />;
}
