import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Non autorisé", { status: 403 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new NextResponse("OAuth Google non configuré (variables manquantes).", { status: 500 });
  }

  const origine = new URL(request.url).origin;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, `${origine}/api/admin/drive-oauth/callback`);

  const urlConsentement = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      // Portée volontairement restreinte aux fichiers créés par l'appli elle-même
      // (dossier "Documents profs" et son contenu) — un scope "sensible" plutôt que
      // "restreint", ce qui allège beaucoup la vérification Google nécessaire pour
      // publier l'appli en production et faire disparaître l'expiration à 7 jours
      // du jeton (propre au mode Test).
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });

  return NextResponse.redirect(urlConsentement);
}
