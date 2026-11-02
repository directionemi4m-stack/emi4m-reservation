-- CreateTable
CREATE TABLE "RemiseCles" (
    "id" TEXT NOT NULL,
    "profId" TEXT NOT NULL,
    "clesAutransMeaudre" INTEGER NOT NULL DEFAULT 0,
    "badgeLans" INTEGER NOT NULL DEFAULT 0,
    "clesVillard" INTEGER NOT NULL DEFAULT 0,
    "remiseLe" DATE NOT NULL,
    "signatureRemise" BYTEA,
    "remiseParId" TEXT,
    "restitueLe" DATE,
    "signatureRestitution" BYTEA,
    "restitutionPapier" BOOLEAN NOT NULL DEFAULT false,
    "restitueParId" TEXT,
    "commentaire" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemiseCles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistreCles" (
    "anneeDebut" INTEGER NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistreCles_pkey" PRIMARY KEY ("anneeDebut")
);

-- CreateIndex
CREATE INDEX "RemiseCles_profId_idx" ON "RemiseCles"("profId");

-- CreateIndex
CREATE INDEX "RemiseCles_remiseLe_idx" ON "RemiseCles"("remiseLe");

-- AddForeignKey
ALTER TABLE "RemiseCles" ADD CONSTRAINT "RemiseCles_profId_fkey" FOREIGN KEY ("profId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemiseCles" ADD CONSTRAINT "RemiseCles_remiseParId_fkey" FOREIGN KEY ("remiseParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemiseCles" ADD CONSTRAINT "RemiseCles_restitueParId_fkey" FOREIGN KEY ("restitueParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

