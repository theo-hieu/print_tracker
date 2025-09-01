import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Jobs(){
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [models, setModels] = useState([]);
  const [printers, setPrinters] = useState([]);

  const [form, setForm] = useState({
    JobName:'', UserID:'', ModelID:'', PrinterID:'', PrintDate:'', Status:'queued', Notes:''
  });

  async function load(){
    setJobs((await api.get('/jobs')).data);
    setUsers((await api.get('/users')).data);
    setModels((await api.get('/models')).data);
    setPrinters((await api.get('/printers')).data);
  }
  useEffect(()=>{ load(); }, []);

  function change(e){ setForm({ ...form, [e.target.name]: e.target.value }); }

  async function add(){
    if(!form.JobName || !form.UserID || !form.ModelID || !form.PrintDate) return alert('Fill required fields');
    const res = await api.post('/jobs', {
      JobName: form.JobName,
      UserID: Number(form.UserID),
      ModelID: Number(form.ModelID),
      PrinterID: form.PrinterID ? Number(form.PrinterID) : null,
      PrintDate: form.PrintDate,
      Status: form.Status,
      Notes: form.Notes
    });

    const jobID = res.data.JobID;
    const { data: modelMaterials } = await api.get(`/models/${form.ModelID}/materials`);
    await Promise.all(
      modelMaterials.map(m => 
        api.post('/jobs/job-materials', {
          JobID: jobID,
          MaterialID: m.MaterialID,
          MaterialUsageGrams: m.FilamentUsageGrams
        })
      )
    );
    setForm({ JobName:'', UserID:'', ModelID:'', PrinterID:'', PrintDate:'', Status:'queued', Notes:'' });
    load();
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Jobs</h2>
      <div className="p-4 border rounded bg-white flex flex-wrap gap-2 mb-4">
        <input className="border p-2 rounded" name="JobName" placeholder="Job name" value={form.JobName} onChange={change} />
        <select className="border p-2 rounded" name="UserID" value={form.UserID} onChange={change}>
          <option value="">Select user</option>
          {users.map(u => <option key={u.UserID} value={u.UserID}>{u.UserName}</option>)}
        </select>
        <select className="border p-2 rounded" name="ModelID" value={form.ModelID} onChange={change}>
          <option value="">Select model</option>
          {models.map(m => <option key={m.ModelID} value={m.ModelID}>{m.ModelName}</option>)}
        </select>
        <select className="border p-2 rounded" name="PrinterID" value={form.PrinterID} onChange={change}>
          <option value="">Select printer (optional)</option>
          {printers.map(p => <option key={p.PrinterID} value={p.PrinterID}>{p.PrinterName}</option>)}
        </select>
        <input className="border p-2 rounded" type="date" name="PrintDate" value={form.PrintDate} onChange={change} />
        <select className="border p-2 rounded" name="Status" value={form.Status} onChange={change}>
          <option value="queued">queued</option>
          <option value="printing">printing</option>
          <option value="completed">completed</option>
          <option value="failed">failed</option>
        </select>
        <input className="border p-2 rounded flex-1" name="Notes" placeholder="Notes" value={form.Notes} onChange={change} />
        <button className="bg-red-800 text-white px-4 py-2 rounded" onClick={add}>Create Job</button>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2">Job</th><th>User</th><th>Model</th><th>Printer</th><th>Date</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(j => (
            <tr key={j.JobID} className="border-b">
              <td className="py-2">{j.JobName}</td>
              <td>{j.UserName}</td>
              <td>{j.ModelName}</td>
              <td>{j.PrinterName}</td>
              <td>{j.PrintDate}</td>
              <td>{j.Status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
