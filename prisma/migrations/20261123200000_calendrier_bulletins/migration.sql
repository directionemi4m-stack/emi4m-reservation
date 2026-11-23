-- CreateTable
CREATE TABLE "CalendrierBulletinCham" (
    "id" TEXT NOT NULL,
    "anneeDebut" INTEGER NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "ouverture" DATE NOT NULL,
    "relance" DATE NOT NULL,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendrierBulletinCham_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendrierBulletinCham_anneeDebut_trimestre_key" ON "CalendrierBulletinCham"("anneeDebut", "trimestre");

