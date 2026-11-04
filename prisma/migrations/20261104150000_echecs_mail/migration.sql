-- CreateTable
CREATE TABLE "EchecMail" (
    "id" TEXT NOT NULL,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destinataire" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "vuLe" TIMESTAMP(3),

    CONSTRAINT "EchecMail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EchecMail_vuLe_idx" ON "EchecMail"("vuLe");

