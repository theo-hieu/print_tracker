import { z } from "zod";

export const createJobSchema = z.object({
  JobName: z.string().min(1, "Job Name is required"),
  UserID: z.number().int().positive(),
  ModelID: z.number().int().positive(),
  PrintDate: z
    .string()
    .datetime({ offset: true })
    .or(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    ),
  Status: z.enum(["queued", "printing", "completed", "failed"]).optional(),
  PrinterID: z.number().int().positive().optional().nullable(),
  Notes: z.string().optional().nullable(),
  ScheduledDate: z.string().optional().nullable(),
  ActualPrintTimeMin: z.number().int().nonnegative().optional().nullable(),
  ClientID: z.number().int().positive().optional().nullable(),
});

export const updateJobSchema = createJobSchema.partial().extend({
  ActualCost: z.number().nonnegative().optional().nullable(),
  ClientID: z.number().int().positive().optional().nullable(),
});

export const updateJobMaterialsSchema = z.object({
  materials: z.array(
    z.object({
      MaterialID: z.number().int().positive(),
      ActualUsageGrams: z.number().nonnegative(),
    }),
  ),
});

export const createMaterialSchema = z.object({
  MaterialName: z.string().min(1, "Material Name is required"),
  Color: z.string().optional(),
  Type: z.string().optional(),
  InitialQuantityGrams: z.number().nonnegative().optional(),
  CostPerGram: z.number().nonnegative().optional(),
  ReorderThresholdGrams: z.number().nonnegative().optional(),
  ExpirationDate: z.string().optional().nullable(),
  LotNumber: z.string().optional(),
  Location: z.string().optional(),
});

export const createPrinterSchema = z.object({
  PrinterName: z.string().min(1, "Printer Name is required"),
  PrinterType: z.string().optional(),
  Location: z.string().optional(),
  Status: z.string().optional(),
  Description: z.string().optional(),
  MaxCarboys: z.number().int().nonnegative().optional(),
  MaintenanceIntervalHours: z.number().int().nonnegative().optional(),
  TotalPrintHours: z.number().nonnegative().optional(),
  LastMaintenance: z.string().optional().nullable(),
  NextMaintenance: z.string().optional().nullable(),
});

export const createModelSchema = z.object({
  ModelName: z.string().min(1, "Model Name is required"),
  EstimatedCost: z.coerce.number().optional(),
  EstimatedPrintTime: z.string().optional().nullable(),
  EstimatedFilamentUsage: z.coerce.number().optional(),
  ClientID: z.number().int().positive().optional().nullable(),
});
