const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const router = express.Router();

const uploadDir = path.join(__dirname, "..", "stl_files");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/\.stl$/i.test(file.originalname)) return cb(new Error("Only .stl files allowed"));
    cb(null, true);
  },
});

router.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM Models");
  res.json(rows);
});

router.get("/:id/materials", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT MaterialID, FilamentUsageGrams
    FROM ModelMaterials
    WHERE ModelID = ?
  `, [req.params.id]);
  res.json(rows);
});

router.post("/", upload.single("stlFile"), async (req, res) => {
  try {
    const { ModelName, EstimatedCost, EstimatedPrintTime, EstimatedFilamentUsage } = req.body;
    const stlPath = req.file ? `/stl_files/${req.file.filename}` : null;

    const [result] = await pool.query(
      "INSERT INTO Models (ModelName, EstimatedCost, STLFilePath, EstimatedPrintTime, EstimatedFilamentUsage) VALUES (?,?,?,?,?)",
      [ModelName, EstimatedCost || 0, stlPath, EstimatedPrintTime || null, EstimatedFilamentUsage || 0]
    );

    res.json({ message: "Model added", ModelID: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post('/model-materials', async (req, res) => {
  const { ModelID, MaterialID, FilamentUsageGrams } = req.body;
  try {
    await pool.query(
      `INSERT INTO ModelMaterials (ModelID, MaterialID, FilamentUsageGrams) VALUES (?, ?, ?)`,
      [ModelID, MaterialID, FilamentUsageGrams]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM Models WHERE ModelID = ?", [req.params.id]);
  res.json({ message: "Model deleted" });
});

module.exports = router;
