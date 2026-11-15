-- CreateTable
CREATE TABLE "JourFerie" (
    "date" DATE NOT NULL,
    "declarePar" TEXT NOT NULL,
    "declareLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourFerie_pkey" PRIMARY KEY ("date")
);

