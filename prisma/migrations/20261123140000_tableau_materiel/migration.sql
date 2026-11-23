-- CreateTable
CREATE TABLE "TableauMateriel" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "fichierId" TEXT,
    "url" TEXT,
    "majLe" TIMESTAMP(3),
    "echecLe" TIMESTAMP(3),

    CONSTRAINT "TableauMateriel_pkey" PRIMARY KEY ("id")
);

