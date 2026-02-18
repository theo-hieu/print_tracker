import { useEffect, useState } from "react";
import api from "../api";
import LoadingSpinner from "./LoadingSpinner";
import {
  Plus,
  Trash2,
  X,
  Box,
  AlertTriangle,
  Download,
  Upload,
  Sparkles as _Sparkles,
  ChevronDown,
  ChevronUp,
  Save,
  DollarSign,
} from "lucide-react";

interface MaterialType {
  MaterialTypeID: number;
  TypeName: string;
  Description?: string;
  CostPerGram?: number;
}

interface Material {
  MaterialID: number;
  MaterialName: string;
  Color?: string;
  Type?: string;
  InitialQuantityGrams?: number;
  CurrentQuantityGrams?: number;
  CostPerGram?: number;
  MaterialTypeID?: number;
  MaterialType?: MaterialType;
  ReorderThresholdGrams?: number;
  ExpirationDate?: string;
  LotNumber?: string;
  Location?: string;
}

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [alerts, setAlerts] = useState<Material[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showMaterialTypes, setShowMaterialTypes] = useState(false);
  const [costEdits, setCostEdits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    MaterialName: "",
    Color: "",
    Type: "Model",
    MaterialTypeID: "",
    InitialQuantityGrams: "",
    CurrentQuantityGrams: "",
    ReorderThresholdGrams: "",
    ExpirationDate: "",
    LotNumber: "",
    Location: "",
  });

  async function load() {
    try {
      const [matRes, alertRes, mtRes] = await Promise.all([
        api.get("/materials"),
        api.get("/materials/alerts"),
        api.get("/material-types"),
      ]);
      setMaterials(matRes.data);
      setAlerts(alertRes.data);
      setMaterialTypes(mtRes.data);
    } catch (err) {
      console.error("Failed to load materials", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isLowStock = (m: Material) =>
    alerts.some((a) => a.MaterialID === m.MaterialID);

  if (loading) {
    return <LoadingSpinner text="Loading materials..." />;
  }

  const openModal = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        MaterialName: material.MaterialName,
        Color: material.Color || "",
        Type: material.Type || "Model",
        MaterialTypeID: material.MaterialTypeID?.toString() || "",
        InitialQuantityGrams: material.InitialQuantityGrams?.toString() || "",
        CurrentQuantityGrams: material.CurrentQuantityGrams?.toString() || "",
        ReorderThresholdGrams: material.ReorderThresholdGrams?.toString() || "",
        ExpirationDate: material.ExpirationDate
          ? new Date(material.ExpirationDate).toISOString().split("T")[0]
          : "",
        LotNumber: material.LotNumber || "",
        Location: material.Location || "",
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        MaterialName: "",
        Color: "",
        Type: "Model",
        MaterialTypeID: "",
        InitialQuantityGrams: "4000",
        CurrentQuantityGrams: "4000",
        ReorderThresholdGrams: "100",
        ExpirationDate: "",
        LotNumber: "",
        Location: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      InitialQuantityGrams: parseFloat(formData.InitialQuantityGrams) || 0,
      CurrentQuantityGrams: parseFloat(formData.CurrentQuantityGrams) || 0,
      // CostPerGram is no longer per-carboy, managed at MaterialType level
      ReorderThresholdGrams: formData.ReorderThresholdGrams
        ? parseFloat(formData.ReorderThresholdGrams)
        : null,
    };

    try {
      if (editingMaterial) {
        await api.put(`/materials/${editingMaterial.MaterialID}`, dataToSubmit);
      } else {
        await api.post("/materials", dataToSubmit);
      }
      closeModal();
      load();
    } catch (err) {
      console.error("Failed to save material", err);
      alert("Failed to save material");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete material?")) return;
    try {
      await api.delete(`/materials/${id}`);
      load();
    } catch (err) {
      console.error("Failed to delete material", err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/materials/export/csv", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `materials-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export materials");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
      await api.post("/materials/import/csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Materials imported successfully");
      load();
    } catch (err) {
      console.error("Import failed", err);
      alert("Failed to import materials");
    }
    // Reset input
    e.target.value = "";
  };

  const handleSaveCost = async (mt: MaterialType) => {
    const val = costEdits[mt.MaterialTypeID];
    if (val === undefined) return;
    try {
      await api.put(`/material-types/${mt.MaterialTypeID}`, {
        CostPerGram: val ? parseFloat(val) : null,
      });
      load();
      setCostEdits((prev) => {
        const next = { ...prev };
        delete next[mt.MaterialTypeID];
        return next;
      });
    } catch (err) {
      console.error("Failed to save cost", err);
      alert("Failed to save cost per gram");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
      {/* Low Stock Alerts Banner */}
      {alerts.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Low Stock Alert
            </p>
            <p className="text-xs text-amber-700">
              {alerts.map((a) => a.MaterialName).join(", ")} —{" "}
              {alerts.length === 1 ? "is" : "are"} below reorder threshold.
              Consider ordering more.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6 border-b pb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Box /> Materials
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="border border-gray-300 px-3 py-2 rounded text-sm flex items-center gap-1 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> Export
          </button>
          <label className="border border-gray-300 px-3 py-2 rounded text-sm flex items-center gap-1 hover:bg-gray-50 transition-colors cursor-pointer">
            <Upload size={14} /> Import
            <input
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleImport}
            />
          </label>
          <button
            onClick={() => openModal()}
            className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors ml-2"
          >
            <Plus size={18} /> Add Material
          </button>
        </div>
      </div>

      {/* Material Types Pricing Section */}
      <div className="mb-4">
        <button
          onClick={() => setShowMaterialTypes(!showMaterialTypes)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors w-full"
        >
          <DollarSign size={16} />
          Material Type Pricing ({materialTypes.length})
          {showMaterialTypes ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </button>
        {showMaterialTypes && (
          <div className="mt-3 border rounded-lg max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">
                    Material Type
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">
                    Cost per Gram ($)
                  </th>
                  <th className="px-4 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {materialTypes.map((mt) => {
                  const isEditing = costEdits[mt.MaterialTypeID] !== undefined;
                  const displayVal = isEditing
                    ? costEdits[mt.MaterialTypeID]
                    : mt.CostPerGram != null
                      ? Number(mt.CostPerGram).toFixed(4)
                      : "";
                  return (
                    <tr
                      key={mt.MaterialTypeID}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 font-medium text-gray-800">
                        {mt.TypeName}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {mt.Description || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.0001"
                          className="border rounded px-2 py-1 w-28 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                          value={displayVal}
                          placeholder="0.0000"
                          onChange={(e) =>
                            setCostEdits({
                              ...costEdits,
                              [mt.MaterialTypeID]: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        {isEditing && (
                          <button
                            onClick={() => handleSaveCost(mt)}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => (
            <div
              key={m.MaterialID}
              onClick={() => openModal(m)}
              className={`border rounded-lg p-4 hover:shadow-lg transition-shadow bg-gray-50 flex flex-col gap-2 cursor-pointer ${
                isLowStock(m)
                  ? "border-amber-400 bg-amber-50/50"
                  : "border-gray-200"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-1">
                    {m.MaterialName}
                    {isLowStock(m) && (
                      <AlertTriangle size={14} className="text-amber-500" />
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {m.Type}
                    {m.LotNumber ? ` · Lot #${m.LotNumber}` : ""}
                  </p>
                </div>
                {m.Color && (
                  <span
                    className="px-2 py-1 text-xs rounded border border-gray-300"
                    style={{
                      backgroundColor: m.Color.toLowerCase(),
                      color: ["black", "blue", "red", "green"].includes(
                        m.Color.toLowerCase(),
                      )
                        ? "white"
                        : "black",
                    }}
                  >
                    {m.Color}
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-600 space-y-1 mt-2">
                <p>
                  <span className="font-semibold">Weight:</span>{" "}
                  {m.CurrentQuantityGrams}g / {m.InitialQuantityGrams}g
                </p>
                {m.ReorderThresholdGrams && (
                  <p>
                    <span className="font-semibold">Reorder at:</span>{" "}
                    {m.ReorderThresholdGrams}g
                  </p>
                )}
                {m.ExpirationDate && (
                  <p>
                    <span className="font-semibold">Expires:</span>{" "}
                    {new Date(m.ExpirationDate).toLocaleDateString()}
                  </p>
                )}
                {m.LotNumber && (
                  <p>
                    <span className="font-semibold">Lot #:</span> {m.LotNumber}
                  </p>
                )}
                {m.Location && (
                  <p>
                    <span className="font-semibold">Loc:</span> {m.Location}
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              {m.InitialQuantityGrams && m.CurrentQuantityGrams != null && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      (m.CurrentQuantityGrams / m.InitialQuantityGrams) * 100 >
                      70
                        ? "bg-green-500"
                        : (m.CurrentQuantityGrams / m.InitialQuantityGrams) *
                              100 >
                            20
                          ? "bg-yellow-500"
                          : "bg-red-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        (m.CurrentQuantityGrams / m.InitialQuantityGrams) * 100,
                        100,
                      )}%`,
                    }}
                  ></div>
                </div>
              )}

              <div className="mt-auto flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(m.MaterialID);
                  }}
                  className="text-red-600 hover:bg-red-50 p-1 rounded"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {materials.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              No materials found.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingMaterial ? "Edit Material" : "Add Material"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Material Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Type
                </label>
                <select
                  required
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                  value={formData.MaterialTypeID}
                  onChange={(e) => {
                    const mt = materialTypes.find(
                      (t) => t.MaterialTypeID === Number(e.target.value),
                    );
                    const isSupport =
                      mt?.TypeName.toLowerCase().includes("sup");
                    const isCleaning =
                      mt?.TypeName.toLowerCase().includes("clean");
                    setFormData({
                      ...formData,
                      MaterialTypeID: e.target.value,
                      MaterialName: mt?.TypeName || "",
                      Type: isCleaning
                        ? "Cleaning"
                        : isSupport
                          ? "Support"
                          : "Model",
                    });
                  }}
                >
                  <option value="">-- Select Material Type --</option>
                  {materialTypes.map((mt) => (
                    <option key={mt.MaterialTypeID} value={mt.MaterialTypeID}>
                      {mt.TypeName}
                      {mt.Description ? ` — ${mt.Description}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lot Number - primary differentiator */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lot Number
                </label>
                <input
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                  value={formData.LotNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, LotNumber: e.target.value })
                  }
                  placeholder="e.g. LOT-2024-001"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.Type}
                    onChange={(e) =>
                      setFormData({ ...formData, Type: e.target.value })
                    }
                  >
                    <option value="Model">Model</option>
                    <option value="Support">Support</option>
                    <option value="Cleaning">Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.Color}
                    onChange={(e) =>
                      setFormData({ ...formData, Color: e.target.value })
                    }
                    placeholder="e.g. White"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Grams
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.InitialQuantityGrams}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        InitialQuantityGrams: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Grams
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.CurrentQuantityGrams}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        CurrentQuantityGrams: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Threshold (g)
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                  value={formData.ReorderThresholdGrams}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ReorderThresholdGrams: e.target.value,
                    })
                  }
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                  value={formData.ExpirationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, ExpirationDate: e.target.value })
                  }
                />
              </div>

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

              <div className="flex justify-end gap-2 pt-2 mt-2">
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
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
