import express, { Request, Response } from "express";
import prisma from "../prismaClient";
import auth from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Photo upload setup
const profileIconDir = path.join(process.cwd(), "profile_icons");
if (!fs.existsSync(profileIconDir))
  fs.mkdirSync(profileIconDir, { recursive: true });

const profileIconStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileIconDir),
  filename: (req, file, cb) => {
    const safe =
      Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, safe);
  },
});

const uploadProfileIcon = multer({
  storage: profileIconStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname))
      return cb(new Error("Only image files allowed"));
    cb(null, true);
  },
});

// GET all users
router.get("/", async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      UserID: true,
      UserName: true,
      ProfileIcon: true,
    },
  });
  res.json(users);
});

// GET current user profile
router.get("/profile", auth, async (req: Request, res: Response) => {
  const userId = (req as any).user.UserID;

  const user = await prisma.user.findUnique({
    where: { UserID: userId },
    select: {
      UserID: true,
      UserName: true,
      Email: true,
      ProfileIcon: true,
      DateJoined: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

// UPLOAD profile icon
router.post(
  "/profile/icon",
  auth,
  uploadProfileIcon.single("icon"),
  async (req: Request, res: Response) => {
    const userId = (req as any).user.UserID;

    if (!req.file) {
      res.status(400).json({ error: "No image uploaded" });
      return;
    }

    const filePath = `/profile_icons/${req.file.filename}`;

    // Get old profile icon to delete it if it exists
    const user = await prisma.user.findUnique({ where: { UserID: userId } });

    if (user && user.ProfileIcon) {
      const oldPath = path.join(process.cwd(), user.ProfileIcon);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.error("Failed to delete old profile icon:", e);
        }
      }
    }

    // Update DB
    await prisma.user.update({
      where: { UserID: userId },
      data: { ProfileIcon: filePath },
    });

    res.json({ message: "Profile icon updated", ProfileIcon: filePath });
  },
);

export default router;
