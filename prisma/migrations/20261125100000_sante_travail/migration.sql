-- CreateEnum
CREATE TYPE "CategorieSuiviSante" AS ENUM ('SIG', 'SIA', 'SIR');

-- CreateEnum
CREATE TYPE "TypeVisiteMedicale" AS ENUM ('EMBAUCHE', 'PERIODIQUE', 'INTERMEDIAIRE', 'REPRISE', 'PRE_REPRISE', 'MI_CARRIERE', 'DEMANDE');

-- CreateEnum
CREATE TYPE "StatutVisiteMedicale" AS ENUM ('DEMANDEE', 'PREVUE', 'REALISEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "AvisVisiteMedicale" AS ENUM ('ATTESTATION', 'APTE', 'APTE_AMENAGEMENT', 'INAPTE');

-- CreateTable
CREATE TABLE "SalarieSante" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "poste" TEXT,
    "categorie" "CategorieSuiviSante" NOT NULL DEFAULT 'SIG',
    "embaucheLe" DATE,
    "sortieLe" DATE,
    "affilieLe" DATE,
    "desaffilieLe" DATE,
    "anneeNaissance" INTEGER,
    "notes" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalarieSante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisiteMedicale" (
    "id" TEXT NOT NULL,
    "salarieId" TEXT NOT NULL,
    "type" "TypeVisiteMedicale" NOT NULL,
    "statut" "StatutVisiteMedicale" NOT NULL,
    "date" DATE,
    "heure" TEXT,
    "lieu" TEXT,
    "avis" "AvisVisiteMedicale",
    "prochaineAvant" DATE,
    "commentaire" TEXT,
    "pdf" BYTEA,
    "nomFichier" TEXT,
    "salariePrevenuLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisiteMedicale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganismeSante" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nom" TEXT NOT NULL,
    "numeroAdherent" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganismeSante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactureSante" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "numero" TEXT,
    "objet" TEXT NOT NULL,
    "anneeCotisation" INTEGER NOT NULL,
    "montantCentimes" INTEGER,
    "nombreSalaries" INTEGER,
    "echeance" DATE,
    "payeeLe" DATE,
    "pdf" BYTEA NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "factureId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactureSante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalarieSante_userId_key" ON "SalarieSante"("userId");

-- CreateIndex
CREATE INDEX "VisiteMedicale_salarieId_idx" ON "VisiteMedicale"("salarieId");

-- CreateIndex
CREATE UNIQUE INDEX "FactureSante_factureId_key" ON "FactureSante"("factureId");

-- CreateIndex
CREATE INDEX "FactureSante_anneeCotisation_idx" ON "FactureSante"("anneeCotisation");

-- AddForeignKey
ALTER TABLE "SalarieSante" ADD CONSTRAINT "SalarieSante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisiteMedicale" ADD CONSTRAINT "VisiteMedicale_salarieId_fkey" FOREIGN KEY ("salarieId") REFERENCES "SalarieSante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureSante" ADD CONSTRAINT "FactureSante_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

