import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.js';
import ViewMaterials from './pages/ViewMaterials.js';
import ViewModels from './pages/ViewModels.js';

import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <aside className="sidebar">
          <h2>Print Tracker</h2>
          <nav>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/materials">View Materials</Link></li>
              <li><Link to="/models">Manage Models</Link></li>
            </ul>
          </nav>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/materials" element={<ViewMaterials />} />
            <Route path="/models" element={<ViewModels />} />
            <Route path="*" element={<div>Page not found</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
