const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM Materials");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { MaterialName } = req.body;
  await pool.query("INSERT INTO Materials (MaterialName) VALUES (?)", [MaterialName]);
  res.json({ message: "Material added" });
});

router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM Materials WHERE MaterialID = ?", [req.params.id]);
  res.json({ message: "Material deleted" });
});

module.exports = router;
