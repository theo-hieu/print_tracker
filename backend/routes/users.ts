import express, { Request, Response } from "express";
import prisma from "../prismaClient";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      UserID: true,
      UserName: true,
    },
  });
  res.json(users);
});

export default router;
