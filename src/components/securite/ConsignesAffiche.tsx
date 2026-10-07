import { numeros, type ConsignesContenu } from "@/lib/consignesSecurite";

// Numéros composables d'un tap (« 18 ou 112 » → deux liens).
function Telephones({ texte }: { texte: string }) {
  const liste = numeros(texte);
  if (liste.length === 0) return <>{texte}</>;
  return (
    <>
      {liste.map((n, i) => (
        <span key={n}>
          {i > 0 && " ou "}
          <a href={`tel:${n.replace(/\s+/g, "")}`} className="font-semibold underline underline-offset-2">
            {n}
          </a>
        </span>
      ))}
    </>
  );
}

function Colonne({
  titre,
  couleur,
  children,
}: {
  titre: string;
  couleur: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm">
      <h3 className={`px-4 py-2 text-base font-bold uppercase tracking-wide text-white ${couleur}`}>{titre}</h3>
      <div className="flex flex-col gap-3 p-4 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function Etape({ children }: { children: React.ReactNode }) {
  return <li className="rounded-md bg-slate-100 px-3 py-2 font-medium">{children}</li>;
}

function Liste({ titre, items }: { titre: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-semibold text-brand-slate">{titre}</p>
      <ol className="mt-1 list-decimal pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </div>
  );
}

function Info({ titre, valeur }: { titre: string; valeur: string }) {
  if (!valeur) return null;
  return (
    <p>
      <span className="font-semibold text-brand-slate">{titre} :</span> {valeur}
    </p>
  );
}

export function ConsignesAffiche({ consignes }: { consignes: ConsignesContenu }) {
  const { incendie, evacuation, accident } = consignes;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Colonne titre="Incendie" couleur="bg-red-700">
          {incendie.prevenir.length > 0 && (
            <div>
              <p className="font-semibold text-brand-slate">Prévenir :</p>
              <ul className="mt-1">
                {incendie.prevenir.map((c) => (
                  <li key={c.libelle}>
                    {c.libelle}
                    {c.telephone && (
                      <>
                        {" : "}
                        <Telephones texte={c.telephone} />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ol className="flex flex-col gap-2">
            <Etape>1. Déclencher l&apos;alarme incendie</Etape>
            <Etape>2. Attaquer le feu avec un extincteur</Etape>
            <Etape>
              3. Alerter les secours : <Telephones texte={incendie.numeroSecours} />
            </Etape>
          </ol>
          <Liste titre="Équipiers première intervention" items={incendie.equipiers} />
        </Colonne>

        <Colonne titre="Évacuation" couleur="bg-green-700">
          <p>
            <span className="font-semibold text-brand-slate">En cas de :</span> signal sonore ou sur ordre
          </p>
          <ol className="flex flex-col gap-2">
            <Etape>Garder son calme, évacuer</Etape>
            <Etape>Ne pas utiliser les ascenseurs ou monte-charge</Etape>
            <Etape>
              Point de rassemblement :{" "}
              <span className="font-semibold text-green-800">{evacuation.pointRassemblement}</span>
            </Etape>
          </ol>
          <Info titre="Guide-file" valeur={evacuation.guideFile} />
          <Info titre="Serre-file" valeur={evacuation.serreFile} />
        </Colonne>

        <Colonne titre="Accident / blessé / malaise" couleur="bg-orange-600">
          <ol className="flex flex-col gap-2">
            <Etape>1. Protéger</Etape>
            <Etape>
              2. Alerter : <Telephones texte={accident.numeroSecours} />
            </Etape>
            <Etape>3. Secourir</Etape>
          </ol>
          <Info titre="Défibrillateur" valeur={accident.defibrillateur} />
          <Liste titre="Secouristes - sauveteurs" items={accident.secouristes} />
          <Info titre="Trousse d'urgence" valeur={accident.trousseUrgence} />
        </Colonne>
      </div>

      <p className="text-xs text-slate-500">
        {consignes.nomEtablissement} — {consignes.adresse}
      </p>
    </div>
  );
}
