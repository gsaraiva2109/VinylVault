import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ManualVinylEntry from './components/ManualVinylEntry';
import VinylList from './components/VinylList';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <h1>Vinyl Collection Manager</h1>
          <ul>
            <li><Link to="/">Coleção</Link></li>
            <li><Link to="/add">Adicionar Vinil</Link></li>
          </ul>
        </nav>

          <Routes>
            <Route path="/" element={<VinylList />} />
            <Route path="/add" element={<ManualVinylEntry />} />
          </Routes>
      </div>
    </Router>
  );
}

export default App;
