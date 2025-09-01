const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT j.*, u.UserName, m.ModelName, p.PrinterName
     FROM Jobs j
     LEFT JOIN Users u ON u.UserID = j.UserID
     LEFT JOIN Models m ON m.ModelID = j.ModelID
     LEFT JOIN Printers p ON p.PrinterID = j.PrinterID
     ORDER BY j.PrintDate DESC`
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { JobName, UserID, ModelID, PrintDate, Status, PrinterID, Notes } = req.body;
  
  const [result] = await pool.query(
    `INSERT INTO Jobs (JobName, UserID, ModelID, PrintDate, Status, PrinterID, Notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      JobName,
      UserID,
      ModelID,
      PrintDate,
      Status || "queued",
      PrinterID || null,
      Notes || null
    ]
  );

  res.json({ JobID: result.insertId, message: "Job added" });
});


router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const { JobName, UserID, ModelID, PrintDate, Status, PrinterID, Notes } = req.body;
  await pool.query(
    "UPDATE Jobs SET JobName=?, UserID=?, ModelID=?, PrintDate=?, Status=?, PrinterID=?, Notes=? WHERE JobID=?",
    [JobName, UserID, ModelID, PrintDate, Status, PrinterID, Notes, id]
  );
  res.json({ message: "Job updated" });
});

router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM Jobs WHERE JobID = ?", [req.params.id]);
  res.json({ message: "Job deleted" });
});

router.post('/job-materials', async (req, res) => {
  const { JobID, MaterialID, MaterialUsageGrams } = req.body;
  await pool.query(
    `INSERT INTO JobMaterials (JobID, MaterialID, MaterialUsageGrams)
     VALUES (?, ?, ?)`,
    [JobID, MaterialID, MaterialUsageGrams]
  );
  res.json({ success: true });
});

module.exports = router;
