-- AlterTable
ALTER TABLE "Classe" ADD COLUMN     "agendaLibre" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Seance" ADD COLUMN     "horaire" TEXT,
ADD COLUMN     "lieu" TEXT;

