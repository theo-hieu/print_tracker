import React, { useEffect, useState } from 'react';
import api from '../api';
import UploadForm from './UploadForm';

export default function Models(){
  const [models, setModels] = useState([]);

  async function load(){ setModels((await api.get('/models')).data); }
  useEffect(()=>{ load(); }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Models</h2>
      <UploadForm onUpload={load} />
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        {models.map(m => (
          <div key={m.ModelID} className="p-4 border rounded bg-white">
            <h3 className="font-semibold">{m.ModelName}</h3>
            <div className="text-sm mt-1">Cost: ${m.EstimatedCost ?? 0}</div>
            <div className="text-sm">Print time: {m.EstimatedPrintTime || '-'}</div>
            <div className="text-sm">Filament: {m.EstimatedFilamentUsage ?? 0} g</div>
            {m.STLFilePath && <a className="text-red-800 underline" href={m.STLFilePath} target="_blank">Download STL</a>}
          </div>
        ))}
      </div>
    </div>
  );
}
