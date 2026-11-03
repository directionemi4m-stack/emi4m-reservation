-- CreateTable
CREATE TABLE "ModeleMailMairie" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "sujet" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeleMailMairie_pkey" PRIMARY KEY ("id")
);

