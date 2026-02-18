/*
  Warnings:

  - The primary key for the `JobMaterial` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `MaterialID` on the `JobMaterial` table. All the data in the column will be lost.
  - The primary key for the `ModelMaterial` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `MaterialID` on the `ModelMaterial` table. All the data in the column will be lost.
  - Added the required column `MaterialTypeID` to the `JobMaterial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `MaterialTypeID` to the `ModelMaterial` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "JobMaterial" DROP CONSTRAINT "JobMaterial_MaterialID_fkey";

-- DropForeignKey
ALTER TABLE "ModelMaterial" DROP CONSTRAINT "ModelMaterial_MaterialID_fkey";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "ActualCost" DECIMAL(10,2),
ADD COLUMN     "ActualPrintTimeMin" INTEGER,
ADD COLUMN     "AdditionalCost" DECIMAL(10,2),
ADD COLUMN     "ClientID" INTEGER,
ADD COLUMN     "EstimatedCost" DECIMAL(10,2),
ADD COLUMN     "LaborCost" DECIMAL(10,2),
ADD COLUMN     "MarkupPercent" DECIMAL(5,2),
ADD COLUMN     "ScheduledDate" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "JobMaterial" DROP CONSTRAINT "JobMaterial_pkey",
DROP COLUMN "MaterialID",
ADD COLUMN     "MaterialTypeID" INTEGER NOT NULL,
ADD CONSTRAINT "JobMaterial_pkey" PRIMARY KEY ("JobID", "MaterialTypeID");

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "CostPerGram" DECIMAL(10,4),
ADD COLUMN     "ReorderThresholdGrams" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Model" ADD COLUMN     "AdditionalCost" DECIMAL(10,2),
ADD COLUMN     "ClientID" INTEGER,
ADD COLUMN     "LaborCost" DECIMAL(10,2),
ADD COLUMN     "MarkupPercent" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "ModelMaterial" DROP CONSTRAINT "ModelMaterial_pkey",
DROP COLUMN "MaterialID",
ADD COLUMN     "MaterialTypeID" INTEGER NOT NULL,
ADD CONSTRAINT "ModelMaterial_pkey" PRIMARY KEY ("ModelID", "MaterialTypeID");

-- AlterTable
ALTER TABLE "Printer" ADD COLUMN     "HourlyRate" DECIMAL(10,2),
ADD COLUMN     "MaintenanceIntervalHours" INTEGER,
ADD COLUMN     "MaxCarboys" INTEGER,
ADD COLUMN     "PrinterType" VARCHAR(50),
ADD COLUMN     "TotalPrintHours" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "MaterialType" (
    "MaterialTypeID" SERIAL NOT NULL,
    "TypeName" TEXT NOT NULL,
    "Description" TEXT,

    CONSTRAINT "MaterialType_pkey" PRIMARY KEY ("MaterialTypeID")
);

-- CreateTable
CREATE TABLE "PrinterCarboy" (
    "PrinterID" INTEGER NOT NULL,
    "AreaNumber" INTEGER NOT NULL,
    "SlotNumber" INTEGER NOT NULL,
    "MaterialID" INTEGER,

    CONSTRAINT "PrinterCarboy_pkey" PRIMARY KEY ("PrinterID","AreaNumber","SlotNumber")
);

-- CreateTable
CREATE TABLE "Client" (
    "ClientID" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "Title" TEXT,
    "Department" TEXT,
    "Chartstring" TEXT,
    "PI" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("ClientID")
);

-- CreateTable
CREATE TABLE "JobPhoto" (
    "PhotoID" SERIAL NOT NULL,
    "JobID" INTEGER NOT NULL,
    "FilePath" VARCHAR(1024) NOT NULL,
    "Caption" VARCHAR(255),
    "PhotoType" VARCHAR(20),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("PhotoID")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialType_TypeName_key" ON "MaterialType"("TypeName");

-- AddForeignKey
ALTER TABLE "PrinterCarboy" ADD CONSTRAINT "PrinterCarboy_PrinterID_fkey" FOREIGN KEY ("PrinterID") REFERENCES "Printer"("PrinterID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterCarboy" ADD CONSTRAINT "PrinterCarboy_MaterialID_fkey" FOREIGN KEY ("MaterialID") REFERENCES "Material"("MaterialID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "Client"("ClientID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelMaterial" ADD CONSTRAINT "ModelMaterial_MaterialTypeID_fkey" FOREIGN KEY ("MaterialTypeID") REFERENCES "MaterialType"("MaterialTypeID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "Client"("ClientID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMaterial" ADD CONSTRAINT "JobMaterial_MaterialTypeID_fkey" FOREIGN KEY ("MaterialTypeID") REFERENCES "MaterialType"("MaterialTypeID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "Job"("JobID") ON DELETE CASCADE ON UPDATE CASCADE;
