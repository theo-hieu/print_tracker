// pages/ViewMaterials.js
import { useEffect, useState } from 'react';
import axios from 'axios';

function ViewMaterials() {
  const [materials, setMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = () => {
    axios.get('http://localhost:5000/api/materials')
      .then(res => setMaterials(res.data))
      .catch(err => console.error('Error fetching materials:', err));
  };

  const handleAddMaterial = (e) => {
    e.preventDefault();
    if (!newMaterial.trim()) return;

    axios.post('http://localhost:5000/api/materials', { materialName: newMaterial })
      .then(() => {
        setNewMaterial('');
        fetchMaterials();
      })
      .catch(err => console.error('Error adding material:', err));
  };

  return (
    <div>
      <h1>Materials</h1>
      <ul>
        {materials.map(mat => (
          <li key={mat.MaterialID}>{mat.MaterialName}</li>
        ))}
      </ul>
      <form onSubmit={handleAddMaterial}>
        <input
          type="text"
          value={newMaterial}
          onChange={(e) => setNewMaterial(e.target.value)}
          placeholder="Enter material name"
        />
        <button type="submit">Add Material</button>
      </form>
    </div>
  );
}

export default ViewMaterials;
