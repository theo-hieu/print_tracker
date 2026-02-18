import request from "supertest";
import express from "express";
import { prismaMock } from "./prismaMock";
import jobRouter from "../routes/jobs";
import fs from "fs";
import path from "path";

// Mock Auth Middleware
jest.mock("../middleware/auth", () => {
  return jest.fn((req, res, next) => {
    req.user = { UserID: 1, UserName: "TestUser" };
    next();
  });
});

// Mock CSV Utils
jest.mock("../utils/csv", () => ({
  generateCSV: jest.fn().mockResolvedValue("header1,header2\nval1,val2"),
  parseCSV: jest.fn().mockResolvedValue([]),
}));

// Mock fs
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock Multer
jest.mock("multer", () => {
  const multer = () => ({
    single: () => (req: any, res: any, next: any) => {
      req.file = {
        filename: "test-photo.jpg",
        originalname: "test-photo.jpg",
        path: "path/to/test-photo.jpg",
        buffer: Buffer.from("test"),
      };
      next();
    },
  });
  multer.memoryStorage = () => {};
  multer.diskStorage = () => {};
  return multer;
});

const app = express();
app.use(express.json());
app.use("/api/jobs", jobRouter);

describe("Jobs API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // --- GET ---
  it("GET /api/jobs - success", async () => {
    const mockJobs = [{ JobID: 1, JobName: "Job 1", JobMaterials: [] }];
    prismaMock.job.findMany.mockResolvedValue(mockJobs as any);
    const res = await request(app).get("/api/jobs");
    expect(res.status).toBe(200);
    expect(res.body[0].JobName).toBe("Job 1");
  });

  it("GET /api/jobs/scheduled - success", async () => {
    const mockJobs = [{ JobID: 2, ScheduledDate: new Date() }];
    prismaMock.job.findMany.mockResolvedValue(mockJobs as any);
    const res = await request(app).get("/api/jobs/scheduled");
    expect(res.status).toBe(200);
  });

  // --- POST CREATE ---
  it("POST /api/jobs - success with printer hours update", async () => {
    const newJob = {
      JobName: "New Job",
      UserID: 1,
      ModelID: 1,
      PrintDate: "2023-01-01T00:00:00Z",
      PrinterID: 1,
      ActualPrintTimeMin: 60,
    };

    prismaMock.job.create.mockResolvedValue({ JobID: 1, ...newJob } as any);
    // Mock model materials for estimation
    prismaMock.modelMaterial.findMany.mockResolvedValue([
      {
        MaterialTypeID: 1,
        FilamentUsageGrams: 100,
        MaterialType: { CostPerGram: 0.05 },
      },
    ] as any);

    // Mock printer for hours update
    prismaMock.printer.findUnique.mockResolvedValue({
      PrinterID: 1,
      TotalPrintHours: 10,
    } as any);
    prismaMock.printer.update.mockResolvedValue({} as any);
    prismaMock.job.update.mockResolvedValue({} as any); // Cost update

    const res = await request(app).post("/api/jobs").send(newJob);

    expect(res.status).toBe(200);
    expect(prismaMock.printer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { PrinterID: 1 },
        data: { TotalPrintHours: 11 }, // 10 + 60/60
      }),
    );
  });

  it("POST /api/jobs - handle printer update failure silently", async () => {
    const newJob = {
      JobName: "Job",
      UserID: 1,
      ModelID: 1,
      PrintDate: "2023-01-01",
      PrinterID: 1,
      ActualPrintTimeMin: 60,
    };
    prismaMock.job.create.mockResolvedValue({ JobID: 1 } as any);
    prismaMock.modelMaterial.findMany.mockResolvedValue([]);
    prismaMock.printer.findUnique.mockRejectedValue(new Error("DB Error")); // Throw

    const res = await request(app).post("/api/jobs").send(newJob);
    expect(res.status).toBe(200); // Should still succeed
  });

  // --- PUT ---
  it("PUT /api/jobs/:id - success partial update", async () => {
    const update = { Status: "printing" }; // Partial payload
    prismaMock.job.update.mockResolvedValue({ JobID: 1, ...update } as any);
    const res = await request(app).put("/api/jobs/1").send(update);
    expect(res.status).toBe(200);
  });

  // --- DELETE ---
  it("DELETE /api/jobs/:id - success", async () => {
    prismaMock.job.delete.mockResolvedValue({ JobID: 1 } as any);
    const res = await request(app).delete("/api/jobs/1");
    expect(res.status).toBe(200);
  });

  // --- COMPLETE (Complex Logic) ---
  it("POST /api/jobs/:id/complete - job not found", async () => {
    prismaMock.job.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/jobs/999/complete")
      .send({ materials: [] });
    expect(res.status).toBe(404);
  });

  it("POST /api/jobs/:id/complete - invalid payload", async () => {
    prismaMock.job.findUnique.mockResolvedValue({ JobID: 1 } as any);
    const res = await request(app)
      .post("/api/jobs/1/complete")
      .send({ materials: "not-an-array" });
    expect(res.status).toBe(400);
  });

  it("POST /api/jobs/:id/complete - success with multi-carboy deduction", async () => {
    const mockJob = { JobID: 1, PrinterID: 1 };
    const materials = [{ MaterialTypeID: 1, ActualUsageGrams: 500 }]; // Need 500g

    prismaMock.job.findUnique.mockResolvedValue(mockJob as any);
    prismaMock.jobMaterial.update.mockResolvedValue({} as any);

    // Printer checks
    prismaMock.materialType.findUnique.mockResolvedValue({
      TypeName: "Vero",
    } as any);

    // Mock 2 carboys with 300g each
    const carboys = [
      {
        PrinterCarboyID: 1,
        MaterialID: 10,
        Material: {
          MaterialID: 10,
          CurrentQuantityGrams: 300,
          MaterialName: "Vero 1",
        },
      },
      {
        PrinterCarboyID: 2,
        MaterialID: 11,
        Material: {
          MaterialID: 11,
          CurrentQuantityGrams: 300,
          MaterialName: "Vero 2",
        },
      },
    ];
    prismaMock.printerCarboy.findMany.mockResolvedValue(carboys as any);

    prismaMock.material.update.mockResolvedValue({} as any);
    prismaMock.job.update.mockResolvedValue({ Status: "completed" } as any);

    const res = await request(app)
      .post("/api/jobs/1/complete")
      .send({ materials });

    expect(res.status).toBe(200);
    // Should update twice: 300g from first, 200g from second
    expect(prismaMock.material.update).toHaveBeenCalledTimes(2);
  });

  it("POST /api/jobs/:id/complete - handle deduction error", async () => {
    prismaMock.job.findUnique.mockResolvedValue({
      JobID: 1,
      PrinterID: 1,
    } as any);
    prismaMock.jobMaterial.update.mockRejectedValue(new Error("Update failed"));

    const res = await request(app)
      .post("/api/jobs/1/complete")
      .send({
        materials: [{ MaterialTypeID: 1, ActualUsageGrams: 100 }],
      });
    expect(res.status).toBe(500);
  });

  // --- PLANNING ---
  it("GET /api/jobs/planning/projections - success", async () => {
    prismaMock.job.findMany.mockResolvedValue([]);
    prismaMock.printerCarboy.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/jobs/planning/projections");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("projections");
  });

  it("GET /api/jobs/planning/projections - error handling", async () => {
    prismaMock.job.findMany.mockRejectedValue(new Error("DB Error"));
    const res = await request(app).get("/api/jobs/planning/projections");
    expect(res.status).toBe(500);
  });

  // --- PHOTOS ---
  it("POST /api/jobs/:id/photos - success", async () => {
    prismaMock.jobPhoto.create.mockResolvedValue({ PhotoID: 1 } as any);
    const res = await request(app).post("/api/jobs/1/photos"); // Multer mock injects file
    expect(res.status).toBe(200);
  });

  it("DELETE /api/jobs/:id/photos/:photoId - success file exists", async () => {
    prismaMock.jobPhoto.findUnique.mockResolvedValue({
      PhotoID: 1,
      FilePath: "/test.jpg",
    } as any);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    prismaMock.jobPhoto.delete.mockResolvedValue({} as any);

    const res = await request(app).delete("/api/jobs/1/photos/1");
    expect(res.status).toBe(200);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it("DELETE /api/jobs/:id/photos/:photoId - not found", async () => {
    prismaMock.jobPhoto.findUnique.mockResolvedValue(null);
    const res = await request(app).delete("/api/jobs/1/photos/1");
    expect(res.status).toBe(200); // Idempotent success per implementation? Code says "Photo deleted" even if not found
  });

  // --- CSV ---
  it("GET /api/jobs/export/csv - success", async () => {
    prismaMock.job.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/jobs/export/csv");
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toContain("text/csv");
  });

  it("POST /api/jobs/import/csv - success with lookups", async () => {
    const requireMock = require("../utils/csv");
    requireMock.parseCSV.mockResolvedValue([
      { JobName: "J1", User: "U1", Model: "M1", Printer: "P1" },
      { JobName: "J2" }, // Missing deps
    ]);

    // Mock lookups
    prismaMock.user.findFirst.mockResolvedValue({ UserID: 1 } as any);
    prismaMock.model.findFirst.mockResolvedValue({ ModelID: 1 } as any);
    prismaMock.printer.findFirst.mockResolvedValue({ PrinterID: 1 } as any);

    prismaMock.job.create.mockResolvedValue({ JobID: 1 } as any);

    const res = await request(app).post("/api/jobs/import/csv");
    expect(res.status).toBe(200);
    // specific assertions on create call count could verify logic
  });

  it("POST /api/jobs/import/csv - handles missing fields and lookups", async () => {
    const requireMock = require("../utils/csv");
    requireMock.parseCSV.mockResolvedValue([
      { JobName: "" }, // Skip
      { JobName: "J3", User: "Unknown", Model: "Unknown" }, // Skip due to missing User/Model
      { JobName: "J4", User: "U1", Model: "M1" }, // Success fallback
    ]);

    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.model.findFirst.mockResolvedValue(null);

    const res = await request(app).post("/api/jobs/import/csv");
    expect(res.status).toBe(200);
  });

  it("POST /api/jobs/:id/complete - skip if material type not found", async () => {
    prismaMock.job.findUnique.mockResolvedValue({
      JobID: 1,
      PrinterID: 1,
    } as any);
    prismaMock.jobMaterial.update.mockResolvedValue({} as any);
    // Material type not found
    prismaMock.materialType.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/jobs/1/complete")
      .send({
        materials: [{ MaterialTypeID: 999, ActualUsageGrams: 100 }],
      });
    expect(res.status).toBe(200);
    // Should not call printerCarboy.findMany
    expect(prismaMock.printerCarboy.findMany).not.toHaveBeenCalled();
  });

  it("POST /api/jobs/:id/complete - partial deduction (remaining <= 0)", async () => {
    prismaMock.job.findUnique.mockResolvedValue({
      JobID: 1,
      PrinterID: 1,
    } as any);
    prismaMock.jobMaterial.update.mockResolvedValue({} as any);
    prismaMock.materialType.findUnique.mockResolvedValue({
      TypeName: "Vero",
    } as any);

    // First carboy has enough (500 > 100). Second should be skipped.
    const carboys = [
      {
        PrinterCarboyID: 1,
        MaterialID: 10,
        Material: { MaterialID: 10, CurrentQuantityGrams: 500 },
      },
      {
        PrinterCarboyID: 2,
        MaterialID: 11,
        Material: { MaterialID: 11, CurrentQuantityGrams: 500 },
      },
    ];
    prismaMock.printerCarboy.findMany.mockResolvedValue(carboys as any);
    prismaMock.material.update.mockResolvedValue({} as any);
    prismaMock.job.update.mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/jobs/1/complete")
      .send({
        materials: [{ MaterialTypeID: 1, ActualUsageGrams: 100 }],
      });

    expect(res.status).toBe(200);
    expect(prismaMock.material.update).toHaveBeenCalledTimes(1); // Only triggers once
  });

  it("POST /api/jobs/:id/complete - skip carboy with no material", async () => {
    prismaMock.job.findUnique.mockResolvedValue({
      JobID: 1,
      PrinterID: 1,
    } as any);
    prismaMock.jobMaterial.update.mockResolvedValue({} as any);
    prismaMock.materialType.findUnique.mockResolvedValue({
      TypeName: "Vero",
    } as any);

    const carboys = [
      { PrinterCarboyID: 1, MaterialID: null }, // Valid carboy but empty
      {
        PrinterCarboyID: 2,
        MaterialID: 11,
        Material: { MaterialID: 11, CurrentQuantityGrams: 500 },
      },
    ];
    prismaMock.printerCarboy.findMany.mockResolvedValue(carboys as any);
    prismaMock.material.update.mockResolvedValue({} as any);
    prismaMock.job.update.mockResolvedValue({} as any);

    const res = await request(app)
      .post("/api/jobs/1/complete")
      .send({
        materials: [{ MaterialTypeID: 1, ActualUsageGrams: 100 }],
      });

    expect(res.status).toBe(200);
    expect(prismaMock.material.update).toHaveBeenCalledTimes(1);
  });
});
