import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, ".env") });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is not set in the .env file.");
  process.exit(1);
}

const backupsDir = path.join(__dirname, "backups");
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(backupsDir, `backup-${timestamp}.sql`);

console.log(`Starting backup of database to ${backupFile}...`);

try {
  // Execute pg_dump
  // Note: pg_dump must be installed on your system and available in the system PATH.
  // You can install PostgreSQL tools from https://www.postgresql.org/download/
  execSync(`pg_dump "${dbUrl}" > "${backupFile}"`, { stdio: "inherit" });
  console.log(`Backup successfully completed: ${backupFile}`);
} catch (error) {
  console.error("Backup failed.", error);
  console.error(
    "Ensure that 'pg_dump' is installed on your system and added to your environment variables (PATH).",
  );
}
