-- AlterTable
ALTER TABLE "Salle" ADD COLUMN     "conventionRequise" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ConventionSalle" (
    "id" TEXT NOT NULL,
    "demandeCreneauId" TEXT,
    "salle" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "horaire" TEXT NOT NULL,
    "prof" TEXT NOT NULL,
    "demandeMairieLe" DATE,
    "reponseMairieLe" DATE,
    "commentaire" TEXT,
    "fichierDriveId" TEXT,
    "fichierUrl" TEXT,
    "nomFichier" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConventionSalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistreConventions" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "fichierId" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "RegistreConventions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConventionSalle_demandeCreneauId_key" ON "ConventionSalle"("demandeCreneauId");

-- CreateIndex
CREATE INDEX "ConventionSalle_date_idx" ON "ConventionSalle"("date");

-- AddForeignKey
ALTER TABLE "ConventionSalle" ADD CONSTRAINT "ConventionSalle_demandeCreneauId_fkey" FOREIGN KEY ("demandeCreneauId") REFERENCES "DemandeCreneau"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Salles prêtées contre convention avec la mairie.
UPDATE "Salle" SET "conventionRequise" = true
WHERE ("nom", "communeId") IN (
  SELECT s."nom", s."communeId" FROM "Salle" s JOIN "Commune" c ON c."id" = s."communeId"
  WHERE (c."nom" = 'Villard-de-Lans' AND s."nom" IN ('La Coupole', 'La Verrière'))
     OR (c."nom" = 'Méaudre' AND s."nom" = 'Salle des fêtes')
);
