
-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE CASCADE ON UPDATE CASCADE;

