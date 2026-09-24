import { createTransport } from "nodemailer";

const COULEUR_SLATE = "#2C3E50";
const COULEUR_ACCENT = "#2980B9";

const EMAIL_DIRECTION = process.env.EMAIL_DIRECTION || "direction.emi4m@gmail.com";

function creerTransporteur() {
  return createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
}

interface Destinataire {
  nom: string;
  email: string;
}

export async function envoyerMailDemandeSalle(params: {
  destinataires: Destinataire[];
  sujet: string;
  corps: string;
}) {
  const { destinataires, sujet, corps } = params;
  const transport = creerTransporteur();

  const resultat = await transport.sendMail({
    to: destinataires.map((d) => ({ name: d.nom, address: d.email })),
    from: process.env.EMAIL_FROM,
    subject: sujet,
    text: corps,
  });

  const echecs = resultat.rejected.filter(Boolean);
  if (echecs.length > 0) {
    throw new Error(`Envoi impossible pour : ${echecs.join(", ")}`);
  }
}

function formatterDateFr(date: Date) {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatterHeure(date: Date) {
  return date.toISOString().slice(11, 16);
}

interface LigneMail {
  date: Date;
  heureDebut: Date;
  heureFin: Date;
  creneauBloquant?: string | null;
}

interface ParametresNouvelleDemande {
  prof: { nom: string; prenom: string; email: string };
  salle: { nom: string; commune: { nom: string } };
  enAttente: LigneMail[];
  refusees: LigneMail[];
}

export async function envoyerMailNouvelleDemande(params: ParametresNouvelleDemande) {
  const { prof, salle, enAttente, refusees } = params;
  const transport = creerTransporteur();

  const ligneTexte = (l: LigneMail) =>
    `${formatterDateFr(l.date)} ${formatterHeure(l.heureDebut)}–${formatterHeure(l.heureFin)}`;

  const texte = [
    `Nouvelle demande de réservation de ${prof.prenom} ${prof.nom} (${prof.email})`,
    `Salle : ${salle.commune.nom} — ${salle.nom}`,
    "",
    "Dates en attente de validation :",
    ...enAttente.map((l) => `- ${ligneTexte(l)}`),
    ...(refusees.length
      ? [
          "",
          "Dates rejetées automatiquement (chevauchement détecté, pour information) :",
          ...refusees.map((l) => `- ${ligneTexte(l)} — ${l.creneauBloquant ?? ""}`),
        ]
      : []),
  ].join("\n");

  await transport.sendMail({
    to: EMAIL_DIRECTION,
    from: process.env.EMAIL_FROM,
    subject: `Nouvelle demande — ${prof.prenom} ${prof.nom} — ${salle.commune.nom} / ${salle.nom}`,
    text: texte,
    html: htmlNouvelleDemande(params),
  });
}

function htmlNouvelleDemande({ prof, salle, enAttente, refusees }: ParametresNouvelleDemande) {
  const ligne = (l: LigneMail) =>
    `<li style="margin:0 0 6px;">${formatterDateFr(l.date)} · ${formatterHeure(l.heureDebut)}–${formatterHeure(l.heureFin)}</li>`;

  return `
<body style="background:#f4f6f8;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:${COULEUR_SLATE};padding:24px;text-align:center;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;">EMI4M — Nouvelle demande de réservation</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#2C3E50;">
              <p style="margin:0 0 16px;"><strong>${prof.prenom} ${prof.nom}</strong> (${prof.email}) demande à réserver :</p>
              <p style="margin:0 0 20px;"><strong>${salle.commune.nom} — ${salle.nom}</strong></p>
              <p style="margin:0 0 8px;font-weight:bold;">En attente de validation :</p>
              <ul style="margin:0 0 20px;padding-left:20px;">${enAttente.map(ligne).join("")}</ul>
              ${
                refusees.length
                  ? `<p style="margin:0 0 8px;color:${COULEUR_ACCENT};font-weight:bold;">Rejetées automatiquement (pour information) :</p><ul style="margin:0;padding-left:20px;color:#7f8c8d;">${refusees.map(ligne).join("")}</ul>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`;
}

interface ParametresDecision {
  prof: { nom: string; prenom: string; email: string };
  salle: { nom: string; commune: { nom: string } };
  ligne: { date: Date; heureDebut: Date; heureFin: Date };
  motif?: string;
}

export async function envoyerMailDemandeValidee(params: ParametresDecision) {
  const { prof, salle, ligne } = params;
  const transport = creerTransporteur();

  const descriptifCreneau = `${salle.commune.nom} — ${salle.nom}\n${formatterDateFr(ligne.date)} ${formatterHeure(ligne.heureDebut)}–${formatterHeure(ligne.heureFin)}`;

  await transport.sendMail({
    to: prof.email,
    from: process.env.EMAIL_FROM,
    subject: `Réservation validée — ${salle.commune.nom} / ${salle.nom}`,
    text: `Bonjour ${prof.prenom},\n\nVotre demande de réservation a été validée :\n${descriptifCreneau}\n\nÀ bientôt,\nDirection EMI4M`,
    html: htmlDecision({
      couleur: "#27AE60",
      titre: "Votre réservation est validée",
      corps: `<p style="margin:0 0 16px;">Bonjour ${prof.prenom},</p><p style="margin:0 0 20px;">Votre demande de réservation a été validée :</p><p style="margin:0 0 20px;font-weight:bold;">${salle.commune.nom} — ${salle.nom}<br>${formatterDateFr(ligne.date)} · ${formatterHeure(ligne.heureDebut)}–${formatterHeure(ligne.heureFin)}</p>`,
    }),
  });
}

export async function envoyerMailDemandeRefusee(params: ParametresDecision) {
  const { prof, salle, ligne, motif } = params;
  const transport = creerTransporteur();

  const descriptifCreneau = `${salle.commune.nom} — ${salle.nom}\n${formatterDateFr(ligne.date)} ${formatterHeure(ligne.heureDebut)}–${formatterHeure(ligne.heureFin)}`;
  const ligneMotif = motif ? `\nMotif : ${motif}` : "";

  await transport.sendMail({
    to: prof.email,
    from: process.env.EMAIL_FROM,
    subject: `Réservation refusée — ${salle.commune.nom} / ${salle.nom}`,
    text: `Bonjour ${prof.prenom},\n\nVotre demande de réservation a été refusée :\n${descriptifCreneau}${ligneMotif}\n\nDirection EMI4M`,
    html: htmlDecision({
      couleur: "#C0392B",
      titre: "Votre réservation est refusée",
      corps: `<p style="margin:0 0 16px;">Bonjour ${prof.prenom},</p><p style="margin:0 0 20px;">Votre demande de réservation a été refusée :</p><p style="margin:0 0 12px;font-weight:bold;">${salle.commune.nom} — ${salle.nom}<br>${formatterDateFr(ligne.date)} · ${formatterHeure(ligne.heureDebut)}–${formatterHeure(ligne.heureFin)}</p>${motif ? `<p style="margin:0;color:#7f8c8d;">Motif : ${motif}</p>` : ""}`,
    }),
  });
}

export async function envoyerMailReservationAnnulee(params: ParametresDecision) {
  const { prof, salle, ligne, motif } = params;
  const transport = creerTransporteur();

  const descriptifCreneau = `${salle.commune.nom} — ${salle.nom}\n${formatterDateFr(ligne.date)} ${formatterHeure(ligne.heureDebut)}–${formatterHeure(ligne.heureFin)}`;
  const ligneMotif = motif ? `\nMotif : ${motif}` : "";

  await transport.sendMail({
    to: prof.email,
    from: process.env.EMAIL_FROM,
    subject: `Réservation annulée — ${salle.commune.nom} / ${salle.nom}`,
    text: `Bonjour ${prof.prenom},\n\nUne réservation déjà validée vient d'être annulée par la direction :\n${descriptifCreneau}${ligneMotif}\n\nDirection EMI4M`,
    html: htmlDecision({
      couleur: "#7f8c8d",
      titre: "Une réservation validée a été annulée",
      corps: `<p style="margin:0 0 16px;">Bonjour ${prof.prenom},</p><p style="margin:0 0 20px;">Une réservation déjà validée vient d'être annulée par la direction :</p><p style="margin:0 0 12px;font-weight:bold;">${salle.commune.nom} — ${salle.nom}<br>${formatterDateFr(ligne.date)} · ${formatterHeure(ligne.heureDebut)}–${formatterHeure(ligne.heureFin)}</p>${motif ? `<p style="margin:0;color:#7f8c8d;">Motif : ${motif}</p>` : ""}`,
    }),
  });
}

interface CreneauAvecSalle {
  salle: { nom: string; commune: { nom: string } };
  date: Date;
  heureDebut: Date;
  heureFin: Date;
}

// Prévient le prof qu'une réservation DÉJÀ validée a été déplacée par la direction.
export async function envoyerMailReservationModifiee(params: {
  prof: { prenom: string; email: string };
  ancienne: CreneauAvecSalle;
  nouvelle: CreneauAvecSalle;
}) {
  const { prof, ancienne, nouvelle } = params;
  const transport = creerTransporteur();

  const decrire = (c: CreneauAvecSalle) =>
    `${c.salle.commune.nom} — ${c.salle.nom}\n${formatterDateFr(c.date)} ${formatterHeure(c.heureDebut)}–${formatterHeure(c.heureFin)}`;
  const decrireHtml = (c: CreneauAvecSalle) =>
    `${c.salle.commune.nom} — ${c.salle.nom}<br>${formatterDateFr(c.date)} · ${formatterHeure(c.heureDebut)}–${formatterHeure(c.heureFin)}`;

  await transport.sendMail({
    to: prof.email,
    from: process.env.EMAIL_FROM,
    subject: `Réservation modifiée — ${nouvelle.salle.commune.nom} / ${nouvelle.salle.nom}`,
    text: `Bonjour ${prof.prenom},\n\nLa direction a modifié une de vos réservations validées.\n\nAncien créneau :\n${decrire(ancienne)}\n\nNouveau créneau :\n${decrire(nouvelle)}\n\nDirection EMI4M`,
    html: htmlDecision({
      couleur: "#2980B9",
      titre: "Votre réservation a été modifiée",
      corps: `<p style="margin:0 0 16px;">Bonjour ${prof.prenom},</p><p style="margin:0 0 20px;">La direction a modifié une de vos réservations validées.</p><p style="margin:0 0 6px;color:#7f8c8d;">Ancien créneau</p><p style="margin:0 0 20px;text-decoration:line-through;color:#7f8c8d;">${decrireHtml(ancienne)}</p><p style="margin:0 0 6px;color:#7f8c8d;">Nouveau créneau</p><p style="margin:0;font-weight:bold;">${decrireHtml(nouvelle)}</p>`,
    }),
  });
}

interface ParametresBienvenue {
  prof: { nom: string; prenom: string; email: string };
  urlDefinirMotDePasse: string;
}

export async function envoyerMailBienvenue(params: ParametresBienvenue) {
  const { prof, urlDefinirMotDePasse } = params;
  const transport = creerTransporteur();

  await transport.sendMail({
    to: prof.email,
    from: process.env.EMAIL_FROM,
    subject: "Votre compte EMI4M Réservation est prêt",
    text: `Bonjour ${prof.prenom},\n\nLa direction vient de créer votre compte sur l'application de réservation des salles EMI4M (identifiant : ${prof.email}). Définissez votre mot de passe pour activer votre compte :\n${urlDefinirMotDePasse}\n\nCe lien est valable 7 jours et à usage unique. S'il a expiré, cliquez sur « Mot de passe oublié ? » sur la page de connexion pour en recevoir un nouveau.\n\nÀ bientôt,\nDirection EMI4M`,
    html: htmlLienMotDePasse({
      titre: "Bienvenue sur EMI4M Réservation",
      intro: `La direction vient de créer votre compte sur l'application de réservation des salles EMI4M (identifiant : ${prof.email}). Cliquez ci-dessous pour définir votre mot de passe et activer votre compte.`,
      url: urlDefinirMotDePasse,
      libelleBouton: "Définir mon mot de passe",
    }),
  });
}

interface ParametresReinitialisation {
  prof: { prenom: string; email: string };
  urlDefinirMotDePasse: string;
  validite?: string;
}

export async function envoyerMailReinitialisationMotDePasse(params: ParametresReinitialisation) {
  const { prof, urlDefinirMotDePasse, validite = "24h" } = params;
  const transport = creerTransporteur();

  await transport.sendMail({
    to: prof.email,
    from: process.env.EMAIL_FROM,
    subject: "Réinitialisation de votre mot de passe EMI4M",
    text: `Bonjour ${prof.prenom},\n\nVoici votre lien pour définir un nouveau mot de passe :\n${urlDefinirMotDePasse}\n\nCe lien est valable ${validite} et à usage unique. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nDirection EMI4M`,
    html: htmlLienMotDePasse({
      titre: "Réinitialisation de mot de passe",
      intro: `Bonjour ${prof.prenom}, cliquez ci-dessous pour définir un nouveau mot de passe. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      url: urlDefinirMotDePasse,
      libelleBouton: "Définir mon mot de passe",
    }),
  });
}

export type MotifAlerteDrive = "expiree" | "dossier_introuvable";

// Alerte envoyée à la direction quand la connexion Google Drive de l'appli ne
// fonctionne plus : sans elle, les profs ne peuvent plus déposer leurs documents.
export async function envoyerMailConnexionDriveInterrompue(params: {
  motif: MotifAlerteDrive;
  urlAdmin: string;
}) {
  const { motif, urlAdmin } = params;
  const transport = creerTransporteur();

  const explication =
    motif === "expiree"
      ? "L'autorisation d'accès à Google Drive a expiré ou a été révoquée."
      : "Le dossier « Documents profs » est introuvable dans Google Drive (supprimé ou déplacé ?).";
  const action =
    motif === "expiree"
      ? "Cliquez sur « Reconnecter » puis choisissez le compte de la direction."
      : "Vérifiez le dossier dans Drive, ou reconnectez le compte depuis la page ci-dessous.";

  await transport.sendMail({
    to: EMAIL_DIRECTION,
    from: process.env.EMAIL_FROM,
    subject: "Action requise : la connexion Google Drive d'EMI4M est interrompue",
    text: `Bonjour,\n\n${explication}\n\nTant que ce n'est pas réglé, les enseignants ne peuvent pas envoyer leurs documents (permis, carte d'identité). ${action}\n\n${urlAdmin}\n\nCe message est envoyé une fois, puis rappelé tous les 3 jours si le problème persiste.\n\nEMI4M Réservation`,
    html: htmlLienMotDePasse({
      titre: "Connexion Google Drive interrompue",
      intro: `${explication} Tant que ce n'est pas réglé, les enseignants ne peuvent pas envoyer leurs documents (permis, carte d'identité). ${action}`,
      url: urlAdmin,
      libelleBouton: "Ouvrir la page Google Drive",
    }),
  });
}

function htmlLienMotDePasse({
  titre,
  intro,
  url,
  libelleBouton,
}: {
  titre: string;
  intro: string;
  url: string;
  libelleBouton: string;
}) {
  return `
<body style="background:#f4f6f8;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="480" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:${COULEUR_SLATE};padding:24px;text-align:center;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;">${titre}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#2C3E50;">
              <p style="margin:0 0 24px;">${intro}</p>
              <table border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:6px;background:${COULEUR_ACCENT};">
                    <a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:bold;">${libelleBouton}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#7f8c8d;">Ce lien est valable 24h et à usage unique.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`;
}

interface AlerteAbsence {
  nom: string;
  total: number;
}

interface ParametresAlerteAbsences {
  prof: { nom: string; prenom: string };
  classe: string;
  alertes: AlerteAbsence[];
}

export async function envoyerMailAlerteAbsences(params: ParametresAlerteAbsences) {
  const { prof, classe, alertes } = params;
  const transport = creerTransporteur();

  const lignesTexte = alertes.map((a) => `- ${a.nom} : ${a.total} absences injustifiées`).join("\n");
  const lignesHtml = alertes
    .map((a) => `<li style="margin:0 0 6px;"><strong>${a.nom}</strong> — ${a.total} absences injustifiées</li>`)
    .join("");

  await transport.sendMail({
    to: EMAIL_DIRECTION,
    from: process.env.EMAIL_FROM,
    subject: `Alerte assiduité — ${classe} (${alertes.length} élève${alertes.length > 1 ? "s" : ""})`,
    text: `${prof.prenom} ${prof.nom} vient de pointer le cours ${classe}.\n\nSeuil d'absences injustifiées atteint pour :\n${lignesTexte}`,
    html: htmlDecision({
      couleur: "#C0392B",
      titre: "Alerte assiduité",
      corps: `<p style="margin:0 0 16px;">${prof.prenom} ${prof.nom} vient de pointer le cours <strong>${classe}</strong>.</p><p style="margin:0 0 8px;font-weight:bold;">Seuil d'absences injustifiées atteint pour :</p><ul style="margin:0;padding-left:20px;">${lignesHtml}</ul>`,
    }),
  });
}

function htmlDecision({ couleur, titre, corps }: { couleur: string; titre: string; corps: string }) {
  return `
<body style="background:#f4f6f8;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="480" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:${couleur};padding:24px;text-align:center;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;">${titre}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#2C3E50;">${corps}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`;
}
