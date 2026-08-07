import { db } from "@/lib/db";
import { AjouterContactForm } from "@/components/admin/AjouterContactForm";
import { ActionsItemPresence } from "@/components/admin/ActionsItemPresence";
import { basculerActifContact, supprimerContact } from "./actions";

export default async function AdminContactsPage() {
  const [contacts, communes] = await Promise.all([
    db.contact.findMany({
      include: { commune: true },
      orderBy: [{ actif: "desc" }, { commune: { nom: "asc" } }, { nom: "asc" }],
    }),
    db.commune.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-slate">Contacts</h1>
        <p className="text-sm text-slate-500">
          Destinataires proposés par défaut pour les demandes de réservation par email, selon la
          commune de la salle.
        </p>
      </div>

      <AjouterContactForm communes={communes} />

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nom</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Commune</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">{contact.nom}</td>
                <td className="px-4 py-2 text-slate-500">{contact.email}</td>
                <td className="px-4 py-2 text-slate-500">{contact.commune.nom}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      contact.actif
                        ? "rounded-full bg-status-dispo/15 px-2.5 py-0.5 text-xs font-medium text-status-dispo"
                        : "rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                    }
                  >
                    {contact.actif ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <ActionsItemPresence
                    id={contact.id}
                    actif={contact.actif}
                    basculerAction={basculerActifContact}
                    supprimerAction={supprimerContact}
                  />
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-500" colSpan={5}>
                  Aucun contact.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
