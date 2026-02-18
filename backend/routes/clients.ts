import express from "express";
import prisma from "../prismaClient";

const router = express.Router();

// GET all clients
router.get("/", async (req, res) => {
  const clients = await prisma.client.findMany({
    orderBy: { Name: "asc" },
  });
  res.json(clients);
});

// GET one client
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const client = await prisma.client.findUnique({
    where: { ClientID: Number(id) },
  });
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }
  res.json(client);
});

// POST create client
router.post("/", async (req, res) => {
  const { Name, Title, Department, Chartstring, PI } = req.body;
  if (!Name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const client = await prisma.client.create({
    data: {
      Name,
      Title,
      Department,
      Chartstring,
      PI,
    },
  });
  res.status(201).json(client);
});

// PUT update client
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { Name, Title, Department, Chartstring, PI } = req.body;

  try {
    const client = await prisma.client.update({
      where: { ClientID: Number(id) },
      data: {
        Name,
        Title,
        Department,
        Chartstring,
        PI,
      },
    });
    res.json(client);
  } catch (error) {
    res.status(404).json({ error: "Client not found" });
  }
});

// DELETE client
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.client.delete({
      where: { ClientID: Number(id) },
    });
    res.json({ message: "Client deleted" });
  } catch (error) {
    res.status(404).json({ error: "Client not found" });
  }
});

export default router;
