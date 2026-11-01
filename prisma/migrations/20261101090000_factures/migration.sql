-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "montantCentimes" INTEGER,
    "objet" TEXT,
    "nomFichier" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ajouteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ArticleInventaireToFacture" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArticleInventaireToFacture_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Facture_date_idx" ON "Facture"("date");

-- CreateIndex
CREATE INDEX "Facture_fournisseur_idx" ON "Facture"("fournisseur");

-- CreateIndex
CREATE INDEX "_ArticleInventaireToFacture_B_index" ON "_ArticleInventaireToFacture"("B");

-- AddForeignKey
ALTER TABLE "_ArticleInventaireToFacture" ADD CONSTRAINT "_ArticleInventaireToFacture_A_fkey" FOREIGN KEY ("A") REFERENCES "ArticleInventaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleInventaireToFacture" ADD CONSTRAINT "_ArticleInventaireToFacture_B_fkey" FOREIGN KEY ("B") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

