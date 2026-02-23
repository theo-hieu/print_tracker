import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../prismaClient";
import validate from "../middleware/validate";
import auth from "../middleware/auth";
import { createModelSchema } from "../validators/schemas";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "stl_files");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe =
      Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/\.stl$/i.test(file.originalname))
      return cb(new Error("Only .stl files allowed"));
    cb(null, true);
  },
});

router.get("/", async (req: Request, res: Response) => {
  const models = await prisma.model.findMany({
    include: {
      ModelMaterials: {
        include: {
          MaterialType: { select: { TypeName: true } },
        },
      },
      Client: { select: { Name: true } }, // Useful for search
    },
    orderBy: { ModelName: "asc" },
  });
  res.json(models);
});

router.get("/:id/materials", async (req: Request, res: Response) => {
  const { id } = req.params;
  const materials = await prisma.modelMaterial.findMany({
    where: { ModelID: parseInt(id as string) },
    include: {
      MaterialType: { select: { TypeName: true } },
    },
  });
  res.json(materials);
});

router.post(
  "/",
  auth,
  validate(createModelSchema),
  async (req: Request, res: Response) => {
    const {
      ModelName,
      EstimatedCost,
      EstimatedPrintTime,
      EstimatedFilamentUsage,
      ClientID,
      STLFileLink,
    } = req.body;

    const newModel = await prisma.model.create({
      data: {
        ModelName,
        EstimatedCost: EstimatedCost || 0,
        STLFilePath: STLFileLink || null,
        EstimatedPrintTime: EstimatedPrintTime || null,
        EstimatedFilamentUsage: EstimatedFilamentUsage || 0,
        ClientID: ClientID ? parseInt(ClientID) : null,
      },
    });

    res.json({ message: "Model added", ModelID: newModel.ModelID });
  },
);

router.post("/model-materials", async (req: Request, res: Response) => {
  const { ModelID, MaterialTypeID, FilamentUsageGrams } = req.body;
  try {
    await prisma.modelMaterial.create({
      data: {
        ModelID: parseInt(ModelID),
        MaterialTypeID: parseInt(MaterialTypeID),
        FilamentUsageGrams: parseFloat(FilamentUsageGrams),
      },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.put("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    ModelName,
    EstimatedCost,
    EstimatedPrintTime,
    EstimatedFilamentUsage,
    ClientID,
    Materials,
  } = req.body;

  try {
    const updatedModel = await prisma.model.update({
      where: { ModelID: parseInt(id as string) },
      data: {
        ModelName,
        EstimatedCost: EstimatedCost || undefined,
        EstimatedPrintTime: EstimatedPrintTime || undefined,
        EstimatedFilamentUsage: EstimatedFilamentUsage || undefined,
        ClientID: ClientID ? parseInt(ClientID) : null,
        ...(Materials && {
          ModelMaterials: {
            deleteMany: {},
            create: Materials.map((m: any) => ({
              MaterialTypeID: parseInt(m.MaterialTypeID),
              FilamentUsageGrams: parseFloat(m.FilamentUsageGrams),
            })),
          },
        }),
      },
    });
    res.json({ message: "Model updated", model: updatedModel });
  } catch (error) {
    console.error("Failed to update model:", error);
    res.status(500).json({ error: "Failed to update model" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.model.delete({
    where: { ModelID: parseInt(id as string) },
  });
  res.json({ message: "Model deleted" });
});

// CSV Import/Export
import { parseCSV, generateCSV } from "../utils/csv";
const uploadCsv = multer({ storage: multer.memoryStorage() });

router.get("/export/csv", async (req: Request, res: Response) => {
  const models = await prisma.model.findMany();
  const csv = await generateCSV(
    models.map((m) => ({
      ...m,
      EstimatedCost: m.EstimatedCost?.toString(),
      EstimatedPrintTime: m.EstimatedPrintTime?.toString(),
      EstimatedFilamentUsage: m.EstimatedFilamentUsage?.toString(),
    })),
  );
  res.header("Content-Type", "text/csv");
  res.attachment("models.csv");
  res.send(csv);
});

router.post(
  "/import/csv",
  auth,
  uploadCsv.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const rows = await parseCSV(req.file.buffer);
      console.log(`Importing ${rows.length} models...`);

      for (const row of rows) {
        if (!row.ModelName) continue;

        const data: any = {
          ModelName: row.ModelName,
          EstimatedCost: row.EstimatedCost
            ? parseFloat(row.EstimatedCost)
            : undefined,
          EstimatedPrintTime: row.EstimatedPrintTime || null,
          EstimatedFilamentUsage: row.EstimatedFilamentUsage
            ? parseFloat(row.EstimatedFilamentUsage)
            : undefined,
          // STLFilePath is not imported from CSV
        };

        const existing = await prisma.model.findFirst({
          where: { ModelName: data.ModelName },
        });

        if (existing) {
          await prisma.model.update({
            where: { ModelID: existing.ModelID },
            data,
          });
        } else {
          await prisma.model.create({ data });
        }
      }

      res.json({ message: `Imported ${rows.length} models` });
    } catch (err) {
      console.error("CSV Import failed", err);
      res.status(500).json({ error: "Failed to process CSV file" });
    }
  },
);

export default router;
