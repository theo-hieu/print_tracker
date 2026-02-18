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
const prismaClient_1 = __importDefault(require("../prismaClient"));
const validate_1 = __importDefault(require("../middleware/validate"));
const auth_1 = __importDefault(require("../middleware/auth"));
const schemas_1 = require("../validators/schemas");
const router = express_1.default.Router();
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const materials = yield prismaClient_1.default.material.findMany({
        orderBy: { MaterialName: "asc" },
    });
    res.json(materials);
}));
// GET materials with low-stock alerts
router.get("/alerts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const materials = yield prismaClient_1.default.material.findMany({
        where: {
            ReorderThresholdGrams: { not: null },
        },
    });
    const alerts = materials.filter((m) => {
        if (m.CurrentQuantityGrams === null || m.ReorderThresholdGrams === null)
            return false;
        return Number(m.CurrentQuantityGrams) <= Number(m.ReorderThresholdGrams);
    });
    res.json(alerts);
}));
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const material = yield prismaClient_1.default.material.findUnique({
        where: { MaterialID: parseInt(id) },
    });
    if (!material) {
        res.status(404).json({ error: "Material not found" });
        return;
    }
    res.json(material);
}));
router.post("/", auth_1.default, (0, validate_1.default)(schemas_1.createMaterialSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { MaterialName, Color, Type, InitialQuantityGrams, CurrentQuantityGrams, CostPerGram, ReorderThresholdGrams, ExpirationDate, LotNumber, Location, } = req.body;
    const newMaterial = yield prismaClient_1.default.material.create({
        data: {
            MaterialName,
            Color,
            Type,
            InitialQuantityGrams,
            CurrentQuantityGrams,
            CostPerGram,
            ReorderThresholdGrams,
            ExpirationDate: ExpirationDate ? new Date(ExpirationDate) : null,
            LotNumber,
            Location,
        },
    });
    res.json({ message: "Material added", MaterialID: newMaterial.MaterialID });
}));
router.put("/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { MaterialName, Color, Type, InitialQuantityGrams, CurrentQuantityGrams, CostPerGram, ReorderThresholdGrams, ExpirationDate, LotNumber, Location, } = req.body;
    try {
        const updatedMaterial = yield prismaClient_1.default.material.update({
            where: { MaterialID: parseInt(id) },
            data: {
                MaterialName,
                Color,
                Type,
                InitialQuantityGrams,
                CurrentQuantityGrams,
                CostPerGram,
                ReorderThresholdGrams,
                ExpirationDate: ExpirationDate ? new Date(ExpirationDate) : null,
                LotNumber,
                Location,
            },
        });
        res.json({ message: "Material updated", material: updatedMaterial });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update material" });
    }
}));
router.delete("/:id", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = parseInt(req.params.id);
    yield prismaClient_1.default.material.delete({ where: { MaterialID: id } });
    res.json({ message: "Material deleted" });
}));
exports.default = router;
