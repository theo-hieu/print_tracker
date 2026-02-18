import request from "supertest";
import express from "express";
import { prismaMock } from "./prismaMock";
import clientRouter from "../routes/clients";

// Clients router doesn't seem to use auth middleware based on file content!
// (Step 463 shows no auth import or usage).
// So we don't need to mock auth here unless we add it later.

const app = express();
app.use(express.json());
app.use("/api/clients", clientRouter);

describe("Clients API", () => {
  it("GET /api/clients - success", async () => {
    const mockClients = [{ ClientID: 1, Name: "Test Client" }];
    prismaMock.client.findMany.mockResolvedValue(mockClients as any);

    const res = await request(app).get("/api/clients");
    expect(res.status).toBe(200);
    expect(res.body[0].Name).toBe("Test Client");
  });

  it("GET /api/clients/:id - success", async () => {
    const mockClient = { ClientID: 1, Name: "Test Client" };
    prismaMock.client.findUnique.mockResolvedValue(mockClient as any);

    const res = await request(app).get("/api/clients/1");
    expect(res.status).toBe(200);
    expect(res.body.Name).toBe("Test Client");
  });

  it("POST /api/clients - success", async () => {
    const newClient = { Name: "New Client", Title: "T", Department: "D" };
    prismaMock.client.create.mockResolvedValue({
      ClientID: 1,
      ...newClient,
    } as any);

    const res = await request(app).post("/api/clients").send(newClient);
    expect(res.status).toBe(201);
    expect(res.body.Name).toBe("New Client");
  });

  it("PUT /api/clients/:id - success", async () => {
    const updatedClient = { Name: "Updated Client" };
    prismaMock.client.update.mockResolvedValue({
      ClientID: 1,
      ...updatedClient,
    } as any);

    const res = await request(app).put("/api/clients/1").send(updatedClient);
    expect(res.status).toBe(200);
    expect(res.body.Name).toBe("Updated Client");
  });

  it("DELETE /api/clients/:id - success", async () => {
    prismaMock.client.delete.mockResolvedValue({ ClientID: 1 } as any);
    const res = await request(app).delete("/api/clients/1");
    expect(res.status).toBe(200);
  });
});
