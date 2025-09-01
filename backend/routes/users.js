const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM Users");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { UserName } = req.body;
  await pool.query("INSERT INTO Users (UserName) VALUES (?)", [UserName]);
  res.json({ message: "User added" });
});

module.exports = router;
