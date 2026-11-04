-- CreateTable
CREATE TABLE "EtapeRentree" (
    "saison" INTEGER NOT NULL,
    "cle" TEXT NOT NULL,
    "faiteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtapeRentree_pkey" PRIMARY KEY ("saison","cle")
);

