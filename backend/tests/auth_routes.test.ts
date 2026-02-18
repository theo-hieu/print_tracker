import request from "supertest";
import express from "express";
import { prismaMock } from "./prismaMock";
import authRouter from "../routes/auth";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

describe("Auth Routes", () => {
  it("POST /api/auth/register - success", async () => {
    const newUser = {
      UserName: "NewUser",
      Email: "new@example.com",
      Password: "password123",
    };
    prismaMock.user.findUnique.mockResolvedValue(null); // No existing user
    (bcrypt.genSalt as jest.Mock).mockResolvedValue("salt");
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
    prismaMock.user.create.mockResolvedValue({
      UserID: 1,
      UserName: "NewUser",
      Email: "new@example.com",
    } as any);
    (jwt.sign as jest.Mock).mockReturnValue("token");

    const res = await request(app).post("/api/auth/register").send(newUser);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("POST /api/auth/login - success", async () => {
    const creds = { Email: "test@example.com", Password: "password123" };
    const mockUser = {
      UserID: 1,
      Email: "test@example.com",
      PasswordHash: "hashed",
      UserName: "Test",
    };

    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue("token");

    const res = await request(app).post("/api/auth/login").send(creds);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("POST /api/auth/login - fail invalid credentials", async () => {
    const creds = { Email: "test@example.com", Password: "wrong" };
    const mockUser = {
      UserID: 1,
      Email: "test@example.com",
      PasswordHash: "hashed",
    };

    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app).post("/api/auth/login").send(creds);
    expect(res.status).toBe(400);
  });
});
