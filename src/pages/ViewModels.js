import { useEffect, useState } from 'react';
import axios from 'axios';

function ViewModels() {
  const [models, setModels] = useState([]);
  const [newModel, setNewModel] = useState({ name: '', cost: '', file: '' });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = () => {
    axios.get('http://localhost:5000/api/models')
      .then(res => setModels(res.data))
      .catch(err => console.error('Error fetching models:', err));
  };

  const handleAddModel = (e) => {
    e.preventDefault();
    const { name, cost, file } = newModel;
    if (!name.trim()) return;

    axios.post('http://localhost:5000/api/models', {
      modelName: name,
      estimatedCost: cost || null,
      stlFilePath: file || null
    })
      .then(() => {
        setNewModel({ name: '', cost: '', file: '' });
        fetchModels();
      })
      .catch(err => console.error('Error adding model:', err));
  };

  return (
    <div>
      <h1>Models</h1>
      <ul>
        {models.map(model => (
          <li key={model.ModelID}>
            {model.ModelName} - ${model.EstimatedCost} - {model.STLFilePath}
          </li>
        ))}
      </ul>
      <form onSubmit={handleAddModel}>
        <input
          placeholder="Model name"
          value={newModel.name}
          onChange={e => setNewModel({ ...newModel, name: e.target.value })}
        />
        <input
          placeholder="Estimated cost"
          value={newModel.cost}
          onChange={e => setNewModel({ ...newModel, cost: e.target.value })}
        />
        <input
          placeholder="STL file path"
          value={newModel.file}
          onChange={e => setNewModel({ ...newModel, file: e.target.value })}
        />
        <button type="submit">Add Model</button>
      </form>
    </div>
  );
}

export default ViewModels;
