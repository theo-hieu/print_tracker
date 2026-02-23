import express from "express";
import "express-async-errors";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import materialsRouter from "./routes/materials";
import materialTypesRouter from "./routes/materialTypes";
import modelsRouter from "./routes/models";
import jobsRouter from "./routes/jobs";
import printersRouter from "./routes/printers";
import analyticsRouter from "./routes/analytics";
import clientsRouter from "./routes/clients";

import errorHandler from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/stl_files", express.static(path.join(process.cwd(), "stl_files")));
app.use("/job_photos", express.static(path.join(process.cwd(), "job_photos")));
app.use(
  "/profile_icons",
  express.static(path.join(process.cwd(), "profile_icons")),
);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/material-types", materialTypesRouter);
app.use("/api/models", modelsRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/printers", printersRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/clients", clientsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
