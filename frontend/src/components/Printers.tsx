import { useEffect, useState } from "react";
import api from "../api";
import {
  Plus,
  Trash2,
  X,
  Cpu,
  AlertTriangle,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CarboySlot {
  AreaNumber: number;
  SlotNumber: number;
  MaterialID: number | null;
  Material?: {
    MaterialID: number;
    MaterialName: string;
    Color?: string;
    CurrentQuantityGrams?: number;
    InitialQuantityGrams?: number;
    ExpirationDate?: string;
  } | null;
}

interface Printer {
  PrinterID: number;
  PrinterName: string;
  PrinterType?: string;
  Location?: string;
  Status?: string;
  Description?: string;
  LastMaintenance?: string;
  NextMaintenance?: string;
  MaintenanceIntervalHours?: number;
  TotalPrintHours?: number;
  MaxCarboys?: number;
  PrinterCarboys?: CarboySlot[];
}

interface Material {
  MaterialID: number;
  MaterialName: string;
  Color?: string;
}

export default function Printers() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [maintenanceDue, setMaintenanceDue] = useState<Printer[]>([]);
  const [filterType, setFilterType] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [carboysExpanded, setCarboysExpanded] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    PrinterName: "",
    PrinterType: "",
    Location: "",
    Status: "Idle",
    Description: "",
    LastMaintenance: "",
    NextMaintenance: "",
    MaintenanceIntervalHours: "",
    TotalPrintHours: "",
  });

  async function load() {
    try {
      const params = filterType ? { type: filterType } : {};
      const [pRes, mRes, mdRes] = await Promise.all([
        api.get("/printers", { params }),
        api.get("/materials"),
        api.get("/printers/maintenance-due"),
      ]);
      setPrinters(pRes.data);
      setMaterials(mRes.data);
      setMaintenanceDue(mdRes.data);
    } catch (err) {
      console.error("Failed to load printers", err);
    }
  }

  useEffect(() => {
    load();
  }, [filterType]);

  const isDue = (p: Printer) =>
    maintenanceDue.some((d) => d.PrinterID === p.PrinterID);

  const openModal = (printer?: Printer) => {
    if (printer) {
      setEditingPrinter(printer);
      setFormData({
        PrinterName: printer.PrinterName,
        PrinterType: printer.PrinterType || "",
        Location: printer.Location || "",
        Status: printer.Status || "Idle",
        Description: printer.Description || "",
        LastMaintenance: printer.LastMaintenance
          ? new Date(printer.LastMaintenance).toISOString().split("T")[0]
          : "",
        NextMaintenance: printer.NextMaintenance
          ? new Date(printer.NextMaintenance).toISOString().split("T")[0]
          : "",
        MaintenanceIntervalHours:
          printer.MaintenanceIntervalHours?.toString() || "",
        TotalPrintHours: printer.TotalPrintHours?.toString() || "",
      });
    } else {
      setEditingPrinter(null);
      setFormData({
        PrinterName: "",
        PrinterType: "",
        Location: "",
        Status: "Idle",
        Description: "",
        LastMaintenance: "",
        NextMaintenance: "",
        MaintenanceIntervalHours: "",
        TotalPrintHours: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPrinter(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      MaintenanceIntervalHours: formData.MaintenanceIntervalHours
        ? parseInt(formData.MaintenanceIntervalHours)
        : null,
      TotalPrintHours: formData.TotalPrintHours
        ? parseFloat(formData.TotalPrintHours)
        : 0,
    };
    try {
      if (editingPrinter) {
        await api.put(`/printers/${editingPrinter.PrinterID}`, payload);
      } else {
        await api.post("/printers", payload);
      }
      closeModal();
      load();
    } catch (err) {
      console.error("Failed to save printer", err);
      alert("Failed to save printer");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this printer?")) return;
    try {
      await api.delete(`/printers/${id}`);
      load();
    } catch (err) {
      console.error("Failed to delete printer", err);
    }
  };

  const handleMaintenanceDone = async (id: number) => {
    try {
      await api.post(`/printers/${id}/maintenance`);
      load();
    } catch (err) {
      console.error("Maintenance update failed", err);
    }
  };

  const handleCarboyChange = async (
    printerId: number,
    areaNumber: number,
    slotNumber: number,
    materialId: number | null,
  ) => {
    try {
      console.log("Saving carboy:", {
        AreaNumber: areaNumber,
        SlotNumber: slotNumber,
        MaterialID: materialId,
      });
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

  const printerTypes = [
    ...new Set(printers.map((p) => p.PrinterType).filter(Boolean)),
  ];

  // Group carboy slots into areas for display
  const getCarboyAreas = (carboys: CarboySlot[]) => {
    const areas: { [area: number]: CarboySlot[] } = {};
    for (const cb of carboys) {
      if (!areas[cb.AreaNumber]) areas[cb.AreaNumber] = [];
      areas[cb.AreaNumber].push(cb);
    }
    return areas;
  };

  const statusColors: Record<string, string> = {
    Idle: "bg-green-100 text-green-800",
    Printing: "bg-blue-100 text-blue-800",
    Maintenance: "bg-yellow-100 text-yellow-800",
    Offline: "bg-gray-100 text-gray-600",
    Error: "bg-red-100 text-red-800",
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
      {/* Maintenance Alert Banner */}
      {maintenanceDue.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
          <Wrench size={20} className="text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              Maintenance Due
            </p>
            <p className="text-xs text-orange-700">
              {maintenanceDue.map((p) => p.PrinterName).join(", ")} —
              maintenance overdue or hours exceeded.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6 border-b pb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Cpu /> Printers
        </h2>
        <div className="flex items-center gap-3">
          <select
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            {printerTypes.map((t) => (
              <option key={t} value={t!}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={() => openModal()}
            className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> Add Printer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {printers.map((p) => (
            <div
              key={p.PrinterID}
              onClick={() => openModal(p)}
              className={`border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer flex flex-col gap-3 ${
                isDue(p)
                  ? "border-orange-400 bg-orange-50/40"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    {p.PrinterName}
                    {isDue(p) && (
                      <AlertTriangle size={16} className="text-orange-500" />
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {p.PrinterType && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                        {p.PrinterType}
                      </span>
                    )}
                    {p.Status && (
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[p.Status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {p.Status}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p.PrinterID);
                  }}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                {p.Location && (
                  <div>
                    <span className="font-semibold">Location:</span>{" "}
                    {p.Location}
                  </div>
                )}
                {p.TotalPrintHours != null && (
                  <div>
                    <span className="font-semibold">Hours:</span>{" "}
                    {Number(p.TotalPrintHours).toFixed(1)}h
                  </div>
                )}
                {p.LastMaintenance && (
                  <div>
                    <span className="font-semibold">Last Maint:</span>{" "}
                    {new Date(p.LastMaintenance).toLocaleDateString()}
                  </div>
                )}
                {p.NextMaintenance && (
                  <div>
                    <span className="font-semibold">Next Maint:</span>{" "}
                    {new Date(p.NextMaintenance).toLocaleDateString()}
                  </div>
                )}
                {p.MaintenanceIntervalHours && (
                  <div>
                    <span className="font-semibold">Interval:</span>{" "}
                    {p.MaintenanceIntervalHours}h
                  </div>
                )}
              </div>

              {/* Maintenance Button */}
              {isDue(p) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMaintenanceDone(p.PrinterID);
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 w-fit"
                >
                  <Wrench size={14} /> Mark Maintenance Done
                </button>
              )}

              {/* Carboy Slots */}
              {p.PrinterCarboys && p.PrinterCarboys.length > 0 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="border-t border-gray-200 pt-3"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarboysExpanded(
                        carboysExpanded === p.PrinterID ? null : p.PrinterID,
                      );
                    }}
                    className="flex items-center gap-1 text-sm font-semibold text-gray-700 mb-2 hover:text-gray-900"
                  >
                    Carboy Areas ({p.MaxCarboys || 8})
                    {carboysExpanded === p.PrinterID ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>

                  {carboysExpanded === p.PrinterID &&
                    (() => {
                      const areas = getCarboyAreas(p.PrinterCarboys!);
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {/* 4 rows × 2 columns of areas */}
                          {Array.from({ length: 8 }, (_, i) => i + 1).map(
                            (areaNum) => {
                              const slots = areas[areaNum] || [];
                              return (
                                <div
                                  key={areaNum}
                                  className="border border-gray-300 rounded-lg p-2 bg-white"
                                >
                                  <div className="text-xs font-semibold text-gray-500 mb-1">
                                    Area {areaNum}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    {[1, 2].map((slotNum) => {
                                      const slot = slots.find(
                                        (s) => s.SlotNumber === slotNum,
                                      );
                                      const matId = slot?.MaterialID || "";
                                      return (
                                        <div
                                          key={slotNum}
                                          className="flex items-center gap-1"
                                        >
                                          <span className="text-xs text-gray-400 w-6">
                                            S{slotNum}
                                          </span>
                                          <div className="flex-1">
                                            <select
                                              className="w-full text-xs border border-gray-200 rounded px-1 py-0.5 bg-gray-50 focus:ring-1 focus:ring-red-400 outline-none"
                                              value={matId}
                                              onChange={(e) => {
                                                const val = e.target.value
                                                  ? parseInt(e.target.value)
                                                  : null;
                                                handleCarboyChange(
                                                  p.PrinterID,
                                                  areaNum,
                                                  slotNum,
                                                  val,
                                                );
                                              }}
                                            >
                                              <option value="">Empty</option>
                                              {materials.map((m) => (
                                                <option
                                                  key={m.MaterialID}
                                                  value={m.MaterialID}
                                                >
                                                  {m.MaterialName}
                                                </option>
                                              ))}
                                            </select>
                                            {slot?.Material && (
                                              <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                                                <span
                                                  className={
                                                    (slot.Material
                                                      .CurrentQuantityGrams ??
                                                      0) < 500
                                                      ? "text-red-600 font-medium"
                                                      : ""
                                                  }
                                                >
                                                  {Number(
                                                    slot.Material
                                                      .CurrentQuantityGrams ??
                                                      0,
                                                  ).toFixed(0)}
                                                  g
                                                </span>{" "}
                                                /{" "}
                                                {Number(
                                                  slot.Material
                                                    .InitialQuantityGrams ?? 0,
                                                ).toFixed(0)}
                                                g
                                                {slot.Material
                                                  .ExpirationDate && (
                                                  <span className="block text-gray-400">
                                                    Exp:{" "}
                                                    {new Date(
                                                      slot.Material
                                                        .ExpirationDate,
                                                    ).toLocaleDateString()}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      );
                    })()}
                </div>
              )}
            </div>
          ))}
          {printers.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-8">
              No printers found
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingPrinter ? "Edit Printer" : "Add Printer"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 space-y-4 overflow-y-auto"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Printer Name
                </label>
                <input
                  required
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                  value={formData.PrinterName}
                  onChange={(e) =>
                    setFormData({ ...formData, PrinterName: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.PrinterType}
                    onChange={(e) =>
                      setFormData({ ...formData, PrinterType: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    <option value="FDM">FDM</option>
                    <option value="SLA">SLA</option>
                    <option value="PolyJet">PolyJet</option>
                    <option value="SLS">SLS</option>
                    <option value="DLP">DLP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.Status}
                    onChange={(e) =>
                      setFormData({ ...formData, Status: e.target.value })
                    }
                  >
                    <option value="Idle">Idle</option>
                    <option value="Printing">Printing</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Offline">Offline</option>
                    <option value="Error">Error</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.Location}
                    onChange={(e) =>
                      setFormData({ ...formData, Location: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Hours
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.TotalPrintHours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        TotalPrintHours: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Maint.
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.LastMaintenance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        LastMaintenance: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Maint.
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.NextMaintenance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        NextMaintenance: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interval (h)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.MaintenanceIntervalHours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        MaintenanceIntervalHours: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                  rows={2}
                  value={formData.Description}
                  onChange={(e) =>
                    setFormData({ ...formData, Description: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
                >
                  {editingPrinter ? "Save Changes" : "Add Printer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
