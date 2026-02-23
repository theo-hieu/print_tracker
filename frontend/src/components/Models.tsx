import { useEffect, useState, useMemo } from "react";
import api from "../api";
import UploadForm from "./UploadForm";
import {
  Edit2,
  Trash2,
  X,
  FileText,
  Download,
  Upload,
  Search,
  Users,
} from "lucide-react";

interface Client {
  ClientID: number;
  Name: string;
}

interface MaterialType {
  MaterialTypeID: number;
  TypeName: string;
}

interface ModelMaterial {
  MaterialTypeID: number;
  FilamentUsageGrams: number;
  MaterialType: MaterialType;
}

interface Model {
  ModelID: number;
  ModelName: string;
  EstimatedCost?: number;
  EstimatedPrintTime?: string;
  EstimatedFilamentUsage?: number;
  STLFilePath?: string;
  ClientID?: number | null;
  Client?: Client | null;
  ModelMaterials?: ModelMaterial[];
}

export default function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Form State
  const [formData, setFormData] = useState({
    ModelName: "",
    EstimatedCost: "",
    EstimatedPrintTime: "",
    EstimatedFilamentUsage: "",
    ClientID: "",
    Materials: [] as { MaterialTypeID: string; FilamentUsageGrams: string }[],
  });

  async function load() {
    try {
      const [modelRes, clientRes, matTypeRes] = await Promise.all([
        api.get("/models"),
        api.get("/clients"),
        api.get("/material-types"),
      ]);
      setModels(modelRes.data);
      setClients(clientRes.data);
      setMaterialTypes(matTypeRes.data);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  }

  useEffect(() => {
    load();
  }, []);
  const openEditModal = (model: Model) => {
    setEditingModel(model);
    setFormData({
      ModelName: model.ModelName,
      EstimatedCost: model.EstimatedCost?.toString() || "",
      EstimatedPrintTime: model.EstimatedPrintTime || "",
      EstimatedFilamentUsage: model.EstimatedFilamentUsage?.toString() || "",
      ClientID: model.ClientID?.toString() || "",
      Materials:
        model.ModelMaterials?.map((m) => ({
          MaterialTypeID: m.MaterialTypeID.toString(),
          FilamentUsageGrams: m.FilamentUsageGrams.toString(),
        })) || [],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingModel(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;

    try {
      await api.put(`/models/${editingModel.ModelID}`, {
        ...formData,
        EstimatedCost: parseFloat(formData.EstimatedCost) || 0,
        EstimatedFilamentUsage:
          parseFloat(formData.EstimatedFilamentUsage) || 0,
        ClientID: formData.ClientID ? parseInt(formData.ClientID) : null,
      });
      closeModal();
      load();
    } catch (err) {
      console.error("Failed to update model", err);
      alert("Failed to update model");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    try {
      await api.delete(`/models/${id}`);
      load();
    } catch (err) {
      console.error("Failed to delete model", err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/models/export/csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `models-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export models");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
      await api.post("/models/import/csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Models imported successfully");
      load();
    } catch (err) {
      console.error("Import failed", err);
      alert("Failed to import models");
    }
    // Reset input
    e.target.value = "";
  };

  const filteredModels = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return models.filter(
      (m) =>
        m.ModelName.toLowerCase().includes(lowerQuery) ||
        m.Client?.Name.toLowerCase().includes(lowerQuery),
    );
  }, [models, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText /> Models
        </h2>

        <div className="flex-1 w-full max-w-md">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search models or clients..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExport}
            className="border border-gray-300 px-3 py-2 rounded text-sm flex items-center gap-1 hover:bg-gray-50 transition-colors bg-white shadow-sm"
          >
            <Download size={14} /> Export
          </button>
          <label className="border border-gray-300 px-3 py-2 rounded text-sm flex items-center gap-1 hover:bg-gray-50 transition-colors cursor-pointer bg-white shadow-sm">
            <Upload size={14} /> Import
            <input
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleImport}
            />
          </label>
        </div>
      </div>

      <UploadForm onUpload={load} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map((m) => (
          <div
            key={m.ModelID}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col"
          >
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3
                  className="font-bold text-lg text-gray-900 truncate flex-1"
                  title={m.ModelName}
                >
                  {m.ModelName}
                </h3>
                {m.Client && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium shrink-0 max-w-[40%] truncate">
                    <Users size={12} />
                    {m.Client.Name}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Est. Cost:</span>
                  <span className="font-medium text-gray-800">
                    ${Number(m.EstimatedCost ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Print Time:</span>
                  <span className="font-medium text-gray-800">
                    {m.EstimatedPrintTime || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Filament:</span>
                  <span className="font-medium text-gray-800">
                    {Number(m.EstimatedFilamentUsage ?? 0).toFixed(1)} g
                  </span>
                </div>
              </div>

              {m.STLFilePath && (
                <div className="mt-4 pt-3 border-t flex justify-between items-center">
                  <a
                    className="text-red-700 hover:text-red-900 text-sm font-medium flex items-center gap-1"
                    href={api.defaults.baseURL + m.STLFilePath}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download STL
                  </a>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => openEditModal(m)}
                className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                title="Edit Model"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(m.ModelID)}
                className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                title="Delete Model"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            No models found
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Edit Model</h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Name
                </label>
                <input
                  required
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                  value={formData.ModelName}
                  onChange={(e) =>
                    setFormData({ ...formData, ModelName: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Est. Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.EstimatedCost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        EstimatedCost: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filament (g)
                  </label>
                  <input
                    type="number"
                    step="1"
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                    value={formData.EstimatedFilamentUsage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        EstimatedFilamentUsage: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Est. Print Time
                </label>
                <input
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                  value={formData.EstimatedPrintTime}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      EstimatedPrintTime: e.target.value,
                    })
                  }
                  placeholder="e.g. 4h 30m"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                  value={formData.ClientID}
                  onChange={(e) =>
                    setFormData({ ...formData, ClientID: e.target.value })
                  }
                >
                  <option value="">No Client (Internal)</option>
                  {clients.map((c) => (
                    <option key={c.ClientID} value={c.ClientID}>
                      {c.Name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Materials Used
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        Materials: [
                          ...formData.Materials,
                          { MaterialTypeID: "", FilamentUsageGrams: "" },
                        ],
                      })
                    }
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Material
                  </button>
                </div>
                {formData.Materials.map((mat, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <select
                      className="flex-1 border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      value={mat.MaterialTypeID}
                      onChange={(e) => {
                        const newMats = [...formData.Materials];
                        newMats[index].MaterialTypeID = e.target.value;
                        setFormData({ ...formData, Materials: newMats });
                      }}
                      required
                    >
                      <option value="">Select Material...</option>
                      {materialTypes.map((mt) => (
                        <option
                          key={mt.MaterialTypeID}
                          value={mt.MaterialTypeID}
                        >
                          {mt.TypeName}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Grams"
                      className="w-24 border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      value={mat.FilamentUsageGrams}
                      onChange={(e) => {
                        const newMats = [...formData.Materials];
                        newMats[index].FilamentUsageGrams = e.target.value;
                        setFormData({ ...formData, Materials: newMats });
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newMats = formData.Materials.filter(
                          (_, i) => i !== index,
                        );
                        setFormData({ ...formData, Materials: newMats });
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {formData.Materials.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No materials added.
                  </p>
                )}
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
