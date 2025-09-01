import React, { useState, useEffect } from 'react';
import api from '../api';

export default function UploadForm({ onUpload }){
    const [form, setForm] = useState({
    ModelName: '',
    EstimatedCost: '',
    EstimatedPrintTime: '',
    EstimatedFilamentUsage: '',
    Materials: []
  });
  const [file, setFile] = useState(null);
  const [allMaterials, setAllMaterials] = useState([]);

  useEffect(() => {
    api.get('/materials').then(res => setAllMaterials(res.data));
  }, []);

  function change(e){ setForm({ ...form, [e.target.name]: e.target.value }); }

  async function submit(e){
    e.preventDefault();

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k !== 'Materials') fd.append(k, v);
    });
    if (file) fd.append('stlFile', file);

    const res = await api.post('/models', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const modelID = res.data.ModelID;

    if (form.Materials && form.Materials.length > 0) {
      await Promise.all(
        form.Materials.map(m =>
          api.post('/models/model-materials', {
            ModelID: modelID,
            MaterialID: m.MaterialID,
            FilamentUsageGrams: m.FilamentUsageGrams
          })
        )
      );
    }

    setForm({ ModelName: '', EstimatedCost: '', EstimatedPrintTime: '', EstimatedFilamentUsage: '', Materials: [] });
    setFile(null);
    onUpload && onUpload();
  }

  return (
    <form onSubmit={submit} className="p-4 border rounded bg-white flex flex-col gap-2">
      <input
        name="ModelName"
        className="border p-2 rounded"
        placeholder="Model name"
        value={form.ModelName}
        onChange={change}
      />
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
        <input
          name="EstimatedCost"
          type="number"
          step="0.01"
          className="border p-2 rounded pl-6 w-full"
          placeholder="Estimated cost"
          value={form.EstimatedCost}
          onChange={change}
        />
      </div>
      <input
        name="EstimatedPrintTime"
        className="border p-2 rounded"
        placeholder="Estimated print time (e.g. 6h 30m)"
        value={form.EstimatedPrintTime}
        onChange={change}
      />
      <input
        name="EstimatedFilamentUsage"
        type="number"
        step="0.01"
        className="border p-2 rounded"
        placeholder="Estimated filament (g)"
        value={form.EstimatedFilamentUsage}
        onChange={change}
      />
      <input type="file" accept=".stl" onChange={e => setFile(e.target.files?.[0] || null)} />

      {/* Material selection */}
      <div className="mt-2">
        <strong>Materials:</strong>
        {allMaterials.map(mat => {
          const existing = form.Materials.find(m => m.MaterialID === mat.MaterialID);
          return (
            <div key={mat.MaterialID} className="flex items-center gap-2 my-1">
              <span className="w-32">{mat.MaterialName} (g):</span>
              <input
                type="number"
                step="0.01"
                className="border p-1 rounded w-20"
                value={existing?.FilamentUsageGrams || ''}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  const newMaterials = form.Materials.filter(m => m.MaterialID !== mat.MaterialID);
                  if (val > 0) newMaterials.push({ MaterialID: mat.MaterialID, FilamentUsageGrams: val });
                  setForm({ ...form, Materials: newMaterials });
                }}
              />
            </div>
          );
        })}
      </div>

      <button className="bg-red-800 text-white px-4 py-2 rounded mt-2">Upload & Save</button>
    </form>
  );
}
