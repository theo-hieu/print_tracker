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
const router = express_1.default.Router();
router.get("/material-usage", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield prismaClient_1.default.$queryRaw `
      SELECT m."MaterialName", SUM(jm."MaterialUsageGrams") AS "totalUsage"
      FROM "JobMaterial" jm
      JOIN "Material" m ON jm."MaterialID" = m."MaterialID"
      GROUP BY m."MaterialName"
      ORDER BY "totalUsage" DESC
    `;
        const result = rows.map((row) => ({
            MaterialName: row.MaterialName,
            totalUsage: Number(row.totalUsage),
        }));
        res.json(result);
    }
    catch (err) {
        console.error("Error retrieving material usage:", err);
        res.status(500).json({ error: "Database error" });
    }
}));
router.get("/jobs-over-time", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield prismaClient_1.default.$queryRaw `
      SELECT TO_CHAR("PrintDate", 'YYYY-MM') as period, COUNT(*) as "jobCount"
      FROM "Job"
      GROUP BY period
      ORDER BY period
    `;
        const result = rows.map((row) => ({
            period: row.period,
            jobCount: Number(row.jobCount),
        }));
        res.json(result);
    }
    catch (err) {
        console.error("Error retrieving jobs over time:", err);
        res.status(500).json({ error: "Database error" });
    }
}));
// Printer utilization: hours per printer per month
router.get("/printer-utilization", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield prismaClient_1.default.$queryRaw `
      SELECT
        p."PrinterName",
        p."PrinterType",
        p."TotalPrintHours",
        TO_CHAR(j."PrintDate", 'YYYY-MM') as period,
        COUNT(j."JobID") as "jobCount",
        SUM(COALESCE(j."ActualPrintTimeMin", 0)) as "totalMinutes"
      FROM "Printer" p
      LEFT JOIN "Job" j ON p."PrinterID" = j."PrinterID"
      GROUP BY p."PrinterID", p."PrinterName", p."PrinterType", p."TotalPrintHours", period
      ORDER BY p."PrinterName", period
    `;
        const result = rows.map((row) => ({
            PrinterName: row.PrinterName,
            PrinterType: row.PrinterType,
            TotalPrintHours: Number(row.TotalPrintHours || 0),
            period: row.period,
            jobCount: Number(row.jobCount),
            totalMinutes: Number(row.totalMinutes),
            totalHours: Number(row.totalMinutes) / 60,
        }));
        res.json(result);
    }
    catch (err) {
        console.error("Error retrieving printer utilization:", err);
        res.status(500).json({ error: "Database error" });
    }
}));
// Cost summary: total cost by month
router.get("/cost-summary", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield prismaClient_1.default.$queryRaw `
      SELECT
        TO_CHAR("PrintDate", 'YYYY-MM') as period,
        SUM(COALESCE("EstimatedCost", 0)) as "totalEstimated",
        SUM(COALESCE("ActualCost", 0)) as "totalActual",
        COUNT(*) as "jobCount"
      FROM "Job"
      GROUP BY period
      ORDER BY period
    `;
        const result = rows.map((row) => ({
            period: row.period,
            totalEstimated: Number(row.totalEstimated),
            totalActual: Number(row.totalActual),
            jobCount: Number(row.jobCount),
        }));
        res.json(result);
    }
    catch (err) {
        console.error("Error retrieving cost summary:", err);
        res.status(500).json({ error: "Database error" });
    }
}));
exports.default = router;
