"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModelSchema = exports.createPrinterSchema = exports.createMaterialSchema = exports.updateJobMaterialsSchema = exports.updateJobSchema = exports.createJobSchema = void 0;
const zod_1 = require("zod");
exports.createJobSchema = zod_1.z.object({
    JobName: zod_1.z.string().min(1, "Job Name is required"),
    UserID: zod_1.z.number().int().positive(),
    ModelID: zod_1.z.number().int().positive(),
    PrintDate: zod_1.z
        .string()
        .datetime({ offset: true })
        .or(zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")),
    Status: zod_1.z.enum(["queued", "printing", "completed", "failed"]).optional(),
    PrinterID: zod_1.z.number().int().positive().optional().nullable(),
    Notes: zod_1.z.string().optional().nullable(),
    ScheduledDate: zod_1.z.string().optional().nullable(),
    ActualPrintTimeMin: zod_1.z.number().int().nonnegative().optional().nullable(),
});
exports.updateJobSchema = exports.createJobSchema.partial().extend({
    ActualCost: zod_1.z.number().nonnegative().optional().nullable(),
});
exports.updateJobMaterialsSchema = zod_1.z.object({
    materials: zod_1.z.array(zod_1.z.object({
        MaterialID: zod_1.z.number().int().positive(),
        ActualUsageGrams: zod_1.z.number().nonnegative(),
    })),
});
exports.createMaterialSchema = zod_1.z.object({
    MaterialName: zod_1.z.string().min(1, "Material Name is required"),
    Color: zod_1.z.string().optional(),
    Type: zod_1.z.string().optional(),
    InitialQuantityGrams: zod_1.z.number().nonnegative().optional(),
    CostPerGram: zod_1.z.number().nonnegative().optional(),
    ReorderThresholdGrams: zod_1.z.number().nonnegative().optional(),
    ExpirationDate: zod_1.z.string().optional().nullable(),
    LotNumber: zod_1.z.string().optional(),
    Location: zod_1.z.string().optional(),
});
exports.createPrinterSchema = zod_1.z.object({
    PrinterName: zod_1.z.string().min(1, "Printer Name is required"),
    PrinterType: zod_1.z.string().optional(),
    Location: zod_1.z.string().optional(),
    Status: zod_1.z.string().optional(),
    Description: zod_1.z.string().optional(),
    MaxCarboys: zod_1.z.number().int().nonnegative().optional(),
    MaintenanceIntervalHours: zod_1.z.number().int().nonnegative().optional(),
    TotalPrintHours: zod_1.z.number().nonnegative().optional(),
    LastMaintenance: zod_1.z.string().optional().nullable(),
    NextMaintenance: zod_1.z.string().optional().nullable(),
});
exports.createModelSchema = zod_1.z.object({
    ModelName: zod_1.z.string().min(1, "Model Name is required"),
    EstimatedCost: zod_1.z.coerce.number().optional(),
    EstimatedPrintTime: zod_1.z.coerce.number().optional().nullable(),
    EstimatedFilamentUsage: zod_1.z.coerce.number().optional(),
});
