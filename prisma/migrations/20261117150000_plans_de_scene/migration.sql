-- CreateEnum
CREATE TYPE "CategorieElementScene" AS ENUM ('MUSICIEN', 'MOBILIER', 'MATERIEL', 'DECOR');

-- CreateEnum
CREATE TYPE "FormeElementScene" AS ENUM ('RECT', 'ROND');

-- AlterTable
ALTER TABLE "EvenementSaison" ADD COLUMN     "sceneId" TEXT;

-- CreateTable
CREATE TABLE "ElementScene" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" "CategorieElementScene" NOT NULL,
    "largeurCm" INTEGER NOT NULL,
    "profondeurCm" INTEGER NOT NULL,
    "forme" "FormeElementScene" NOT NULL DEFAULT 'RECT',
    "couleur" TEXT NOT NULL DEFAULT '#64748b',
    "abrege" TEXT,
    "chaise" BOOLEAN NOT NULL DEFAULT false,
    "pupitre" BOOLEAN NOT NULL DEFAULT false,
    "motsCles" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ElementScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneConcert" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "lieuId" TEXT,
    "largeurCm" INTEGER NOT NULL,
    "profondeurCm" INTEGER NOT NULL,
    "elements" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneConcert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanScene" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "sceneId" TEXT,
    "largeurCm" INTEGER NOT NULL,
    "profondeurCm" INTEGER NOT NULL,
    "elements" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "evenementId" TEXT,
    "inscriptionId" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "classeId" TEXT,
    "modele" BOOLEAN NOT NULL DEFAULT false,
    "auteurId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanScene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElementScene_nom_key" ON "ElementScene"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "SceneConcert_nom_key" ON "SceneConcert"("nom");

-- CreateIndex
CREATE INDEX "PlanScene_evenementId_ordre_idx" ON "PlanScene"("evenementId", "ordre");

-- CreateIndex
CREATE INDEX "PlanScene_inscriptionId_idx" ON "PlanScene"("inscriptionId");

-- CreateIndex
CREATE INDEX "PlanScene_classeId_idx" ON "PlanScene"("classeId");

-- AddForeignKey
ALTER TABLE "EvenementSaison" ADD CONSTRAINT "EvenementSaison_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "SceneConcert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneConcert" ADD CONSTRAINT "SceneConcert_lieuId_fkey" FOREIGN KEY ("lieuId") REFERENCES "LieuPresence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanScene" ADD CONSTRAINT "PlanScene_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "SceneConcert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanScene" ADD CONSTRAINT "PlanScene_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "EvenementSaison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanScene" ADD CONSTRAINT "PlanScene_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "InscriptionHeureMusicale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanScene" ADD CONSTRAINT "PlanScene_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanScene" ADD CONSTRAINT "PlanScene_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Catalogue de départ (modifiable dans l'appli)
INSERT INTO "ElementScene" ("id", "nom", "categorie", "largeurCm", "profondeurCm", "forme", "couleur", "abrege", "chaise", "pupitre", "motsCles", "ordre") VALUES
(substr(md5('Violon'), 1, 24), 'Violon', 'MUSICIEN', 75, 110, 'RECT', '#b45309', 'Vl', true, true, 'violon', 1),
(substr(md5('Alto'), 1, 24), 'Alto', 'MUSICIEN', 80, 115, 'RECT', '#b45309', 'Alt', true, true, 'alto', 2),
(substr(md5('Violoncelle'), 1, 24), 'Violoncelle', 'MUSICIEN', 110, 150, 'RECT', '#b45309', 'Vlc', true, true, 'violoncelle, cello', 3),
(substr(md5('Contrebasse'), 1, 24), 'Contrebasse', 'MUSICIEN', 100, 150, 'RECT', '#b45309', 'Cb', false, true, 'contrebasse', 4),
(substr(md5('Harpe'), 1, 24), 'Harpe', 'MUSICIEN', 100, 140, 'RECT', '#b45309', 'Hp', true, true, 'harpe', 5),
(substr(md5('Guitare'), 1, 24), 'Guitare', 'MUSICIEN', 80, 100, 'RECT', '#b45309', 'Gt', true, true, 'guitare, guitare classique', 6),
(substr(md5('Guitare électrique'), 1, 24), 'Guitare électrique', 'MUSICIEN', 70, 80, 'RECT', '#b45309', 'GtE', false, true, 'guitare électrique, guitare electrique', 7),
(substr(md5('Basse électrique'), 1, 24), 'Basse électrique', 'MUSICIEN', 70, 80, 'RECT', '#b45309', 'Bs', false, true, 'basse, basse électrique', 8),
(substr(md5('Flûte'), 1, 24), 'Flûte', 'MUSICIEN', 75, 100, 'RECT', '#15803d', 'Fl', true, true, 'flûte, flute, flûte traversière, flûte à bec', 9),
(substr(md5('Hautbois'), 1, 24), 'Hautbois', 'MUSICIEN', 75, 100, 'RECT', '#15803d', 'Hb', true, true, 'hautbois', 10),
(substr(md5('Clarinette'), 1, 24), 'Clarinette', 'MUSICIEN', 75, 100, 'RECT', '#15803d', 'Cl', true, true, 'clarinette', 11),
(substr(md5('Saxophone'), 1, 24), 'Saxophone', 'MUSICIEN', 75, 100, 'RECT', '#15803d', 'Sax', true, true, 'saxophone, sax', 12),
(substr(md5('Basson'), 1, 24), 'Basson', 'MUSICIEN', 85, 115, 'RECT', '#15803d', 'Bn', true, true, 'basson', 13),
(substr(md5('Trompette'), 1, 24), 'Trompette', 'MUSICIEN', 75, 105, 'RECT', '#b91c1c', 'Tp', true, true, 'trompette, cornet', 14),
(substr(md5('Cor'), 1, 24), 'Cor', 'MUSICIEN', 85, 115, 'RECT', '#b91c1c', 'Cor', true, true, 'cor', 15),
(substr(md5('Trombone'), 1, 24), 'Trombone', 'MUSICIEN', 85, 140, 'RECT', '#b91c1c', 'Tb', true, true, 'trombone', 16),
(substr(md5('Tuba / euphonium'), 1, 24), 'Tuba / euphonium', 'MUSICIEN', 95, 125, 'RECT', '#b91c1c', 'Tu', true, true, 'tuba, euphonium', 17),
(substr(md5('Accordéon'), 1, 24), 'Accordéon', 'MUSICIEN', 75, 100, 'RECT', '#334155', 'Acc', true, true, 'accordéon, accordeon', 18),
(substr(md5('Batterie'), 1, 24), 'Batterie', 'MUSICIEN', 200, 180, 'RECT', '#7c3aed', 'Bat', false, false, 'batterie', 19),
(substr(md5('Percussions (table)'), 1, 24), 'Percussions (table)', 'MUSICIEN', 150, 100, 'RECT', '#7c3aed', 'Perc', false, true, 'percussion, percussions', 20),
(substr(md5('Timbales (4)'), 1, 24), 'Timbales (4)', 'MUSICIEN', 250, 180, 'RECT', '#7c3aed', 'Timb', false, true, 'timbales', 21),
(substr(md5('Marimba / xylophone'), 1, 24), 'Marimba / xylophone', 'MUSICIEN', 250, 120, 'RECT', '#7c3aed', 'Mar', false, true, 'marimba, xylophone', 22),
(substr(md5('Vibraphone'), 1, 24), 'Vibraphone', 'MUSICIEN', 150, 100, 'RECT', '#7c3aed', 'Vib', false, true, 'vibraphone', 23),
(substr(md5('Chant (soliste)'), 1, 24), 'Chant (soliste)', 'MUSICIEN', 60, 70, 'RECT', '#0e7490', 'Ch', false, false, 'chant, voix', 24),
(substr(md5('Choriste'), 1, 24), 'Choriste', 'MUSICIEN', 50, 50, 'RECT', '#0e7490', 'Chœ', false, false, 'chœur, choeur, chorale', 25),
(substr(md5('Chef (avec podium)'), 1, 24), 'Chef (avec podium)', 'MUSICIEN', 100, 100, 'RECT', '#334155', 'Chef', false, true, 'chef, direction', 26),
(substr(md5('Piano à queue'), 1, 24), 'Piano à queue', 'MATERIEL', 150, 220, 'RECT', '#334155', 'Piano', false, false, 'piano', 27),
(substr(md5('Piano droit'), 1, 24), 'Piano droit', 'MATERIEL', 150, 110, 'RECT', '#334155', 'Pno', false, false, 'piano droit', 28),
(substr(md5('Piano numérique'), 1, 24), 'Piano numérique', 'MATERIEL', 140, 90, 'RECT', '#334155', 'Pno N', false, false, 'piano numérique, clavier', 29),
(substr(md5('Chaise'), 1, 24), 'Chaise', 'MOBILIER', 50, 50, 'RECT', '#64748b', NULL, true, false, NULL, 30),
(substr(md5('Pupitre'), 1, 24), 'Pupitre', 'MOBILIER', 50, 35, 'RECT', '#64748b', NULL, false, true, NULL, 31),
(substr(md5('Tabouret haut'), 1, 24), 'Tabouret haut', 'MOBILIER', 45, 45, 'ROND', '#64748b', 'Tab', false, false, NULL, 32),
(substr(md5('Banc de piano'), 1, 24), 'Banc de piano', 'MOBILIER', 70, 40, 'RECT', '#64748b', 'Banc', false, false, NULL, 33),
(substr(md5('Table'), 1, 24), 'Table', 'MOBILIER', 120, 60, 'RECT', '#64748b', 'Table', false, false, NULL, 34),
(substr(md5('Praticable 2 × 1 m'), 1, 24), 'Praticable 2 × 1 m', 'MATERIEL', 200, 100, 'RECT', '#94a3b8', 'Prat.', false, false, NULL, 35),
(substr(md5('Ampli guitare'), 1, 24), 'Ampli guitare', 'MATERIEL', 60, 35, 'RECT', '#475569', 'Ampli', false, false, NULL, 36),
(substr(md5('Ampli basse'), 1, 24), 'Ampli basse', 'MATERIEL', 60, 50, 'RECT', '#475569', 'Ampli B', false, false, NULL, 37),
(substr(md5('Retour de scène'), 1, 24), 'Retour de scène', 'MATERIEL', 60, 45, 'RECT', '#475569', 'Ret.', false, false, NULL, 38),
(substr(md5('Micro sur pied'), 1, 24), 'Micro sur pied', 'MATERIEL', 50, 50, 'ROND', '#475569', 'Mic', false, false, NULL, 39),
(substr(md5('Enceinte'), 1, 24), 'Enceinte', 'MATERIEL', 45, 40, 'RECT', '#475569', 'HP', false, false, NULL, 40),
(substr(md5('Table de mixage'), 1, 24), 'Table de mixage', 'MATERIEL', 120, 70, 'RECT', '#475569', 'Mix', false, false, NULL, 41),
(substr(md5('Multiprise / alimentation'), 1, 24), 'Multiprise / alimentation', 'MATERIEL', 25, 25, 'ROND', '#ca8a04', '220V', false, false, NULL, 42),
(substr(md5('Pilier'), 1, 24), 'Pilier', 'DECOR', 40, 40, 'RECT', '#78716c', '', false, false, NULL, 43),
(substr(md5('Escalier / accès'), 1, 24), 'Escalier / accès', 'DECOR', 120, 80, 'RECT', '#78716c', 'Accès', false, false, NULL, 44),
(substr(md5('Zone inutilisable'), 1, 24), 'Zone inutilisable', 'DECOR', 200, 100, 'RECT', '#a8a29e', '✕', false, false, NULL, 45);
