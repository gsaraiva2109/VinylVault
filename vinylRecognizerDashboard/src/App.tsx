import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ManualVinylEntry from '../frontend/src/components/ManualVinylEntry';
import VinylList from '../frontend/src/components/VinylList';
import DeletedVinyls from '../frontend/src/components/DeletedVinyls';
import DarkModeToggle from './components/DarkModeToggle';
import ScrollToTop from './components/ScrollToTop';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import './App.css';

function App() {
  const { toasts, removeToast } = useToast();

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="navbar-left">
            <h1>Vinyl Collection Manager</h1>
            <ul>
              <li><Link to="/">Coleção</Link></li>
              <li><Link to="/deleted">Lixeira</Link></li>
            </ul>
          </div>
          <div className="navbar-right">
            <DarkModeToggle />
          </div>
        </nav>

        <div className="container">
          <Routes>
            <Route path="/" element={<VinylList />} />
            <Route path="/add" element={<ManualVinylEntry />} />
            <Route path="/deleted" element={<DeletedVinyls />} />
          </Routes>
        </div>

        <ScrollToTop />
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      </div>
    </Router>
  );
}

export default App;