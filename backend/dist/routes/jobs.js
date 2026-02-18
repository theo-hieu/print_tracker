"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prismaClient_1 = __importDefault(require("../prismaClient"));
const validate_1 = __importDefault(require("../middleware/validate"));
const auth_1 = __importDefault(require("../middleware/auth"));
const schemas_1 = require("../validators/schemas");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// Photo upload setup
const photoDir = path_1.default.join(__dirname, "..", "job_photos");
if (!fs_1.default.existsSync(photoDir))
    fs_1.default.mkdirSync(photoDir, { recursive: true });
const photoStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, photoDir),
    filename: (req, file, cb) => {
        const safe = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
        cb(null, safe);
    },
});
const uploadPhoto = (0, multer_1.default)({
    storage: photoStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!/\.(jpg|jpeg|png|webp)$/i.test(file.originalname))
            return cb(new Error("Only image files allowed"));
        cb(null, true);
    },
});
// GET all jobs with material tracking data
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const jobs = yield prismaClient_1.default.job.findMany({
        include: {
            User: { select: { UserName: true } },
            Model: { select: { ModelName: true } },
            Printer: { select: { PrinterName: true, PrinterType: true } },
            JobMaterials: {
                include: {
                    Material: { select: { MaterialName: true, Color: true } },
                },
            },
            JobPhotos: true,
        },
        orderBy: { PrintDate: "desc" },
    });
    const flattened = jobs.map((job) => {
        var _a, _b, _c, _d;
        return (Object.assign(Object.assign({}, job), { UserName: (_a = job.User) === null || _a === void 0 ? void 0 : _a.UserName, ModelName: (_b = job.Model) === null || _b === void 0 ? void 0 : _b.ModelName, PrinterName: (_c = job.Printer) === null || _c === void 0 ? void 0 : _c.PrinterName, PrinterType: (_d = job.Printer) === null || _d === void 0 ? void 0 : _d.PrinterType, JobMaterials: job.JobMaterials.map((jm) => {
                var _a, _b;
                return ({
                    MaterialID: jm.MaterialID,
                    MaterialName: (_a = jm.Material) === null || _a === void 0 ? void 0 : _a.MaterialName,
                    Color: (_b = jm.Material) === null || _b === void 0 ? void 0 : _b.Color,
                    MaterialUsageGrams: jm.MaterialUsageGrams,
                    MaterialStartGrams: jm.MaterialStartGrams,
                    MaterialEndGrams: jm.MaterialEndGrams,
                    ActualUsageGrams: jm.ActualUsageGrams,
                });
            }), User: undefined, Model: undefined, Printer: undefined }));
    });
    res.json(flattened);
}));
// GET scheduled jobs (for calendar view)
router.get("/scheduled", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const jobs = yield prismaClient_1.default.job.findMany({
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
}));
// CREATE a new job with material tracking and cost calculation
router.post("/", auth_1.default, (0, validate_1.default)(schemas_1.createJobSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { JobName, UserID, ModelID, PrintDate, Status, PrinterID, Notes, ScheduledDate, ActualPrintTimeMin, } = req.body;
    // Create the job first
    const job = yield prismaClient_1.default.job.create({
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
        },
    });
    // Auto-populate JobMaterials with tracking + calculate cost
    let totalEstimatedCost = 0;
    try {
        const modelMaterials = yield prismaClient_1.default.modelMaterial.findMany({
            where: { ModelID },
        });
        for (const mm of modelMaterials) {
            const material = yield prismaClient_1.default.material.findUnique({
                where: { MaterialID: mm.MaterialID },
            });
            const startGrams = (material === null || material === void 0 ? void 0 : material.CurrentQuantityGrams)
                ? Number(material.CurrentQuantityGrams)
                : null;
            const usageGrams = Number(mm.FilamentUsageGrams);
            const endGrams = startGrams !== null ? startGrams - usageGrams : null;
            // Calculate cost contribution
            if (material === null || material === void 0 ? void 0 : material.CostPerGram) {
                totalEstimatedCost += usageGrams * Number(material.CostPerGram);
            }
            yield prismaClient_1.default.jobMaterial.create({
                data: {
                    JobID: job.JobID,
                    MaterialID: mm.MaterialID,
                    MaterialUsageGrams: mm.FilamentUsageGrams,
                    MaterialStartGrams: startGrams,
                    MaterialEndGrams: endGrams,
                },
            });
            // Deduct from material's current quantity
            if (material && material.CurrentQuantityGrams !== null) {
                yield prismaClient_1.default.material.update({
                    where: { MaterialID: mm.MaterialID },
                    data: {
                        CurrentQuantityGrams: Math.max(0, endGrams !== null && endGrams !== void 0 ? endGrams : 0),
                    },
                });
            }
        }
        // Update estimated cost on the job
        if (totalEstimatedCost > 0) {
            yield prismaClient_1.default.job.update({
                where: { JobID: job.JobID },
                data: { EstimatedCost: totalEstimatedCost },
            });
        }
    }
    catch (e) {
        console.warn("Could not auto-add materials", e);
    }
    // Update printer total hours if actual time provided
    if (PrinterID && ActualPrintTimeMin) {
        try {
            const printer = yield prismaClient_1.default.printer.findUnique({
                where: { PrinterID },
            });
            if (printer) {
                const additionalHours = ActualPrintTimeMin / 60;
                const newTotal = Number(printer.TotalPrintHours || 0) + additionalHours;
                yield prismaClient_1.default.printer.update({
                    where: { PrinterID },
                    data: { TotalPrintHours: newTotal },
                });
            }
        }
        catch (e) {
            console.warn("Could not update printer hours", e);
        }
    }
    res.json({ JobID: job.JobID, message: "Job added" });
}));
// UPDATE a job
router.put("/:id", auth_1.default, (0, validate_1.default)(schemas_1.updateJobSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = parseInt(req.params.id);
    const { JobName, UserID, ModelID, PrintDate, Status, PrinterID, Notes, ScheduledDate, ActualPrintTimeMin, ActualCost, } = req.body;
    const data = {};
    if (JobName !== undefined)
        data.JobName = JobName;
    if (UserID !== undefined)
        data.UserID = UserID;
    if (ModelID !== undefined)
        data.ModelID = ModelID;
    if (PrintDate !== undefined)
        data.PrintDate = new Date(PrintDate);
    if (Status !== undefined)
        data.Status = Status;
    if (PrinterID !== undefined)
        data.PrinterID = PrinterID;
    if (Notes !== undefined)
        data.Notes = Notes;
    if (ScheduledDate !== undefined)
        data.ScheduledDate = ScheduledDate ? new Date(ScheduledDate) : null;
    if (ActualPrintTimeMin !== undefined)
        data.ActualPrintTimeMin = ActualPrintTimeMin;
    if (ActualCost !== undefined)
        data.ActualCost = ActualCost;
    yield prismaClient_1.default.job.update({
        where: { JobID: id },
        data,
    });
    res.json({ message: "Job updated" });
}));
// UPDATE actual material usage for a job
router.put("/:id/materials", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const jobId = parseInt(req.params.id);
    const { materials } = req.body;
    if (!Array.isArray(materials)) {
        res.status(400).json({ error: "materials must be an array" });
        return;
    }
    let totalActualCost = 0;
    for (const mat of materials) {
        const { MaterialID, ActualUsageGrams } = mat;
        const existing = yield prismaClient_1.default.jobMaterial.findUnique({
            where: {
                JobID_MaterialID: { JobID: jobId, MaterialID },
            },
        });
        if (!existing)
            continue;
        const predictedUsage = Number(existing.MaterialUsageGrams);
        const actualUsage = Number(ActualUsageGrams);
        const difference = actualUsage - predictedUsage;
        yield prismaClient_1.default.jobMaterial.update({
            where: {
                JobID_MaterialID: { JobID: jobId, MaterialID },
            },
            data: {
                ActualUsageGrams: actualUsage,
            },
        });
        // Adjust material quantities
        if (difference !== 0) {
            const material = yield prismaClient_1.default.material.findUnique({
                where: { MaterialID },
            });
            if (material && material.CurrentQuantityGrams !== null) {
                const newQty = Math.max(0, Number(material.CurrentQuantityGrams) - difference);
                yield prismaClient_1.default.material.update({
                    where: { MaterialID },
                    data: { CurrentQuantityGrams: newQty },
                });
            }
            // Calculate cost
            if (material === null || material === void 0 ? void 0 : material.CostPerGram) {
                totalActualCost += actualUsage * Number(material.CostPerGram);
            }
        }
    }
    // Update actual cost on job
    if (totalActualCost > 0) {
        yield prismaClient_1.default.job.update({
            where: { JobID: jobId },
            data: { ActualCost: totalActualCost },
        });
    }
    res.json({ message: "Actual usage updated" });
}));
// UPLOAD photos for a job
router.post("/:id/photos", auth_1.default, uploadPhoto.single("photo"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const jobId = parseInt(req.params.id);
    const { Caption, PhotoType } = req.body;
    if (!req.file) {
        res.status(400).json({ error: "No photo uploaded" });
        return;
    }
    const photo = yield prismaClient_1.default.jobPhoto.create({
        data: {
            JobID: jobId,
            FilePath: `/job_photos/${req.file.filename}`,
            Caption: Caption || null,
            PhotoType: PhotoType || null,
        },
    });
    res.json({ PhotoID: photo.PhotoID, message: "Photo uploaded" });
}));
// DELETE a photo
router.delete("/:id/photos/:photoId", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const photoId = parseInt(req.params.photoId);
    const photo = yield prismaClient_1.default.jobPhoto.findUnique({
        where: { PhotoID: photoId },
    });
    if (photo) {
        // Delete file from disk
        const filePath = path_1.default.join(__dirname, "..", photo.FilePath);
        if (fs_1.default.existsSync(filePath))
            fs_1.default.unlinkSync(filePath);
        yield prismaClient_1.default.jobPhoto.delete({ where: { PhotoID: photoId } });
    }
    res.json({ message: "Photo deleted" });
}));
// DELETE a job
router.delete("/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = parseInt(req.params.id);
    yield prismaClient_1.default.job.delete({ where: { JobID: id } });
    res.json({ message: "Job deleted" });
}));
// EXPORT jobs to CSV
router.get("/export/csv", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const jobs = yield prismaClient_1.default.job.findMany({
        include: {
            User: { select: { UserName: true } },
            Model: { select: { ModelName: true } },
            Printer: { select: { PrinterName: true, PrinterType: true } },
            JobMaterials: {
                include: {
                    Material: { select: { MaterialName: true } },
                },
            },
        },
        orderBy: { PrintDate: "desc" },
    });
    const header = "JobID,JobName,User,Model,Printer,PrinterType,PrintDate,ScheduledDate,Status,EstimatedCost,ActualCost,ActualPrintTimeMin,Materials,Notes\n";
    const rows = jobs.map((j) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const materials = j.JobMaterials.map((jm) => { var _a, _b; return `${(_a = jm.Material) === null || _a === void 0 ? void 0 : _a.MaterialName}: ${jm.MaterialUsageGrams}g (actual: ${(_b = jm.ActualUsageGrams) !== null && _b !== void 0 ? _b : "N/A"})`; }).join("; ");
        const esc = (v) => `"${String(v !== null && v !== void 0 ? v : "").replace(/"/g, '""')}"`;
        return [
            j.JobID,
            esc(j.JobName),
            esc((_a = j.User) === null || _a === void 0 ? void 0 : _a.UserName),
            esc((_b = j.Model) === null || _b === void 0 ? void 0 : _b.ModelName),
            esc((_c = j.Printer) === null || _c === void 0 ? void 0 : _c.PrinterName),
            esc((_d = j.Printer) === null || _d === void 0 ? void 0 : _d.PrinterType),
            j.PrintDate ? new Date(j.PrintDate).toISOString().split("T")[0] : "",
            j.ScheduledDate
                ? new Date(j.ScheduledDate).toISOString().split("T")[0]
                : "",
            esc(j.Status),
            (_e = j.EstimatedCost) !== null && _e !== void 0 ? _e : "",
            (_f = j.ActualCost) !== null && _f !== void 0 ? _f : "",
            (_g = j.ActualPrintTimeMin) !== null && _g !== void 0 ? _g : "",
            esc(materials),
            esc(j.Notes),
        ].join(",");
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=jobs_export.csv");
    res.send(header + rows.join("\n"));
}));
// Legacy endpoint
router.post("/job-materials", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { JobID, MaterialID, MaterialUsageGrams } = req.body;
    yield prismaClient_1.default.jobMaterial.create({
        data: { JobID, MaterialID, MaterialUsageGrams },
    });
    res.json({ success: true });
}));
exports.default = router;
