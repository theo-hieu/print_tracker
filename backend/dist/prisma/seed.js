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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Seeding database...");
        // 1. Upsert the Stratasys J850 printer
        const j850 = yield prisma.printer.upsert({
            where: { PrinterID: 1 },
            update: {},
            create: {
                PrinterName: "Stratasys J850",
                PrinterType: "PolyJet",
                Status: "Idle",
                Location: "Main Lab",
                MaxCarboys: 8,
                Description: "Stratasys J850 PolyJet full-color multi-material 3D printer. 8 carboy areas (4 rows × 2 columns), each area holds up to 2 slots.",
            },
        });
        console.log(`Printer: ${j850.PrinterName} (ID ${j850.PrinterID})`);
        // 2. Upsert the 6 default materials at 4000g
        const defaultMaterials = [
            { name: "VeroWhite", color: "White", type: "Model" },
            { name: "VeroClear", color: "Clear", type: "Model" },
            { name: "Agilus30Clear", color: "Clear", type: "Model" },
            { name: "TissueMatrix", color: "White", type: "Model" },
            { name: "GelMatrix", color: "Clear", type: "Support" },
            { name: "Support", color: "White", type: "Support" },
        ];
        for (const mat of defaultMaterials) {
            const m = yield prisma.material.upsert({
                where: { MaterialID: defaultMaterials.indexOf(mat) + 1 },
                update: {},
                create: {
                    MaterialName: mat.name,
                    Color: mat.color,
                    Type: mat.type,
                    InitialQuantityGrams: 4000,
                    CurrentQuantityGrams: 4000,
                    ReorderThresholdGrams: 500,
                },
            });
            console.log(`  Material: ${m.MaterialName} (${m.CurrentQuantityGrams}g)`);
        }
        // 3. Create empty carboy slots for J850 (8 areas × 2 slots)
        for (let area = 1; area <= 8; area++) {
            for (let slot = 1; slot <= 2; slot++) {
                yield prisma.printerCarboy.upsert({
                    where: {
                        PrinterID_AreaNumber_SlotNumber: {
                            PrinterID: j850.PrinterID,
                            AreaNumber: area,
                            SlotNumber: slot,
                        },
                    },
                    update: {},
                    create: {
                        PrinterID: j850.PrinterID,
                        AreaNumber: area,
                        SlotNumber: slot,
                        MaterialID: null,
                    },
                });
            }
        }
        console.log("  Created 16 carboy slots (8 areas × 2 slots)");
        console.log("Seeding complete!");
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
