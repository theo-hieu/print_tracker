import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedMaterialTypes() {
  const materialTypes = [
    { TypeName: "Vero Clear", Description: "Clear rigid material" },
    { TypeName: "Vero White", Description: "White rigid material" },
    { TypeName: "Vero Magenta", Description: "Magenta rigid material" },
    { TypeName: "Vero Black", Description: "Black rigid material" },
    {
      TypeName: "Agilus30 Black",
      Description: "Black flexible rubber-like material",
    },
    {
      TypeName: "Agilus30 White",
      Description: "White flexible rubber-like material",
    },
    {
      TypeName: "Agilus30 Magenta",
      Description: "Magenta flexible rubber-like material",
    },
    {
      TypeName: "Agilus30 Blue",
      Description: "Blue flexible rubber-like material",
    },
    {
      TypeName: "Agilus30 Yellow",
      Description: "Yellow flexible rubber-like material",
    },
    {
      TypeName: "Agilus30 Red",
      Description: "Red flexible rubber-like material",
    },
    {
      TypeName: "TissueMatrix",
      Description: "Support material for complex geometries",
    },
  ];

  console.log("Seeding material types...");

  for (const mt of materialTypes) {
    await prisma.materialType.upsert({
      where: { TypeName: mt.TypeName },
      update: {},
      create: mt,
    });
  }

  console.log("Material types seeded successfully!");
}

async function main() {
  try {
    await seedMaterialTypes();
  } catch (error) {
    console.error("Error seeding material types:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
