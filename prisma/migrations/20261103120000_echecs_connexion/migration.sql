-- CreateTable
CREATE TABLE "EchecConnexion" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EchecConnexion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EchecConnexion_email_le_idx" ON "EchecConnexion"("email", "le");

