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
const router = express_1.default.Router();
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Support filtering by printer type tag
    const { type } = req.query;
    const where = {};
    if (type)
        where.PrinterType = type;
    const printers = yield prismaClient_1.default.printer.findMany({
        where,
        orderBy: { PrinterID: "asc" },
        include: {
            PrinterCarboys: {
                include: {
                    Material: {
                        select: { MaterialID: true, MaterialName: true, Color: true },
                    },
                },
                orderBy: [{ AreaNumber: "asc" }, { SlotNumber: "asc" }],
            },
        },
    });
    res.json(printers);
}));
// GET printers needing maintenance
router.get("/maintenance-due", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const printers = yield prismaClient_1.default.printer.findMany();
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
}));
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const printer = yield prismaClient_1.default.printer.findUnique({
        where: { PrinterID: parseInt(id) },
    });
    if (!printer) {
        res.status(404).json({ error: "Printer not found" });
        return;
    }
    res.json(printer);
}));
router.post("/", auth_1.default, (0, validate_1.default)(schemas_1.createPrinterSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { PrinterName, PrinterType, Location, Status, Description, LastMaintenance, NextMaintenance, MaintenanceIntervalHours, TotalPrintHours, } = req.body;
    const newPrinter = yield prismaClient_1.default.printer.create({
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
}));
router.put("/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { PrinterName, PrinterType, Location, Status, Description, LastMaintenance, NextMaintenance, MaintenanceIntervalHours, TotalPrintHours, } = req.body;
    try {
        const updatedPrinter = yield prismaClient_1.default.printer.update({
            where: { PrinterID: parseInt(id) },
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
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update printer" });
    }
}));
// Record maintenance completed
router.post("/:id/maintenance", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const printer = yield prismaClient_1.default.printer.findUnique({
        where: { PrinterID: parseInt(id) },
    });
    if (!printer) {
        res.status(404).json({ error: "Printer not found" });
        return;
    }
    const now = new Date();
    let nextDate = null;
    if (printer.MaintenanceIntervalHours) {
        // Calculate next maintenance date based on interval (assume 8hrs/day printing)
        const daysUntilNext = Math.ceil(printer.MaintenanceIntervalHours / 8);
        nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + daysUntilNext);
    }
    yield prismaClient_1.default.printer.update({
        where: { PrinterID: parseInt(id) },
        data: {
            LastMaintenance: now,
            NextMaintenance: nextDate,
            TotalPrintHours: 0, // Reset hours after maintenance
        },
    });
    res.json({ message: "Maintenance recorded" });
}));
// Assign materials to carboy slots
router.put("/:id/carboys", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { carboys } = req.body;
    // carboys: Array<{ AreaNumber: number, SlotNumber: number, MaterialID: number | null }>
    if (!Array.isArray(carboys)) {
        console.error("Invalid carboys payload:", req.body);
        res.status(400).json({ error: "carboys must be an array" });
        return;
    }
    console.log(`[PUT /:id/carboys] Body:`, JSON.stringify(req.body, null, 2));
    const printerId = parseInt(id);
    for (const cb of carboys) {
        // Check for NaN specifically, as typeof NaN is 'number'
        if (typeof cb.AreaNumber !== "number" ||
            isNaN(cb.AreaNumber) ||
            typeof cb.SlotNumber !== "number" ||
            isNaN(cb.SlotNumber)) {
            console.error("Invalid carboy item (NaN or wrong type):", cb);
            res
                .status(400)
                .json({ error: "AreaNumber and SlotNumber must be valid numbers" });
            return;
        }
    }
    for (const cb of carboys) {
        yield prismaClient_1.default.printerCarboy.upsert({
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
}));
router.delete("/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield prismaClient_1.default.printer.delete({
        where: {
            PrinterID: parseInt(id),
        },
    });
    res.json({ message: "Printer deleted" });
}));
exports.default = router;
