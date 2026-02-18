"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
// dotenv should be loaded in server.ts, but valid here too if standalone
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST || "db",
    user: process.env.DB_USER || "printuser",
    password: process.env.DB_PASSWORD || "printpass",
    database: process.env.DB_NAME || "printing_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
exports.default = pool;
