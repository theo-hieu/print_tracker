import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Printers(){
  const [printers, setPrinters] = useState([]);
  const [name, setName] = useState('');

  async function load(){ setPrinters((await api.get('/printers')).data); }
  useEffect(()=>{ load(); }, []);

  async function add(){
    if(!name) return;
    await api.post('/printers', { PrinterName: name });
    setName(''); load();
  }
  async function del(id){
    if(!confirm('Delete printer?')) return;
    await api.delete('/printers/'+id); load();
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Printers</h2>
      <div className="mb-3">
        <input className="border p-2 rounded mr-2" placeholder="Printer name" value={name} onChange={e=>setName(e.target.value)} />
        <button className="bg-red-800 text-white px-3 py-2 rounded" onClick={add}>Add</button>
      </div>
      <ul className="space-y-2">
        {printers.map(p => (
          <li key={p.PrinterID} className="p-2 border rounded flex justify-between">
            <span>{p.PrinterName}</span>
            <button className="text-red-600" onClick={()=>del(p.PrinterID)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
