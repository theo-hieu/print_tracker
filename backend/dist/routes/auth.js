"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prismaClient_1 = __importDefault(require("../prismaClient"));
const validate_1 = __importDefault(require("../middleware/validate"));
const zod_1 = require("zod");
const router = express_1.default.Router();
const registerSchema = zod_1.z.object({
    UserName: zod_1.z.string().min(1),
    Email: zod_1.z.string().email(),
    Password: zod_1.z.string().min(6),
});
const loginSchema = zod_1.z.object({
    Email: zod_1.z.string().email(),
    Password: zod_1.z.string(),
});
router.post("/register", (0, validate_1.default)(registerSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { UserName, Email, Password } = req.body;
    // Check if user exists
    const existing = yield prismaClient_1.default.user.findUnique({
        where: { Email },
    });
    if (existing) {
        res.status(400).json({ error: "User already exists" });
        return;
    }
    // Hash password
    const salt = yield bcryptjs_1.default.genSalt(10);
    const hashedPassword = yield bcryptjs_1.default.hash(Password, salt);
    // Insert user
    const newUser = yield prismaClient_1.default.user.create({
        data: {
            UserName,
            Email,
            PasswordHash: hashedPassword,
        },
        select: {
            UserID: true,
            UserName: true,
            Email: true,
        },
    });
    const token = jsonwebtoken_1.default.sign({ UserID: newUser.UserID }, process.env.JWT_SECRET, {
        expiresIn: "1h",
    });
    res.json({ token, UserID: newUser.UserID, UserName, Email });
}));
router.post("/login", (0, validate_1.default)(loginSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { Email, Password } = req.body;
    // Find user
    const user = yield prismaClient_1.default.user.findUnique({
        where: { Email },
    });
    if (!user) {
        res.status(400).json({ error: "Invalid credentials" });
        return;
    }
    // Check password
    const validPassword = yield bcryptjs_1.default.compare(Password, user.PasswordHash);
    if (!validPassword) {
        res.status(400).json({ error: "Invalid credentials" });
        return;
    }
    // Issue token
    const token = jsonwebtoken_1.default.sign({ UserID: user.UserID }, process.env.JWT_SECRET, {
        expiresIn: "1h",
    });
    res.json({
        token,
        UserID: user.UserID,
        UserName: user.UserName,
        Email: user.Email,
    });
}));
exports.default = router;
