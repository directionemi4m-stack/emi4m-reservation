-- CreateTable
CREATE TABLE "ConsignesSecurite" (
    "id" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "contenu" JSONB NOT NULL,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsignesSecurite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeAlarme" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeChiffre" TEXT NOT NULL,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeAlarme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsignesSecurite_site_key" ON "ConsignesSecurite"("site");

-- CreateIndex
CREATE UNIQUE INDEX "CodeAlarme_userId_key" ON "CodeAlarme"("userId");

-- AddForeignKey
ALTER TABLE "CodeAlarme" ADD CONSTRAINT "CodeAlarme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

