-- CreateTable
CREATE TABLE "DocumentASigner" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "attestation" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "pdf" BYTEA NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "publieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relanceLe" TIMESTAMP(3),
    "retireLe" TIMESTAMP(3),
    "registreFileId" TEXT,
    "registreUrl" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentASigner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureDocument" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "signeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "image" BYTEA NOT NULL,
    "driveFileId" TEXT,
    "url" TEXT,

    CONSTRAINT "SignatureDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignatureDocument_userId_idx" ON "SignatureDocument"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureDocument_documentId_version_userId_key" ON "SignatureDocument"("documentId", "version", "userId");

-- AddForeignKey
ALTER TABLE "SignatureDocument" ADD CONSTRAINT "SignatureDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentASigner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureDocument" ADD CONSTRAINT "SignatureDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

