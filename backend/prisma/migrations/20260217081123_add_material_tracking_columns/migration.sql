-- CreateTable
CREATE TABLE "User" (
    "UserID" SERIAL NOT NULL,
    "UserName" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "PasswordHash" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "Material" (
    "MaterialID" SERIAL NOT NULL,
    "MaterialName" TEXT NOT NULL,
    "Color" TEXT,
    "Type" VARCHAR(50),
    "InitialQuantityGrams" DECIMAL(10,2),
    "CurrentQuantityGrams" DECIMAL(10,2),
    "ExpirationDate" DATE,
    "LotNumber" VARCHAR(100),
    "Location" VARCHAR(100),

    CONSTRAINT "Material_pkey" PRIMARY KEY ("MaterialID")
);

-- CreateTable
CREATE TABLE "Printer" (
    "PrinterID" SERIAL NOT NULL,
    "PrinterName" TEXT NOT NULL,
    "Location" VARCHAR(100),
    "Status" VARCHAR(50),
    "LastMaintenance" DATE,
    "NextMaintenance" DATE,
    "Description" TEXT,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("PrinterID")
);

-- CreateTable
CREATE TABLE "Model" (
    "ModelID" SERIAL NOT NULL,
    "ModelName" TEXT NOT NULL,
    "EstimatedCost" DECIMAL(10,2),
    "STLFilePath" VARCHAR(1024),
    "EstimatedPrintTime" VARCHAR(50),
    "EstimatedFilamentUsage" DECIMAL(10,2),

    CONSTRAINT "Model_pkey" PRIMARY KEY ("ModelID")
);

-- CreateTable
CREATE TABLE "ModelMaterial" (
    "ModelID" INTEGER NOT NULL,
    "MaterialID" INTEGER NOT NULL,
    "FilamentUsageGrams" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ModelMaterial_pkey" PRIMARY KEY ("ModelID","MaterialID")
);

-- CreateTable
CREATE TABLE "Job" (
    "JobID" SERIAL NOT NULL,
    "JobName" TEXT NOT NULL,
    "UserID" INTEGER NOT NULL,
    "ModelID" INTEGER NOT NULL,
    "PrinterID" INTEGER,
    "PrintDate" DATE NOT NULL,
    "Status" VARCHAR(50),
    "Notes" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("JobID")
);

-- CreateTable
CREATE TABLE "JobMaterial" (
    "JobID" INTEGER NOT NULL,
    "MaterialID" INTEGER NOT NULL,
    "MaterialUsageGrams" DECIMAL(10,2) NOT NULL,
    "MaterialStartGrams" DECIMAL(10,2),
    "MaterialEndGrams" DECIMAL(10,2),
    "ActualUsageGrams" DECIMAL(10,2),

    CONSTRAINT "JobMaterial_pkey" PRIMARY KEY ("JobID","MaterialID")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_Email_key" ON "User"("Email");

-- AddForeignKey
ALTER TABLE "ModelMaterial" ADD CONSTRAINT "ModelMaterial_ModelID_fkey" FOREIGN KEY ("ModelID") REFERENCES "Model"("ModelID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelMaterial" ADD CONSTRAINT "ModelMaterial_MaterialID_fkey" FOREIGN KEY ("MaterialID") REFERENCES "Material"("MaterialID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_ModelID_fkey" FOREIGN KEY ("ModelID") REFERENCES "Model"("ModelID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_PrinterID_fkey" FOREIGN KEY ("PrinterID") REFERENCES "Printer"("PrinterID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMaterial" ADD CONSTRAINT "JobMaterial_JobID_fkey" FOREIGN KEY ("JobID") REFERENCES "Job"("JobID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMaterial" ADD CONSTRAINT "JobMaterial_MaterialID_fkey" FOREIGN KEY ("MaterialID") REFERENCES "Material"("MaterialID") ON DELETE CASCADE ON UPDATE CASCADE;
