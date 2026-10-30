-- CreateEnum
CREATE TYPE "MatiereCham" AS ENUM ('FORMATION_MUSICALE', 'INSTRUMENT', 'HISTOIRE_MUSIQUE', 'PRATIQUES_COLLECTIVES');

-- CreateTable
CREATE TABLE "SuiviCham" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "matiere" "MatiereCham" NOT NULL,
    "precision" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuiviCham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppreciationCham" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "matiere" "MatiereCham" NOT NULL,
    "precision" TEXT,
    "anneeDebut" INTEGER NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "signature" BYTEA NOT NULL,
    "signeLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppreciationCham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureBulletin" (
    "userId" TEXT NOT NULL,
    "image" BYTEA NOT NULL,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureBulletin_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BulletinCham" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "anneeDebut" INTEGER NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "bilan" TEXT,
    "signatureDirection" BYTEA,
    "directionId" TEXT,
    "signeDirectionLe" TIMESTAMP(3),
    "documentDriveId" TEXT,
    "documentUrl" TEXT,
    "documentMajLe" TIMESTAMP(3),

    CONSTRAINT "BulletinCham_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonnementPush" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbonnementPush_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RappelBulletinCham" (
    "id" TEXT NOT NULL,
    "anneeDebut" INTEGER NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "envoyeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RappelBulletinCham_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuiviCham_profId_idx" ON "SuiviCham"("profId");

-- CreateIndex
CREATE UNIQUE INDEX "SuiviCham_eleveId_profId_matiere_key" ON "SuiviCham"("eleveId", "profId", "matiere");

-- CreateIndex
CREATE INDEX "AppreciationCham_anneeDebut_trimestre_idx" ON "AppreciationCham"("anneeDebut", "trimestre");

-- CreateIndex
CREATE UNIQUE INDEX "AppreciationCham_eleveId_profId_matiere_anneeDebut_trimestr_key" ON "AppreciationCham"("eleveId", "profId", "matiere", "anneeDebut", "trimestre");

-- CreateIndex
CREATE UNIQUE INDEX "BulletinCham_eleveId_anneeDebut_trimestre_key" ON "BulletinCham"("eleveId", "anneeDebut", "trimestre");

-- CreateIndex
CREATE UNIQUE INDEX "AbonnementPush_endpoint_key" ON "AbonnementPush"("endpoint");

-- CreateIndex
CREATE INDEX "AbonnementPush_userId_idx" ON "AbonnementPush"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RappelBulletinCham_anneeDebut_trimestre_type_key" ON "RappelBulletinCham"("anneeDebut", "trimestre", "type");

-- AddForeignKey
ALTER TABLE "SuiviCham" ADD CONSTRAINT "SuiviCham_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "EleveCham"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuiviCham" ADD CONSTRAINT "SuiviCham_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppreciationCham" ADD CONSTRAINT "AppreciationCham_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "EleveCham"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppreciationCham" ADD CONSTRAINT "AppreciationCham_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureBulletin" ADD CONSTRAINT "SignatureBulletin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinCham" ADD CONSTRAINT "BulletinCham_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "EleveCham"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinCham" ADD CONSTRAINT "BulletinCham_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonnementPush" ADD CONSTRAINT "AbonnementPush_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

