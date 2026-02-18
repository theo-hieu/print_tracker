import { useEffect, useState } from "react";
import api from "../api";
import {
  Activity,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import PrinterCarboyGrid from "./PrinterCarboyGrid";
import LoadingSpinner from "./LoadingSpinner";

interface CarboySlot {
  AreaNumber: number;
  SlotNumber: number;
  MaterialID: number | null;
  Material?: {
    MaterialID: number;
    MaterialName: string;
    CurrentQuantityGrams?: number;
    InitialQuantityGrams?: number;
    ExpirationDate?: string;
  } | null;
}

interface Printer {
  PrinterID: number;
  PrinterName: string;
  Status: string;
  PrinterType?: string;
  NextMaintenance?: string;
  MaxCarboys?: number;
  PrinterCarboys?: CarboySlot[];
}

interface Material {
  MaterialID: number;
  MaterialName: string;
}

export default function Home() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [maintenanceDue, setMaintenanceDue] = useState<Printer[]>([]);
  const [carboysExpanded, setCarboysExpanded] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [pRes, mRes, mdRes] = await Promise.all([
        api.get("/printers"),
        api.get("/materials"),
        api.get("/printers/maintenance-due"),
      ]);
      setPrinters(pRes.data);
      setMaterials(mRes.data);
      setMaintenanceDue(mdRes.data);
      // Expand all printers by default
      setCarboysExpanded((prev) => {
        if (prev.size === 0) {
          return new Set(pRes.data.map((p: Printer) => p.PrinterID));
        }
        return prev;
      });
    } catch (err) {
      console.error("Failed to load home data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCarboyChange = async (
    printerId: number,
    areaNumber: number,
    slotNumber: number,
    materialId: number | null,
  ) => {
    try {
      await api.put(`/printers/${printerId}/carboys`, {
        carboys: [
          {
            AreaNumber: Number(areaNumber),
            SlotNumber: Number(slotNumber),
            MaterialID: materialId ? Number(materialId) : null,
          },
        ],
      });
      load();
    } catch (err: any) {
      console.error("Carboy assignment failed", err);
      alert(`Assignment failed: ${err.response?.data?.error || err.message}`);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const activePrinters = printers.filter((p) => p.Status === "Printing");
  const lowMaterialPrinters = printers.filter((p) =>
    p.PrinterCarboys?.some(
      (c) =>
        c.Material &&
        (c.Material.CurrentQuantityGrams ?? 0) <
          (c.Material.InitialQuantityGrams || 1000) * 0.1, // < 10%
    ),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Cards */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Printers</p>
            <p className="text-2xl font-bold text-gray-800">
              {activePrinters.length} / {printers.length}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Maintenance Due</p>
            <p className="text-2xl font-bold text-gray-800">
              {maintenanceDue.length}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Low Material</p>
            <p className="text-2xl font-bold text-gray-800">
              {lowMaterialPrinters.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Printer Status</h3>
          <Link
            to="/printers"
            className="text-sm text-blue-600 hover:underline"
          >
            View All
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {printers.map((p) => {
            const isMaintDue = maintenanceDue.some(
              (dp) => dp.PrinterID === p.PrinterID,
            );
            return (
              <div
                key={p.PrinterID}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        p.Status === "Printing"
                          ? "bg-blue-500 animate-pulse"
                          : p.Status === "Error"
                            ? "bg-red-500"
                            : p.Status === "Offline"
                              ? "bg-gray-400"
                              : "bg-green-500"
                      }`}
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {p.PrinterName}
                      </div>
                      <div className="text-xs text-gray-500 flex gap-2">
                        <span>{p.PrinterType}</span>
                        {isMaintDue && (
                          <span className="text-orange-600 font-semibold flex items-center gap-0.5">
                            <AlertTriangle size={10} /> Maintenance Due
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-600">
                      {p.Status}
                    </div>
                    {p.PrinterCarboys && p.PrinterCarboys.length > 0 && (
                      <button
                        onClick={() => {
                          setCarboysExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.PrinterID)) {
                              next.delete(p.PrinterID);
                            } else {
                              next.add(p.PrinterID);
                            }
                            return next;
                          });
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {carboysExpanded.has(p.PrinterID) ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Carboy View */}
                {carboysExpanded.has(p.PrinterID) &&
                  p.PrinterCarboys &&
                  p.PrinterCarboys.length > 0 && (
                    <div className="mt-4">
                      <PrinterCarboyGrid
                        carboys={p.PrinterCarboys}
                        materials={materials}
                        onCarboyChange={(area, slot, matId) =>
                          handleCarboyChange(p.PrinterID, area, slot, matId)
                        }
                      />
                    </div>
                  )}
              </div>
            );
          })}
          {printers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No printers found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
