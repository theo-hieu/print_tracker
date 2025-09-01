import React, { useEffect, useState } from 'react';
import api from '../api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

export default function Analytics(){
  const [mat, setMat] = useState([]);
  const [jobsOverTime, setJobsOverTime] = useState([]);

  useEffect(()=>{
    (async () => {
      setMat((await api.get('/analytics/material-usage')).data);
      setJobsOverTime((await api.get('/analytics/jobs-over-time')).data);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Analytics</h2>

      <div className="p-4 border rounded bg-white">
        <h3 className="font-semibold mb-2">Material Usage (total grams)</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={mat}>
              <XAxis dataKey="MaterialName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalUsage" name="Grams" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-4 border rounded bg-white">
        <h3 className="font-semibold mb-2">Jobs Over Time (by month)</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={jobsOverTime}>
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="jobCount" name="Jobs" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
