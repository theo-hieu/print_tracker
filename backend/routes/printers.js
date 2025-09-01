const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM Printers");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { PrinterName } = req.body;
  await pool.query("INSERT INTO Printers (PrinterName) VALUES (?)", [PrinterName]);
  res.json({ message: "Printer added" });
});

router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM Printers WHERE PrinterID = ?", [req.params.id]);
  res.json({ message: "Printer deleted" });
});

module.exports = router;
