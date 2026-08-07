-- CreateTable
CREATE TABLE "TypeTrajet" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TypeTrajet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trajet" (
    "id" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mission" TEXT NOT NULL,
    "typeTrajetId" TEXT NOT NULL,
    "trajetNom" TEXT NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trajet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TypeTrajet_nom_key" ON "TypeTrajet"("nom");

-- CreateIndex
CREATE INDEX "Trajet_profId_date_idx" ON "Trajet"("profId", "date");

-- AddForeignKey
ALTER TABLE "Trajet" ADD CONSTRAINT "Trajet_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trajet" ADD CONSTRAINT "Trajet_typeTrajetId_fkey" FOREIGN KEY ("typeTrajetId") REFERENCES "TypeTrajet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
