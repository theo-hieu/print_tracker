import express, { Request, Response } from "express";
import prisma from "../prismaClient";
import auth from "../middleware/auth";

const router = express.Router();

// GET all material types
router.get("/", async (req: Request, res: Response) => {
  try {
    const materialTypes = await prisma.materialType.findMany({
      orderBy: { TypeName: "asc" },
    });
    res.json(materialTypes);
  } catch (error) {
    console.error("Failed to fetch material types:", error);
    res.status(500).json({ error: "Failed to fetch material types" });
  }
});

// CREATE a new material type (admin function)
router.post("/", auth, async (req: Request, res: Response) => {
  const { TypeName, Description, CostPerGram } = req.body;

  if (!TypeName) {
    res.status(400).json({ error: "TypeName is required" });
    return;
  }

  try {
    const materialType = await prisma.materialType.create({
      data: {
        TypeName,
        Description: Description || null,
        CostPerGram: CostPerGram != null ? parseFloat(CostPerGram) : null,
      },
    });
    res.json({ message: "Material type created", materialType });
  } catch (error: any) {
    if (error.code === "P2002") {
      res
        .status(400)
        .json({ error: "Material type with this name already exists" });
    } else {
      console.error("Failed to create material type:", error);
      res.status(500).json({ error: "Failed to create material type" });
    }
  }
});

// UPDATE a material type
router.put("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { TypeName, Description, CostPerGram } = req.body;

  try {
    const materialType = await prisma.materialType.update({
      where: { MaterialTypeID: parseInt(id as string) },
      data: {
        TypeName: TypeName || undefined,
        Description: Description !== undefined ? Description : undefined,
        CostPerGram:
          CostPerGram !== undefined
            ? CostPerGram != null
              ? parseFloat(CostPerGram)
              : null
            : undefined,
      },
    });
    res.json({ message: "Material type updated", materialType });
  } catch (error: any) {
    if (error.code === "P2002") {
      res
        .status(400)
        .json({ error: "Material type with this name already exists" });
    } else {
      console.error("Failed to update material type:", error);
      res.status(500).json({ error: "Failed to update material type" });
    }
  }
});

// DELETE a material type
router.delete("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.materialType.delete({
      where: { MaterialTypeID: parseInt(id as string) },
    });
    res.json({ message: "Material type deleted" });
  } catch (error: any) {
    if (error.code === "P2003") {
      res.status(400).json({
        error:
          "Cannot delete material type - it is being used by models or jobs",
      });
    } else {
      console.error("Failed to delete material type:", error);
      res.status(500).json({ error: "Failed to delete material type" });
    }
  }
});

export default router;
