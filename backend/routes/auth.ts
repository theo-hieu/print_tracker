import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prismaClient";
import validate from "../middleware/validate";
import { z } from "zod";

const router = express.Router();

const registerSchema = z.object({
  UserName: z.string().min(1),
  Email: z.string().email(),
  Password: z.string().min(6),
});

const loginSchema = z.object({
  Email: z.string().email(),
  Password: z.string(),
});

router.post(
  "/register",
  validate(registerSchema),
  async (req: Request, res: Response) => {
    const { UserName, Email, Password } = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { Email },
    });

    if (existing) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    // Insert user
    const newUser = await prisma.user.create({
      data: {
        UserName,
        Email,
        PasswordHash: hashedPassword,
      },
      select: {
        UserID: true,
        UserName: true,
        Email: true,
      },
    });

    const token = jwt.sign(
      { UserID: newUser.UserID },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      },
    );
    res.json({ token, UserID: newUser.UserID, UserName, Email });
  },
);

router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const { Email, Password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { Email },
    });

    if (!user) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    // Check password
    const validPassword = await bcrypt.compare(Password, user.PasswordHash);
    if (!validPassword) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    // Issue token
    const token = jwt.sign(
      { UserID: user.UserID },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      },
    );
    res.json({
      token,
      UserID: user.UserID,
      UserName: user.UserName,
      Email: user.Email,
    });
  },
);

export default router;
