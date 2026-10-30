-- Étape 2 : l'ancienne autorisation unique est remplacée par autorisationIntercours et
-- autorisationSortie16h30 (valeurs sauvegardées avant migration : toutes « A_RENSEIGNER »).
ALTER TABLE "EleveCham" DROP COLUMN "autorisationSortie";
