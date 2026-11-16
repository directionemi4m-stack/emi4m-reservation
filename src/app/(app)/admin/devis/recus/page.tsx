import { redirect } from "next/navigation";

// Les devis des fournisseurs sont rangés avec les achats.
export default function AncienneAdresseDevisRecus() {
  redirect("/admin/achats/devis");
}
