import request from "supertest";
import express from "express";
import { prismaMock } from "./prismaMock";
import materialTypesRouter from "../routes/materialTypes";

// Mock Auth Middleware
jest.mock("../middleware/auth", () => {
  return jest.fn((req, res, next) => {
    req.user = { UserID: 1, UserName: "TestUser" };
    next();
  });
});

const app = express();
app.use(express.json());
app.use("/api/material-types", materialTypesRouter);

describe("Material Types API", () => {
  it("GET /api/material-types - success", async () => {
    const mockTypes = [{ MaterialTypeID: 1, TypeName: "PLA" }];
    prismaMock.materialType.findMany.mockResolvedValue(mockTypes as any);

    const res = await request(app).get("/api/material-types");
    expect(res.status).toBe(200);
    expect(res.body[0].TypeName).toBe("PLA");
  });

  it("POST /api/material-types - success", async () => {
    const newType = { TypeName: "ABS", CostPerGram: 0.05 };
    prismaMock.materialType.create.mockResolvedValue({
      MaterialTypeID: 2,
      ...newType,
    } as any);

    const res = await request(app).post("/api/material-types").send(newType);
    expect(res.status).toBe(200);
    expect(res.body.materialType.TypeName).toBe("ABS");
  });

  it("POST /api/material-types - fail duplicate", async () => {
    prismaMock.materialType.create.mockRejectedValue({ code: "P2002" });
    const res = await request(app)
      .post("/api/material-types")
      .send({ TypeName: "PLA" });
    expect(res.status).toBe(400);
  });

  it("PUT /api/material-types/:id - success", async () => {
    const update = { TypeName: "PETG" };
    prismaMock.materialType.update.mockResolvedValue({
      MaterialTypeID: 1,
      ...update,
    } as any);

    const res = await request(app).put("/api/material-types/1").send(update);
    expect(res.status).toBe(200);
    expect(res.body.materialType.TypeName).toBe("PETG");
  });

  it("DELETE /api/material-types/:id - success", async () => {
    prismaMock.materialType.delete.mockResolvedValue({
      MaterialTypeID: 1,
    } as any);
    const res = await request(app).delete("/api/material-types/1");
    expect(res.status).toBe(200);
  });
});
