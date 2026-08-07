
-- CreateTable
CREATE TABLE "ConfigGoogle" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "refreshToken" TEXT NOT NULL,
    "compteEmail" TEXT,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigGoogle_pkey" PRIMARY KEY ("id")
);

