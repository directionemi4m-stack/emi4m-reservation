
-- CreateTable
CREATE TABLE "TypeEvenementAccessoire" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TypeEvenementAccessoire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiviteAccessoire" (
    "id" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "typeEvenementId" TEXT NOT NULL,
    "typeEvenementNom" TEXT NOT NULL,
    "duree" TEXT NOT NULL,
    "supprimeLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiviteAccessoire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TypeEvenementAccessoire_nom_key" ON "TypeEvenementAccessoire"("nom");

-- CreateIndex
CREATE INDEX "ActiviteAccessoire_profId_date_idx" ON "ActiviteAccessoire"("profId", "date");

-- AddForeignKey
ALTER TABLE "ActiviteAccessoire" ADD CONSTRAINT "ActiviteAccessoire_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiviteAccessoire" ADD CONSTRAINT "ActiviteAccessoire_typeEvenementId_fkey" FOREIGN KEY ("typeEvenementId") REFERENCES "TypeEvenementAccessoire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

