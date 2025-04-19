import { useEffect, useState } from 'react';
import axios from 'axios';

function Home() {
  const [jobs, setJobs] = useState([]);
  const [newJob, setNewJob] = useState({ name: '', userID: '', modelID: '', date: '' });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = () => {
    axios.get('http://localhost:5000/api/jobs')
      .then(res => setJobs(res.data))
      .catch(err => console.error('Error fetching jobs:', err));
  };

  const handleAddJob = (e) => {
    e.preventDefault();
    const { name, userID, modelID, date } = newJob;
    if (!name || !userID || !modelID || !date) return;

    axios.post('http://localhost:5000/api/jobs', {
      jobName: name,
      userID,
      modelID,
      printDate: date
    })
      .then(() => {
        setNewJob({ name: '', userID: '', modelID: '', date: '' });
        fetchJobs();
      })
      .catch(err => console.error('Error adding job:', err));
  };

  return (
    <div>
      <h1>Job History</h1>
      <ul>
        {jobs.map(job => (
          <li key={job.JobID}>
            {job.JobName} - User {job.UserID} - Model {job.ModelID} - {job.PrintDate}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAddJob} style={{ marginTop: '2rem' }}>
        <h2>Add New Job</h2>
        <input
          placeholder="Job name"
          value={newJob.name}
          onChange={e => setNewJob({ ...newJob, name: e.target.value })}
        />
        <input
          placeholder="User ID"
          value={newJob.userID}
          onChange={e => setNewJob({ ...newJob, userID: e.target.value })}
        />
        <input
          placeholder="Model ID"
          value={newJob.modelID}
          onChange={e => setNewJob({ ...newJob, modelID: e.target.value })}
        />
        <input
          type="date"
          value={newJob.date}
          onChange={e => setNewJob({ ...newJob, date: e.target.value })}
        />
        <button type="submit">Add Job</button>
      </form>
    </div>
  );
}

export default Home;
