import React, { useState, useEffect } from "react";
import api from "../api";

interface MaterialType {
  MaterialTypeID: number;
  TypeName: string;
  Description?: string;
}

interface FormMaterial {
  MaterialTypeID: number;
  FilamentUsageGrams: number;
}

interface UploadFormProps {
  onUpload?: () => void;
}

interface FormDataState {
  ModelName: string;
  EstimatedCost: string;
  EstimatedPrintTime: string;
  EstimatedFilamentUsage: string;
  STLFileLink: string;
  Materials: FormMaterial[];
}

export default function UploadForm({ onUpload }: UploadFormProps) {
  const [form, setForm] = useState<FormDataState>({
    ModelName: "",
    EstimatedCost: "",
    EstimatedPrintTime: "",
    EstimatedFilamentUsage: "",
    STLFileLink: "",
    Materials: [],
  });
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

  useEffect(() => {
    api.get("/material-types").then((res) => setMaterialTypes(res.data));
  }, []);

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const res = await api.post("/models", {
      ModelName: form.ModelName,
      EstimatedCost: form.EstimatedCost,
      EstimatedPrintTime: form.EstimatedPrintTime,
      EstimatedFilamentUsage: form.EstimatedFilamentUsage,
      STLFileLink: form.STLFileLink || null,
    });
    const modelID = res.data.ModelID;

    if (form.Materials && form.Materials.length > 0) {
      await Promise.all(
        form.Materials.map((m) =>
          api.post("/models/model-materials", {
            ModelID: modelID,
            MaterialTypeID: m.MaterialTypeID,
            FilamentUsageGrams: m.FilamentUsageGrams,
          }),
        ),
      );
    }

    setForm({
      ModelName: "",
      EstimatedCost: "",
      EstimatedPrintTime: "",
      EstimatedFilamentUsage: "",
      STLFileLink: "",
      Materials: [],
    });
    onUpload && onUpload();
  }

  const handleMaterialChange = (typeId: number, val: number) => {
    const newMaterials = form.Materials.filter(
      (m) => m.MaterialTypeID !== typeId,
    );
    if (val > 0)
      newMaterials.push({ MaterialTypeID: typeId, FilamentUsageGrams: val });
    setForm({ ...form, Materials: newMaterials });
  };

  return (
    <form
      onSubmit={submit}
      className="p-6 border rounded-lg bg-white shadow-sm flex flex-col gap-4"
    >
      <h3 className="font-semibold text-lg text-gray-800 border-b pb-2">
        Upload New Model
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Model Name
          </label>
          <input
            name="ModelName"
            className="border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="e.g. Calibration Cube"
            value={form.ModelName}
            onChange={change}
            required
          />
        </div>

        <div className="flex flex-col gap-1 relative">
          <label className="text-sm font-medium text-gray-700">
            Estimated Cost ($)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              name="EstimatedCost"
              type="number"
              step="0.01"
              className="border p-2 pl-7 rounded w-full focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="0.00"
              value={form.EstimatedCost}
              onChange={change}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Est. Print Time
          </label>
          <input
            name="EstimatedPrintTime"
            className="border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="e.g. 6h 30m"
            value={form.EstimatedPrintTime}
            onChange={change}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Est. Filament (g)
          </label>
          <input
            name="EstimatedFilamentUsage"
            type="number"
            step="1"
            className="border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="0.00"
            value={form.EstimatedFilamentUsage}
            onChange={change}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          STL File Link (Google Drive)
        </label>
        <input
          name="STLFileLink"
          className="border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
          placeholder="https://drive.google.com/..."
          value={form.STLFileLink}
          onChange={change}
        />
      </div>

      <div className="mt-2 border-t pt-4">
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Material Types Used (optional)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded bg-gray-50">
          {materialTypes.map((mt) => {
            const existing = form.Materials.find(
              (m) => m.MaterialTypeID === mt.MaterialTypeID,
            );
            return (
              <div
                key={mt.MaterialTypeID}
                className="flex items-center gap-2 text-sm"
              >
                <span className="w-1/2 truncate" title={mt.TypeName}>
                  {mt.TypeName}:
                </span>
                <input
                  type="number"
                  step="1"
                  placeholder="g"
                  className="border p-1 rounded w-20 text-right focus:ring-2 focus:ring-red-500 outline-none"
                  value={existing?.FilamentUsageGrams || ""}
                  onChange={(e) =>
                    handleMaterialChange(
                      mt.MaterialTypeID,
                      parseFloat(e.target.value) || 0,
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <button className="bg-red-800 hover:bg-red-900 text-white font-medium px-4 py-2 rounded transition-colors duration-200 mt-2">
        Upload & Save Model
      </button>
    </form>
  );
}
