-- AlterTable
ALTER TABLE "AttestationAchat" ADD COLUMN     "signatureAcheteur" BYTEA,
ADD COLUMN     "signatureVendeur" BYTEA,
ADD COLUMN     "signeSurPlaceLe" TIMESTAMP(3);

