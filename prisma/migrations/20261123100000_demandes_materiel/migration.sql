-- CreateEnum
CREATE TYPE "UrgenceMateriel" AS ENUM ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE');

-- CreateEnum
CREATE TYPE "StatutDemandeMateriel" AS ENUM ('NOUVELLE', 'A_L_ETUDE', 'VALIDEE', 'COMMANDEE', 'RECUE', 'REFUSEE');

-- CreateTable
CREATE TABLE "DemandeMateriel" (
    "id" TEXT NOT NULL,
    "auteurId" TEXT,
    "titre" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "details" TEXT,
    "urgence" "UrgenceMateriel" NOT NULL DEFAULT 'NORMALE',
    "statut" "StatutDemandeMateriel" NOT NULL DEFAULT 'NOUVELLE',
    "reponse" TEXT,
    "reponduLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeMateriel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropositionMateriel" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "libelle" TEXT,
    "url" TEXT,
    "prixCentimes" INTEGER,
    "retenue" BOOLEAN NOT NULL DEFAULT false,
    "auteurId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropositionMateriel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeMateriel_statut_urgence_idx" ON "DemandeMateriel"("statut", "urgence");

-- CreateIndex
CREATE INDEX "DemandeMateriel_auteurId_idx" ON "DemandeMateriel"("auteurId");

-- CreateIndex
CREATE INDEX "PropositionMateriel_demandeId_idx" ON "PropositionMateriel"("demandeId");

-- AddForeignKey
ALTER TABLE "DemandeMateriel" ADD CONSTRAINT "DemandeMateriel_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropositionMateriel" ADD CONSTRAINT "PropositionMateriel_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeMateriel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropositionMateriel" ADD CONSTRAINT "PropositionMateriel_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

