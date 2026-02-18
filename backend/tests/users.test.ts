import request from "supertest";
import express from "express";
import { prismaMock } from "./prismaMock";
import userRouter from "../routes/users";

// Mock Auth Middleware
jest.mock("../middleware/auth", () => {
  return jest.fn((req, res, next) => {
    req.user = { UserID: 1, UserName: "TestUser" };
    next();
  });
});

const app = express();
app.use(express.json());
app.use("/api/users", userRouter);

describe("Users API", () => {
  it("GET /api/users - success", async () => {
    const mockUsers = [{ UserID: 1, UserName: "TestUser" }];
    prismaMock.user.findMany.mockResolvedValue(mockUsers as any);

    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].UserName).toBe("TestUser");
  });
});
