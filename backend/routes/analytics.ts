import express, { Request, Response } from "express";
import prisma from "../prismaClient";

const router = express.Router();

router.get("/material-usage", async (req: Request, res: Response) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT mt."TypeName" as "MaterialName", SUM(jm."MaterialUsageGrams") AS "totalUsage"
      FROM "JobMaterial" jm
      JOIN "MaterialType" mt ON jm."MaterialTypeID" = mt."MaterialTypeID"
      GROUP BY mt."TypeName"
      ORDER BY "totalUsage" DESC
    `;
    const result = (rows as any[]).map((row) => ({
      MaterialName: row.MaterialName,
      totalUsage: Number(row.totalUsage),
    }));
    res.json(result);
  } catch (err) {
    console.error("Error retrieving material usage:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/jobs-over-time", async (req: Request, res: Response) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT TO_CHAR("PrintDate", 'YYYY-MM') as period, COUNT(*) as "jobCount"
      FROM "Job"
      GROUP BY period
      ORDER BY period
    `;
    const result = (rows as any[]).map((row) => ({
      period: row.period,
      jobCount: Number(row.jobCount),
    }));
    res.json(result);
  } catch (err) {
    console.error("Error retrieving jobs over time:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Printer utilization: hours per printer per month
router.get("/printer-utilization", async (req: Request, res: Response) => {
  try {
    const rows = await prisma.$queryRaw`
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
    const result = (rows as any[]).map((row) => ({
      PrinterName: row.PrinterName,
      PrinterType: row.PrinterType,
      TotalPrintHours: Number(row.TotalPrintHours || 0),
      period: row.period,
      jobCount: Number(row.jobCount),
      totalMinutes: Number(row.totalMinutes),
      totalHours: Number(row.totalMinutes) / 60,
    }));
    res.json(result);
  } catch (err) {
    console.error("Error retrieving printer utilization:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Cost summary: total cost by month
router.get("/cost-summary", async (req: Request, res: Response) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        TO_CHAR("PrintDate", 'YYYY-MM') as period,
        SUM(COALESCE("EstimatedCost", 0)) as "totalEstimated",
        SUM(COALESCE("ActualCost", 0)) as "totalActual",
        COUNT(*) as "jobCount"
      FROM "Job"
      GROUP BY period
      ORDER BY period
    `;
    const result = (rows as any[]).map((row) => ({
      period: row.period,
      totalEstimated: Number(row.totalEstimated),
      totalActual: Number(row.totalActual),
      jobCount: Number(row.jobCount),
    }));
    res.json(result);
  } catch (err) {
    console.error("Error retrieving cost summary:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
