import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  const url = new URL(request.url);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Non autorisé", { status: 403 });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/admin/parametres/google-drive?erreur=1", url.origin));
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new NextResponse("OAuth Google non configuré (variables manquantes).", { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, `${url.origin}/api/admin/drive-oauth/callback`);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/admin/parametres/google-drive?erreur=2", url.origin));
    }

    oauth2Client.setCredentials(tokens);
    const { data: profil } = await google
      .oauth2({ version: "v2", auth: oauth2Client })
      .userinfo.get();

    await db.configGoogle.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", refreshToken: tokens.refresh_token, compteEmail: profil.email ?? null },
      update: { refreshToken: tokens.refresh_token, compteEmail: profil.email ?? null },
    });

    return NextResponse.redirect(new URL("/admin/parametres/google-drive?succes=1", url.origin));
  } catch (erreur) {
    console.error("Échec de l'échange OAuth Google Drive :", erreur);
    return NextResponse.redirect(new URL("/admin/parametres/google-drive?erreur=3", url.origin));
  }
}
