import express, { Request, Response } from "express";
import prisma from "../prismaClient";
import validate from "../middleware/validate";
import auth from "../middleware/auth";
import { createPrinterSchema } from "../validators/schemas";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  // Support filtering by printer type tag
  const { type } = req.query;
  const where: any = {};
  if (type) where.PrinterType = type as string;

  const printers = await prisma.printer.findMany({
    where,
    orderBy: { PrinterID: "asc" },
    include: {
      PrinterCarboys: {
        include: {
          Material: {
            select: {
              MaterialID: true,
              MaterialName: true,
              Color: true,
              CurrentQuantityGrams: true,
              InitialQuantityGrams: true,
              ExpirationDate: true,
              LotNumber: true,
            },
          },
        },
        orderBy: [{ AreaNumber: "asc" }, { SlotNumber: "asc" }],
      },
    },
  });
  res.json(printers);
});

// GET printers needing maintenance
router.get("/maintenance-due", async (req: Request, res: Response) => {
  const printers = await prisma.printer.findMany();

  const due = printers.filter((p) => {
    // Check if NextMaintenance is in the past
    if (p.NextMaintenance && new Date(p.NextMaintenance) <= new Date()) {
      return true;
    }
    // Check if total hours exceeded maintenance interval
    if (p.MaintenanceIntervalHours && p.TotalPrintHours && p.LastMaintenance) {
      // Simple check: flag if total hours since last maintenance exceeds interval
      return Number(p.TotalPrintHours) >= p.MaintenanceIntervalHours;
    }
    return false;
  });

  res.json(due);
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const printer = await prisma.printer.findUnique({
    where: { PrinterID: parseInt(id as string) },
  });
  if (!printer) {
    res.status(404).json({ error: "Printer not found" });
    return;
  }
  res.json(printer);
});

router.post(
  "/",
  auth,
  validate(createPrinterSchema),
  async (req: Request, res: Response) => {
    const {
      PrinterName,
      PrinterType,
      Location,
      Status,
      Description,
      LastMaintenance,
      NextMaintenance,
      MaintenanceIntervalHours,
      TotalPrintHours,
    } = req.body;
    const newPrinter = await prisma.printer.create({
      data: {
        PrinterName,
        PrinterType,
        Location,
        Status,
        Description,
        LastMaintenance: LastMaintenance ? new Date(LastMaintenance) : null,
        NextMaintenance: NextMaintenance ? new Date(NextMaintenance) : null,
        MaintenanceIntervalHours,
        TotalPrintHours: TotalPrintHours || 0,
      },
    });
    res.json({ message: "Printer added", PrinterID: newPrinter.PrinterID });
  },
);

router.put("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    PrinterName,
    PrinterType,
    Location,
    Status,
    Description,
    LastMaintenance,
    NextMaintenance,
    MaintenanceIntervalHours,
    TotalPrintHours,
  } = req.body;
  try {
    const updatedPrinter = await prisma.printer.update({
      where: { PrinterID: parseInt(id as string) },
      data: {
        PrinterName,
        PrinterType,
        Location,
        Status,
        Description,
        LastMaintenance: LastMaintenance ? new Date(LastMaintenance) : null,
        NextMaintenance: NextMaintenance ? new Date(NextMaintenance) : null,
        MaintenanceIntervalHours,
        TotalPrintHours,
      },
    });
    res.json({ message: "Printer updated", printer: updatedPrinter });
  } catch (error) {
    res.status(500).json({ error: "Failed to update printer" });
  }
});

// Record maintenance completed
router.post("/:id/maintenance", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const printer = await prisma.printer.findUnique({
    where: { PrinterID: parseInt(id as string) },
  });
  if (!printer) {
    res.status(404).json({ error: "Printer not found" });
    return;
  }

  const now = new Date();
  let nextDate: Date | null = null;
  if (printer.MaintenanceIntervalHours) {
    // Calculate next maintenance date based on interval (assume 8hrs/day printing)
    const daysUntilNext = Math.ceil(printer.MaintenanceIntervalHours / 8);
    nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + daysUntilNext);
  }

  await prisma.printer.update({
    where: { PrinterID: parseInt(id as string) },
    data: {
      LastMaintenance: now,
      NextMaintenance: nextDate,
      TotalPrintHours: 0, // Reset hours after maintenance
    },
  });

  res.json({ message: "Maintenance recorded" });
});

// Assign materials to carboy slots
router.put("/:id/carboys", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { carboys } = req.body;
  // carboys: Array<{ AreaNumber: number, SlotNumber: number, MaterialID: number | null }>

  if (!Array.isArray(carboys)) {
    console.error("Invalid carboys payload:", req.body);
    res.status(400).json({ error: "carboys must be an array" });
    return;
  }

  console.log(`[PUT /:id/carboys] Body:`, JSON.stringify(req.body, null, 2));

  const printerId = parseInt(id as string);

  for (const cb of carboys) {
    // Check for NaN specifically, as typeof NaN is 'number'
    if (
      typeof cb.AreaNumber !== "number" ||
      isNaN(cb.AreaNumber) ||
      typeof cb.SlotNumber !== "number" ||
      isNaN(cb.SlotNumber)
    ) {
      console.error("Invalid carboy item (NaN or wrong type):", cb);
      res
        .status(400)
        .json({ error: "AreaNumber and SlotNumber must be valid numbers" });
      return;
    }
  }

  for (const cb of carboys) {
    await prisma.printerCarboy.upsert({
      where: {
        PrinterID_AreaNumber_SlotNumber: {
          PrinterID: printerId,
          AreaNumber: cb.AreaNumber,
          SlotNumber: cb.SlotNumber,
        },
      },
      update: { MaterialID: cb.MaterialID || null },
      create: {
        PrinterID: printerId,
        AreaNumber: cb.AreaNumber,
        SlotNumber: cb.SlotNumber,
        MaterialID: cb.MaterialID || null,
      },
    });
  }

  res.json({ message: "Carboy slots updated" });
});

router.delete("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.printer.delete({
    where: {
      PrinterID: parseInt(id as string),
    },
  });
  res.json({ message: "Printer deleted" });
});

export default router;
