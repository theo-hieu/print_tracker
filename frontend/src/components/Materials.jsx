import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Materials(){
  const [materials, setMaterials] = useState([]);
  const [name, setName] = useState('');

  async function load(){ setMaterials((await api.get('/materials')).data); }
  useEffect(()=>{ load(); }, []);

  async function add(){
    if(!name) return;
    await api.post('/materials', { MaterialName: name });
    setName(''); load();
  }
  async function del(id){
    if(!confirm('Delete material?')) return;
    await api.delete('/materials/'+id); load();
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Materials</h2>
      <div className="mb-3">
        <input className="border p-2 rounded mr-2" placeholder="Material name" value={name} onChange={e=>setName(e.target.value)} />
        <button className="bg-red-800 text-white px-3 py-2 rounded" onClick={add}>Add</button>
      </div>
      <ul className="space-y-2">
        {materials.map(m => (
          <li key={m.MaterialID} className="p-2 border rounded flex justify-between">
            <span>{m.MaterialName}</span>
            <button className="text-red-600" onClick={()=>del(m.MaterialID)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
