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
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prismaClient_1 = __importDefault(require("../prismaClient"));
const validate_1 = __importDefault(require("../middleware/validate"));
const auth_1 = __importDefault(require("../middleware/auth"));
const schemas_1 = require("../validators/schemas");
const router = express_1.default.Router();
const uploadDir = path_1.default.join(__dirname, "..", "stl_files");
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const safe = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
        cb(null, safe);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!/\.stl$/i.test(file.originalname))
            return cb(new Error("Only .stl files allowed"));
        cb(null, true);
    },
});
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const models = yield prismaClient_1.default.model.findMany();
    res.json(models);
}));
router.get("/:id/materials", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const materials = yield prismaClient_1.default.modelMaterial.findMany({
        where: { ModelID: parseInt(id) },
        select: {
            MaterialID: true,
            FilamentUsageGrams: true,
        },
    });
    res.json(materials);
}));
router.post("/", auth_1.default, upload.single("stlFile"), (0, validate_1.default)(schemas_1.createModelSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ModelName, EstimatedCost, EstimatedPrintTime, EstimatedFilamentUsage, } = req.body;
    const stlPath = req.file ? `/stl_files/${req.file.filename}` : null;
    const newModel = yield prismaClient_1.default.model.create({
        data: {
            ModelName,
            EstimatedCost: EstimatedCost || 0,
            STLFilePath: stlPath,
            EstimatedPrintTime: EstimatedPrintTime || null,
            EstimatedFilamentUsage: EstimatedFilamentUsage || 0,
        },
    });
    res.json({ message: "Model added", ModelID: newModel.ModelID });
}));
router.post("/model-materials", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ModelID, MaterialID, FilamentUsageGrams } = req.body;
    try {
        yield prismaClient_1.default.modelMaterial.create({
            data: {
                ModelID: parseInt(ModelID),
                MaterialID: parseInt(MaterialID),
                FilamentUsageGrams: parseFloat(FilamentUsageGrams),
            },
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
}));
router.put("/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { ModelName, EstimatedCost, EstimatedPrintTime, EstimatedFilamentUsage, } = req.body;
    try {
        const updatedModel = yield prismaClient_1.default.model.update({
            where: { ModelID: parseInt(id) },
            data: {
                ModelName,
                EstimatedCost: EstimatedCost || undefined,
                EstimatedPrintTime: EstimatedPrintTime || undefined,
                EstimatedFilamentUsage: EstimatedFilamentUsage || undefined,
            },
        });
        res.json({ message: "Model updated", model: updatedModel });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update model" });
    }
}));
router.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield prismaClient_1.default.model.delete({
        where: { ModelID: parseInt(id) },
    });
    res.json({ message: "Model deleted" });
}));
exports.default = router;
