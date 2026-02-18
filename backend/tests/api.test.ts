import request from "supertest";
import express from "express";
import { prismaMock } from "./prismaMock";
import materialRouter from "../routes/materials";
import printerRouter from "../routes/printers";
import jobRouter from "../routes/jobs";
import modelRouter from "../routes/models";
import analyticsRouter from "../routes/analytics";
import auth from "../middleware/auth";

// Mock Auth Middleware
jest.mock("../middleware/auth", () => {
  return jest.fn((req, res, next) => {
    req.user = { UserID: 1, UserName: "TestUser" };
    next();
  });
});

// Create Test App
const app = express();
app.use(express.json());
app.use("/api/materials", materialRouter);
app.use("/api/printers", printerRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/models", modelRouter);
app.use("/api/analytics", analyticsRouter);

describe("API Endpoints with Prisma Mock", () => {
  // --- MATERIALS ---
  describe("Materials API", () => {
    it("GET /api/materials - success", async () => {
      const mockMaterials = [
        { MaterialID: 1, MaterialName: "Test Mat 1", Type: "Model" },
        { MaterialID: 2, MaterialName: "Test Mat 2", Type: "Support" },
      ];
      prismaMock.material.findMany.mockResolvedValue(mockMaterials as any);

      const res = await request(app).get("/api/materials");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].MaterialName).toBe("Test Mat 1");
    });

    it("GET /api/materials/alerts - returns low stock", async () => {
      const mockMaterials = [
        {
          MaterialID: 1,
          MaterialName: "Low Stock Mat",
          CurrentQuantityGrams: 100,
          ReorderThresholdGrams: 200,
        },
        {
          MaterialID: 2,
          MaterialName: "Normal Mat",
          CurrentQuantityGrams: 500,
          ReorderThresholdGrams: 200,
        },
      ];
      // Mock findMany for the filter logic in the route
      prismaMock.material.findMany.mockResolvedValue(mockMaterials as any);

      const res = await request(app).get("/api/materials/alerts");
      expect(res.status).toBe(200);
      // The route filters in JS, so we expect 1 result
      expect(res.body).toHaveLength(1);
      expect(res.body[0].MaterialName).toBe("Low Stock Mat");
    });

    it("GET /api/materials/:id - success", async () => {
      const mockMaterial = { MaterialID: 1, MaterialName: "Test Mat 1" };
      prismaMock.material.findUnique.mockResolvedValue(mockMaterial as any);

      const res = await request(app).get("/api/materials/1");
      expect(res.status).toBe(200);
      expect(res.body.MaterialName).toBe("Test Mat 1");
    });

    it("GET /api/materials/:id - not found", async () => {
      prismaMock.material.findUnique.mockResolvedValue(null);
      const res = await request(app).get("/api/materials/999");
      expect(res.status).toBe(404);
    });

    it("POST /api/materials - success", async () => {
      const newMat = {
        MaterialName: "New Mat",
        Type: "Model",
        InitialQuantityGrams: 1000,
        CurrentQuantityGrams: 1000,
        ReorderThresholdGrams: 100,
      };
      prismaMock.material.create.mockResolvedValue({
        MaterialID: 1,
        ...newMat,
      } as any);

      const res = await request(app).post("/api/materials").send(newMat);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("MaterialID");
    });

    it("PUT /api/materials/:id - success", async () => {
      const update = { MaterialName: "Updated Mat" };
      prismaMock.material.update.mockResolvedValue({
        MaterialID: 1,
        ...update,
      } as any);

      const res = await request(app).put("/api/materials/1").send(update);
      expect(res.status).toBe(200);
      expect(res.body.material.MaterialName).toBe("Updated Mat");
    });

    it("DELETE /api/materials/:id - success", async () => {
      prismaMock.material.delete.mockResolvedValue({ MaterialID: 1 } as any);
      const res = await request(app).delete("/api/materials/1");
      expect(res.status).toBe(200);
    });

    it("GET /api/materials/export/csv - success", async () => {
      prismaMock.material.findMany.mockResolvedValue([]);
      const res = await request(app).get("/api/materials/export/csv");
      expect(res.status).toBe(200);
      expect(res.header["content-type"]).toContain("text/csv");
    });
  });

  // --- PRINTERS ---
  describe("Printers API", () => {
    it("GET /api/printers - success", async () => {
      const mockPrinters = [{ PrinterID: 1, PrinterName: "J850" }];
      prismaMock.printer.findMany.mockResolvedValue(mockPrinters as any);

      const res = await request(app).get("/api/printers");
      expect(res.status).toBe(200);
      expect(res.body[0].PrinterName).toBe("J850");
    });

    it("POST /api/printers - success", async () => {
      const newPrinter = { PrinterName: "New Printer", PrinterType: "SLA" };
      prismaMock.printer.create.mockResolvedValue({
        PrinterID: 2,
        ...newPrinter,
      } as any);

      const res = await request(app).post("/api/printers").send(newPrinter);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("PrinterID");
    });

    it("PUT /api/printers/:id - success", async () => {
      const update = { PrinterName: "Updated Printer" };
      prismaMock.printer.update.mockResolvedValue({
        PrinterID: 1,
        ...update,
      } as any);

      const res = await request(app).put("/api/printers/1").send(update);
      expect(res.status).toBe(200);
      expect(res.body.printer.PrinterName).toBe("Updated Printer");
    });

    it("DELETE /api/printers/:id - success", async () => {
      prismaMock.printer.delete.mockResolvedValue({ PrinterID: 1 } as any);
      const res = await request(app).delete("/api/printers/1");
      expect(res.status).toBe(200);
    });

    it("GET /api/printers/maintenance-due - success", async () => {
      const mockPrinters = [
        { PrinterID: 1, NextMaintenance: new Date("2020-01-01") },
      ]; // Past date
      prismaMock.printer.findMany.mockResolvedValue(mockPrinters as any);

      const res = await request(app).get("/api/printers/maintenance-due");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  // Jobs API tests moved to jobs.test.ts

  // --- MODELS ---
  describe("Models API", () => {
    it("GET /api/models - success", async () => {
      const mockModels = [{ ModelID: 1, ModelName: "Test Model" }];
      prismaMock.model.findMany.mockResolvedValue(mockModels as any);
      const res = await request(app).get("/api/models");
      expect(res.status).toBe(200);
      expect(res.body[0].ModelName).toBe("Test Model");
    });

    it("POST /api/models - success", async () => {
      const newModel = { ModelName: "New Model", ClientID: 1 };
      prismaMock.model.create.mockResolvedValue({
        ModelID: 2,
        ...newModel,
      } as any);

      const res = await request(app).post("/api/models").send(newModel);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("ModelID");
    });

    it("PUT /api/models/:id - success", async () => {
      const update = { ModelName: "Updated Model" };
      prismaMock.model.update.mockResolvedValue({
        ModelID: 1,
        ...update,
      } as any);

      const res = await request(app).put("/api/models/1").send(update);
      expect(res.status).toBe(200);
      expect(res.body.model.ModelName).toBe("Updated Model");
    });

    it("DELETE /api/models/:id - success", async () => {
      prismaMock.model.delete.mockResolvedValue({ ModelID: 1 } as any);
      const res = await request(app).delete("/api/models/1");
      expect(res.status).toBe(200);
    });

    it("POST /api/models/model-materials - success", async () => {
      const data = { ModelID: 1, MaterialTypeID: 1, FilamentUsageGrams: 100 };
      prismaMock.modelMaterial.create.mockResolvedValue(data as any);

      const res = await request(app)
        .post("/api/models/model-materials")
        .send(data);
      expect(res.status).toBe(200);
    });

    it("GET /api/models/export/csv - success", async () => {
      prismaMock.model.findMany.mockResolvedValue([]);
      const res = await request(app).get("/api/models/export/csv");
      expect(res.status).toBe(200);
      expect(res.header["content-type"]).toContain("text/csv");
    });
  });

  // --- ANALYTICS ---
  describe("Analytics API", () => {
    it("GET /api/analytics/material-usage - success", async () => {
      const mockUsage = [{ MaterialName: "Vero", totalUsage: 1000 }];
      // Mock the raw query result
      prismaMock.$queryRaw.mockResolvedValue(mockUsage as any);

      const res = await request(app).get("/api/analytics/material-usage");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].MaterialName).toBe("Vero");
    });
  });
});
