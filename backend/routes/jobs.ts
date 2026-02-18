import express, { Request, Response } from "express";
import prisma from "../prismaClient";
import validate from "../middleware/validate";
import auth from "../middleware/auth";
import { createJobSchema, updateJobSchema } from "../validators/schemas";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Photo upload setup
const photoDir = path.join(__dirname, "..", "job_photos");
if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photoDir),
  filename: (req, file, cb) => {
    const safe =
      Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, safe);
  },
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.originalname))
      return cb(new Error("Only image files allowed"));
    cb(null, true);
  },
});

// GET all jobs with material tracking data
router.get("/", async (req: Request, res: Response) => {
  const jobs = await prisma.job.findMany({
    include: {
      User: { select: { UserName: true } },
      Model: { select: { ModelName: true } },
      Printer: { select: { PrinterName: true, PrinterType: true } },
      JobMaterials: {
        include: {
          MaterialType: { select: { TypeName: true } },
        },
      },
      JobPhotos: true,
      Client: { select: { Name: true, ClientID: true } },
    },
    orderBy: { PrintDate: "desc" },
  });

  const flattened = jobs.map((job: any) => ({
    ...job,
    UserName: job.User?.UserName,
    ModelName: job.Model?.ModelName,
    PrinterName: job.Printer?.PrinterName,
    PrinterType: job.Printer?.PrinterType,
    JobMaterials: job.JobMaterials.map((jm: any) => ({
      MaterialTypeID: jm.MaterialTypeID,
      MaterialTypeName: jm.MaterialType?.TypeName,
      MaterialUsageGrams: jm.MaterialUsageGrams,
      MaterialStartGrams: jm.MaterialStartGrams,
      MaterialEndGrams: jm.MaterialEndGrams,
      ActualUsageGrams: jm.ActualUsageGrams,
    })),
    ClientName: job.Client?.Name,
    ClientID: job.Client?.ClientID,
    User: undefined,
    Model: undefined,
    Printer: undefined,
    Client: undefined,
  }));

  res.json(flattened);
});

// GET scheduled jobs (for calendar view)
router.get("/scheduled", async (req: Request, res: Response) => {
  const jobs = await prisma.job.findMany({
    where: {
      ScheduledDate: { not: null },
    },
    include: {
      User: { select: { UserName: true } },
      Printer: { select: { PrinterName: true } },
      Model: { select: { ModelName: true } },
    },
    orderBy: { ScheduledDate: "asc" },
  });
  res.json(jobs);
});

// CREATE a new job with material tracking and cost calculation
router.post(
  "/",
  auth,
  validate(createJobSchema),
  async (req: Request, res: Response) => {
    const {
      JobName,
      UserID,
      ModelID,
      PrintDate,
      Status,
      PrinterID,
      Notes,
      ScheduledDate,
      ActualPrintTimeMin,
      ClientID,
    } = req.body;

    // Create the job first
    const job = await prisma.job.create({
      data: {
        JobName,
        UserID,
        ModelID,
        PrintDate: new Date(PrintDate),
        Status: Status || "queued",
        PrinterID: PrinterID || null,
        Notes: Notes || null,
        ScheduledDate: ScheduledDate ? new Date(ScheduledDate) : null,
        ActualPrintTimeMin: ActualPrintTimeMin || null,
        ClientID: ClientID || null,
      },
    });

    // Auto-populate JobMaterials from ModelMaterials (estimation only, no deduction)
    let totalEstimatedCost = 0;
    try {
      const modelMaterials = await prisma.modelMaterial.findMany({
        where: { ModelID },
        include: { MaterialType: true },
      });

      for (const mm of modelMaterials) {
        const usageGrams = Number(mm.FilamentUsageGrams);

        // Create JobMaterial entry for estimation (no Material deduction yet)
        await prisma.jobMaterial.create({
          data: {
            JobID: job.JobID,
            MaterialTypeID: mm.MaterialTypeID,
            MaterialUsageGrams: mm.FilamentUsageGrams,
            // Start/End grams will be filled in on job completion
          },
        });

        // Note: We estimate cost based on average carboy cost for this type if available
        // This is just an estimate - actual cost calculated on completion
      }

      // Update estimated cost on the job if calculated
      if (totalEstimatedCost > 0) {
        await prisma.job.update({
          where: { JobID: job.JobID },
          data: { EstimatedCost: totalEstimatedCost },
        });
      }
    } catch (e) {
      console.warn("Could not auto-add material estimates", e);
    }

    // Update printer total hours if actual time provided
    if (PrinterID && ActualPrintTimeMin) {
      try {
        const printer = await prisma.printer.findUnique({
          where: { PrinterID },
        });
        if (printer) {
          const additionalHours = ActualPrintTimeMin / 60;
          const newTotal =
            Number(printer.TotalPrintHours || 0) + additionalHours;
          await prisma.printer.update({
            where: { PrinterID },
            data: { TotalPrintHours: newTotal },
          });
        }
      } catch (e) {
        console.warn("Could not update printer hours", e);
      }
    }

    res.json({ JobID: job.JobID, message: "Job added" });
  },
);

// UPDATE a job
router.put(
  "/:id",
  auth,
  validate(updateJobSchema),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const {
      JobName,
      UserID,
      ModelID,
      PrintDate,
      Status,
      PrinterID,
      Notes,
      ScheduledDate,
      ActualPrintTimeMin,
      ActualCost,
      ClientID,
    } = req.body;

    const data: any = {};
    if (JobName !== undefined) data.JobName = JobName;
    if (UserID !== undefined) data.UserID = UserID;
    if (ModelID !== undefined) data.ModelID = ModelID;
    if (PrintDate !== undefined) data.PrintDate = new Date(PrintDate);
    if (Status !== undefined) data.Status = Status;
    if (PrinterID !== undefined) data.PrinterID = PrinterID;
    if (Notes !== undefined) data.Notes = Notes;
    if (ClientID !== undefined) data.ClientID = ClientID;
    if (ScheduledDate !== undefined)
      data.ScheduledDate = ScheduledDate ? new Date(ScheduledDate) : null;
    if (ActualPrintTimeMin !== undefined)
      data.ActualPrintTimeMin = ActualPrintTimeMin;
    if (ActualCost !== undefined) data.ActualCost = ActualCost;

    await prisma.job.update({
      where: { JobID: id },
      data,
    });
    res.json({ message: "Job updated" });
  },
);

// COMPLETE a job - confirm material usage and deduct from carboys
router.post("/:id/complete", auth, async (req: Request, res: Response) => {
  const jobId = parseInt(req.params.id as string);
  const { materials } = req.body;
  // materials: [{ MaterialTypeID, ActualUsageGrams, StartGrams?, EndGrams? }]

  const job = await prisma.job.findUnique({
    where: { JobID: jobId },
    include: { JobMaterials: true },
  });

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (!Array.isArray(materials)) {
    res.status(400).json({ error: "materials must be an array" });
    return;
  }

  try {
    for (const mat of materials) {
      const { MaterialTypeID, ActualUsageGrams, StartGrams, EndGrams } = mat;

      // Update the JobMaterial record with actual values
      await prisma.jobMaterial.update({
        where: {
          JobID_MaterialTypeID: {
            JobID: jobId,
            MaterialTypeID: parseInt(MaterialTypeID),
          },
        },
        data: {
          ActualUsageGrams: parseFloat(ActualUsageGrams),
          MaterialStartGrams: StartGrams ? parseFloat(StartGrams) : undefined,
          MaterialEndGrams: EndGrams ? parseFloat(EndGrams) : undefined,
        },
      });

      // Deduct actual usage from printer carboys of this material type
      if (job.PrinterID) {
        // Find carboys on this printer that have materials matching this type name
        const materialType = await prisma.materialType.findUnique({
          where: { MaterialTypeID: parseInt(MaterialTypeID) },
        });

        if (materialType) {
          // Find carboys with materials of similar name
          const carboys = await prisma.printerCarboy.findMany({
            where: {
              PrinterID: job.PrinterID,
              Material: {
                MaterialName: {
                  contains: materialType.TypeName,
                  mode: "insensitive",
                },
              },
            },
            include: { Material: true },
          });

          // Distribute usage across matching carboys (simple: deduct evenly or from first)
          let remainingUsage = parseFloat(ActualUsageGrams);
          for (const carboy of carboys) {
            if (remainingUsage <= 0) break;
            if (!carboy.MaterialID || !carboy.Material) continue;

            const currentQty = Number(
              carboy.Material.CurrentQuantityGrams || 0,
            );
            const deduction = Math.min(remainingUsage, currentQty);

            await prisma.material.update({
              where: { MaterialID: carboy.MaterialID },
              data: {
                CurrentQuantityGrams: Math.max(0, currentQty - deduction),
              },
            });

            remainingUsage -= deduction;
          }
        }
      }
    }

    // Mark job as completed
    await prisma.job.update({
      where: { JobID: jobId },
      data: { Status: "completed" },
    });

    res.json({ message: "Job completed and materials deducted" });
  } catch (error) {
    console.error("Job completion failed:", error);
    res.status(500).json({ error: "Failed to complete job" });
  }
});

// GET planning projections - future material usage for scheduled jobs
router.get("/planning/projections", async (req: Request, res: Response) => {
  try {
    const futureJobs = await prisma.job.findMany({
      where: {
        OR: [
          { ScheduledDate: { gte: new Date() } },
          { Status: { in: ["queued", "printing"] } },
        ],
      },
      include: {
        Model: { select: { ModelName: true } },
        Printer: { select: { PrinterName: true } },
        JobMaterials: {
          include: {
            MaterialType: true,
          },
        },
        Client: { select: { Name: true } },
      },
      orderBy: { ScheduledDate: "asc" },
    });

    // Aggregate projected usage by material type
    const projections: Record<
      number,
      { TypeName: string; TotalUsageGrams: number; Jobs: any[] }
    > = {};

    for (const job of futureJobs) {
      for (const jm of job.JobMaterials) {
        if (!projections[jm.MaterialTypeID]) {
          projections[jm.MaterialTypeID] = {
            TypeName: (jm as any).MaterialType?.TypeName || "Unknown",
            TotalUsageGrams: 0,
            Jobs: [],
          };
        }
        projections[jm.MaterialTypeID].TotalUsageGrams += Number(
          jm.MaterialUsageGrams,
        );
        projections[jm.MaterialTypeID].Jobs.push({
          JobID: job.JobID,
          JobName: job.JobName,
          ScheduledDate: job.ScheduledDate,
          Status: job.Status,
          ModelName: job.Model?.ModelName,
          PrinterName: job.Printer?.PrinterName,
          UsageGrams: Number(jm.MaterialUsageGrams),
        });
      }
    }

    // Get current carboy levels for comparison
    const carboys = await prisma.printerCarboy.findMany({
      where: { MaterialID: { not: null } },
      include: { Material: true, Printer: true },
    });

    // Sum available material by type name
    const available: Record<string, number> = {};
    for (const c of carboys) {
      if (c.Material) {
        const name = c.Material.MaterialName;
        available[name] =
          (available[name] || 0) + Number(c.Material.CurrentQuantityGrams || 0);
      }
    }

    res.json({
      projections: Object.entries(projections).map(([id, data]) => ({
        MaterialTypeID: parseInt(id),
        ...data,
        AvailableGrams: available[data.TypeName] || 0,
        Sufficient: (available[data.TypeName] || 0) >= data.TotalUsageGrams,
      })),
      futureJobs: futureJobs.map((j) => ({
        JobID: j.JobID,
        JobName: j.JobName,
        ScheduledDate: j.ScheduledDate,
        Status: j.Status,
        ModelName: j.Model?.ModelName,
        PrinterName: j.Printer?.PrinterName,
        ClientName: j.Client?.Name,
        Materials: j.JobMaterials.map((jm: any) => ({
          MaterialTypeID: jm.MaterialTypeID,
          TypeName: jm.MaterialType?.TypeName,
          UsageGrams: Number(jm.MaterialUsageGrams),
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to get planning projections:", error);
    res.status(500).json({ error: "Failed to get planning projections" });
  }
});

// UPLOAD photos for a job
router.post(
  "/:id/photos",
  auth,
  uploadPhoto.single("photo"),
  async (req: Request, res: Response) => {
    const jobId = parseInt(req.params.id as string);
    const { Caption, PhotoType } = req.body;

    if (!req.file) {
      res.status(400).json({ error: "No photo uploaded" });
      return;
    }

    const photo = await prisma.jobPhoto.create({
      data: {
        JobID: jobId,
        FilePath: `/job_photos/${req.file.filename}`,
        Caption: Caption || null,
        PhotoType: PhotoType || null,
      },
    });

    res.json({ PhotoID: photo.PhotoID, message: "Photo uploaded" });
  },
);

// DELETE a photo
router.delete(
  "/:id/photos/:photoId",
  auth,
  async (req: Request, res: Response) => {
    const photoId = parseInt(req.params.photoId as string);
    const photo = await prisma.jobPhoto.findUnique({
      where: { PhotoID: photoId },
    });
    if (photo) {
      // Delete file from disk
      const filePath = path.join(__dirname, "..", photo.FilePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await prisma.jobPhoto.delete({ where: { PhotoID: photoId } });
    }
    res.json({ message: "Photo deleted" });
  },
);

// DELETE a job
router.delete("/:id", auth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await prisma.job.delete({ where: { JobID: id } });
  res.json({ message: "Job deleted" });
});

// CSV Import/Export
import { parseCSV, generateCSV } from "../utils/csv";
const uploadCsv = multer({ storage: multer.memoryStorage() });

router.get("/export/csv", async (req: Request, res: Response) => {
  const jobs = await prisma.job.findMany({
    include: {
      User: { select: { UserName: true } },
      Model: { select: { ModelName: true } },
      Printer: { select: { PrinterName: true, PrinterType: true } },
      Client: { select: { Name: true } },
    },
    orderBy: { PrintDate: "desc" },
  });

  const csv = await generateCSV(
    jobs.map((j) => ({
      JobID: j.JobID,
      JobName: j.JobName,
      User: j.User?.UserName,
      Model: j.Model?.ModelName,
      Client: j.Client?.Name,
      Printer: j.Printer?.PrinterName,
      PrintDate: j.PrintDate.toISOString().split("T")[0],
      ScheduledDate: j.ScheduledDate
        ? j.ScheduledDate.toISOString().split("T")[0]
        : "",
      Status: j.Status,
      EstimatedCost: j.EstimatedCost?.toString(),
      ActualCost: j.ActualCost?.toString(),
      ActualPrintTimeMin: j.ActualPrintTimeMin?.toString(),
      Notes: j.Notes,
    })),
  );

  res.header("Content-Type", "text/csv");
  res.attachment("jobs.csv");
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
      console.log(`Importing ${rows.length} jobs...`);

      for (const row of rows) {
        if (!row.JobName) continue;

        // Resolve Foreign Keys by Name
        let userId: number | undefined;
        let modelId: number | undefined;
        let printerId: number | null = null;

        if (row.User) {
          const u = await prisma.user.findFirst({
            where: { UserName: row.User },
          });
          if (u) userId = u.UserID;
          else {
            // Fallback to default user or requester if possible?
            // For now, if user not found, maybe skip or require it?
            // Let's assume User is required in schema, so if not found, we might need a fallback.
            // We'll trust the UserID from token if not found?
            // req.user might be available (casted).
            // For simplicity, if not found, we skip UserID which might fail validation if required.
            // Schema: UserID Int.
            // Let's fallback to the requester's ID if available.
            const requestUser = (req as any).user;
            // req.user is { UserID, ... } from auth middleware?
            // auth middleware: req.user = verified payload.
            if (requestUser && requestUser.UserID) userId = requestUser.UserID;
          }
        }

        if (row.Model) {
          const m = await prisma.model.findFirst({
            where: { ModelName: row.Model },
          });
          if (m) modelId = m.ModelID;
        }

        if (row.Printer) {
          const p = await prisma.printer.findFirst({
            where: { PrinterName: row.Printer },
          });
          if (p) printerId = p.PrinterID;
        }

        if (!userId || !modelId) {
          console.warn(
            `Skipping job import ${row.JobName}: User or Model not found.`,
          );
          continue;
        }

        const data: any = {
          JobName: row.JobName,
          UserID: userId,
          ModelID: modelId,
          PrinterID: printerId,
          PrintDate: row.PrintDate ? new Date(row.PrintDate) : new Date(),
          ScheduledDate: row.ScheduledDate ? new Date(row.ScheduledDate) : null,
          Status: row.Status || "queued",
          EstimatedCost: row.EstimatedCost
            ? parseFloat(row.EstimatedCost)
            : undefined,
          ActualCost: row.ActualCost ? parseFloat(row.ActualCost) : undefined,
          ActualPrintTimeMin: row.ActualPrintTimeMin
            ? parseInt(row.ActualPrintTimeMin)
            : undefined,
          Notes: row.Notes || null,
        };

        // Create only, assuming we don't want to overwrite existing jobs by name as JobName isn't unique
        await prisma.job.create({ data });
      }

      res.json({ message: `Imported ${rows.length} jobs` });
    } catch (err) {
      console.error("CSV Import failed", err);
      res.status(500).json({ error: "Failed to process CSV file" });
    }
  },
);

// Legacy endpoint
router.post("/job-materials", async (req: Request, res: Response) => {
  const { JobID, MaterialTypeID, MaterialUsageGrams } = req.body;
  await prisma.jobMaterial.create({
    data: { JobID, MaterialTypeID, MaterialUsageGrams },
  });
  res.json({ success: true });
});

export default router;
