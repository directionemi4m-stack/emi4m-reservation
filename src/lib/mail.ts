import { createTransport } from "nodemailer";
import type { NodemailerConfig } from "next-auth/providers/nodemailer";

type ParametresEnvoiVerification = Parameters<NodemailerConfig["sendVerificationRequest"]>[0];

const COULEUR_SLATE = "#2C3E50";
const COULEUR_ACCENT = "#2980B9";

export async function envoyerMagicLink(params: ParametresEnvoiVerification) {
  const { identifier: email, url, provider } = params;
  const { host } = new URL(url);
  const transport = createTransport(provider.server);

  const resultat = await transport.sendMail({
    to: email,
    from: provider.from,
    subject: "Connexion à EMI4M Réservation de salles",
    text: texteConnexion({ url, host }),
    html: htmlConnexion({ url, host }),
  });

  const echecs = resultat.rejected.filter(Boolean);
  if (echecs.length > 0) {
    throw new Error(`Envoi du lien de connexion impossible (${echecs.join(", ")})`);
  }
}

function texteConnexion({ url, host }: { url: string; host: string }) {
  return `Connexion à EMI4M Réservation de salles (${host})\n\nCliquez sur ce lien pour vous connecter :\n${url}\n\nCe lien est valable 15 minutes et ne peut être utilisé qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
}

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

function htmlConnexion({ url, host }: { url: string; host: string }) {
  return `
<body style="background:#f4f6f8;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="480" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:${COULEUR_SLATE};padding:24px;text-align:center;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;">EMI4M — Réservation de salles</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#2C3E50;">
              <p style="margin:0 0 16px;">Bonjour,</p>
              <p style="margin:0 0 24px;">Cliquez sur le bouton ci-dessous pour vous connecter à l'application de réservation des salles EMI4M (${host}).</p>
              <table border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:6px;background:${COULEUR_ACCENT};">
                    <a href="${url}" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:bold;">Se connecter</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#7f8c8d;">Ce lien est valable 15 minutes et à usage unique. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`;
}
