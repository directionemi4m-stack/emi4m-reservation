
-- CreateTable
CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeCours" NOT NULL DEFAULT 'INSTRUMENT',
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Discipline_nom_key" ON "Discipline"("nom");

