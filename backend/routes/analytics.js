const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/material-usage", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.MaterialName, SUM(jm.MaterialUsageGrams) AS totalUsage
      FROM JobMaterials jm
      JOIN Materials m ON jm.MaterialID = m.MaterialID
      GROUP BY m.MaterialName
      ORDER BY totalUsage DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error retrieving material usage:", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/jobs-over-time", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT DATE_FORMAT(PrintDate, '%Y-%m') as period, COUNT(*) as jobCount
    FROM Jobs
    GROUP BY period
    ORDER BY period
  `);
  res.json(rows);
});

module.exports = router;
