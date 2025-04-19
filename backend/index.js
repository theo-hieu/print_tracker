const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL connected!');
});


// ----- USERS -----
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM Users', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/users', (req, res) => {
  const { userName } = req.body;
  if (!userName) return res.status(400).json({ error: 'UserName is required' });

  db.query('INSERT INTO Users (UserName) VALUES (?)', [userName], (err, result) => {
    if (err) return res.status(500).json(err);
    res.status(201).json({ message: 'User added', id: result.insertId });
  });
});


// ----- MATERIALS -----
app.get('/api/materials', (req, res) => {
  db.query('SELECT * FROM Materials', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/materials', (req, res) => {
  const { materialName } = req.body;
  if (!materialName) return res.status(400).json({ error: 'MaterialName is required' });

  db.query('INSERT INTO Materials (MaterialName) VALUES (?)', [materialName], (err, result) => {
    if (err) return res.status(500).json(err);
    res.status(201).json({ message: 'Material added', id: result.insertId });
  });
});


// ----- MODELS -----
app.get('/api/models', (req, res) => {
  db.query('SELECT * FROM Models', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/models', (req, res) => {
  const { modelName, estimatedCost, stlFilePath } = req.body;
  if (!modelName) return res.status(400).json({ error: 'ModelName is required' });

  db.query(
    'INSERT INTO Models (ModelName, EstimatedCost, STLFilePath) VALUES (?, ?, ?)',
    [modelName, estimatedCost || null, stlFilePath || null],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({ message: 'Model added', id: result.insertId });
    }
  );
});


// ----- JOBS -----
app.get('/api/jobs', (req, res) => {
  db.query('SELECT * FROM Jobs', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/jobs', (req, res) => {
  const { jobName, userID, modelID, printDate } = req.body;
  if (!jobName || !userID || !modelID || !printDate) {
    return res.status(400).json({ error: 'Missing required job fields' });
  }

  db.query(
    'INSERT INTO Jobs (JobName, UserID, ModelID, PrintDate) VALUES (?, ?, ?, ?)',
    [jobName, userID, modelID, printDate],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({ message: 'Job added', id: result.insertId });
    }
  );
});


// ----- JOB MATERIALS (Join Table) -----
app.get('/api/jobmaterials', (req, res) => {
  db.query('SELECT * FROM JobMaterials', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/jobmaterials', (req, res) => {
  const { jobID, materialID, materialUsageGrams } = req.body;
  if (!jobID || !materialID || !materialUsageGrams) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.query(
    'INSERT INTO JobMaterials (JobID, MaterialID, MaterialUsageGrams) VALUES (?, ?, ?)',
    [jobID, materialID, materialUsageGrams],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({ message: 'Material added to job' });
    }
  );
});


// ----- START SERVER -----
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
