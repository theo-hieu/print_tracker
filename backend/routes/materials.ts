import express, { Request, Response } from "express";
import prisma from "../prismaClient";
import validate from "../middleware/validate";
import auth from "../middleware/auth";
import { createMaterialSchema } from "../validators/schemas";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const materials = await prisma.material.findMany({
    include: { MaterialType: true },
    orderBy: { MaterialName: "asc" },
  });
  res.json(materials);
});

// GET materials with low-stock alerts
router.get("/alerts", async (req: Request, res: Response) => {
  const materials = await prisma.material.findMany({
    where: {
      ReorderThresholdGrams: { not: null },
    },
  });

  const alerts = materials.filter((m) => {
    if (m.CurrentQuantityGrams === null || m.ReorderThresholdGrams === null)
      return false;
    return Number(m.CurrentQuantityGrams) <= Number(m.ReorderThresholdGrams);
  });

  res.json(alerts);
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const material = await prisma.material.findUnique({
    where: { MaterialID: parseInt(id as string) },
  });
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  res.json(material);
});

router.post(
  "/",
  auth,
  validate(createMaterialSchema),
  async (req: Request, res: Response) => {
    const {
      MaterialName,
      Color,
      Type,
      MaterialTypeID,
      InitialQuantityGrams,
      CurrentQuantityGrams,
      ReorderThresholdGrams,
      ExpirationDate,
      LotNumber,
      Location,
    } = req.body;

    // Auto-set MaterialName from MaterialType if provided
    let resolvedName = MaterialName;
    if (MaterialTypeID) {
      const mt = await prisma.materialType.findUnique({
        where: { MaterialTypeID: parseInt(MaterialTypeID) },
      });
      if (mt) resolvedName = mt.TypeName;
    }

    const newMaterial = await prisma.material.create({
      data: {
        MaterialName: resolvedName,
        Color,
        Type,
        MaterialTypeID: MaterialTypeID ? parseInt(MaterialTypeID) : null,
        InitialQuantityGrams,
        CurrentQuantityGrams,
        ReorderThresholdGrams,
        ExpirationDate: ExpirationDate ? new Date(ExpirationDate) : null,
        LotNumber,
        Location,
      },
    });
    res.json({ message: "Material added", MaterialID: newMaterial.MaterialID });
  },
);

router.put("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    MaterialName,
    Color,
    Type,
    MaterialTypeID,
    InitialQuantityGrams,
    CurrentQuantityGrams,
    ReorderThresholdGrams,
    ExpirationDate,
    LotNumber,
    Location,
  } = req.body;

  // Auto-set MaterialName from MaterialType if provided
  let resolvedName = MaterialName;
  if (MaterialTypeID) {
    const mt = await prisma.materialType.findUnique({
      where: { MaterialTypeID: parseInt(MaterialTypeID) },
    });
    if (mt) resolvedName = mt.TypeName;
  }

  try {
    const updatedMaterial = await prisma.material.update({
      where: { MaterialID: parseInt(id as string) },
      data: {
        MaterialName: resolvedName,
        Color,
        Type,
        MaterialTypeID: MaterialTypeID ? parseInt(MaterialTypeID) : null,
        InitialQuantityGrams,
        CurrentQuantityGrams,
        ReorderThresholdGrams,
        ExpirationDate: ExpirationDate ? new Date(ExpirationDate) : null,
        LotNumber,
        Location,
      },
    });
    res.json({ message: "Material updated", material: updatedMaterial });
  } catch (error) {
    res.status(500).json({ error: "Failed to update material" });
  }
});

router.delete("/:id", auth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await prisma.material.delete({ where: { MaterialID: id } });
  res.json({ message: "Material deleted" });
});

// CSV Import/Export
import multer from "multer";
import { parseCSV, generateCSV } from "../utils/csv";
const upload = multer({ storage: multer.memoryStorage() });

router.get("/export/csv", async (req: Request, res: Response) => {
  const materials = await prisma.material.findMany();
  const csv = await generateCSV(
    materials.map((m) => ({
      ...m,
      InitialQuantityGrams: m.InitialQuantityGrams?.toString(),
      CurrentQuantityGrams: m.CurrentQuantityGrams?.toString(),
      ReorderThresholdGrams: m.ReorderThresholdGrams?.toString(),
      ExpirationDate: m.ExpirationDate
        ? m.ExpirationDate.toISOString().split("T")[0]
        : "",
    })),
  );
  res.header("Content-Type", "text/csv");
  res.attachment("materials.csv");
  res.send(csv);
});

router.post(
  "/import/csv",
  auth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const rows = await parseCSV(req.file.buffer);
      console.log(`Importing ${rows.length} materials...`);

      for (const row of rows) {
        // Basic mapping and validation
        if (!row.MaterialName) continue;

        const data: any = {
          MaterialName: row.MaterialName,
          Color: row.Color || null,
          Type: row.Type || "Model",
          InitialQuantityGrams: row.InitialQuantityGrams
            ? parseFloat(row.InitialQuantityGrams)
            : undefined,
          CurrentQuantityGrams: row.CurrentQuantityGrams
            ? parseFloat(row.CurrentQuantityGrams)
            : undefined,
          ReorderThresholdGrams: row.ReorderThresholdGrams
            ? parseFloat(row.ReorderThresholdGrams)
            : undefined,
          LotNumber: row.LotNumber || null,
          Location: row.Location || null,
        };

        if (row.ExpirationDate) {
          const date = new Date(row.ExpirationDate);
          if (!isNaN(date.getTime())) data.ExpirationDate = date;
        }

        // Upsert by MaterialName + Color (Mock unique constraint logic)
        // Since we don't have a unique constraint on Name+Color, we'll try to find one first or create
        const existing = await prisma.material.findFirst({
          where: {
            MaterialName: data.MaterialName,
            Color: data.Color || null,
          },
        });

        if (existing) {
          await prisma.material.update({
            where: { MaterialID: existing.MaterialID },
            data,
          });
        } else {
          await prisma.material.create({ data });
        }
      }

      res.json({ message: `Imported ${rows.length} materials` });
    } catch (err) {
      console.error("CSV Import failed", err);
      res.status(500).json({ error: "Failed to process CSV file" });
    }
  },
);

export default router;
