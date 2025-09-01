const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const usersRouter = require("./routes/users");
const materialsRouter = require("./routes/materials");
const modelsRouter = require("./routes/models");
const jobsRouter = require("./routes/jobs");
const printersRouter = require("./routes/printers");
const analyticsRouter = require("./routes/analytics");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/stl_files", express.static(path.join(__dirname, "stl_files")));

app.use("/api/users", usersRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/models", modelsRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/printers", printersRouter);
app.use("/api/analytics", analyticsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
