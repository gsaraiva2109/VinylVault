import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { deleteVinyl } from '../services/api';
import DeleteButton from '../../../src/components/DeleteButton';
import AddButton from '../../../src/components/AddButton';
import SpotifyButton from './SpotifyButton';
import './VinylList.css';

interface Vinyl {
  id: number;
  title: string;
  artist: string;
  year?: number;
  label?: string;
  genre?: string;
  condition: string;
  coverImage?: string;
  notes?: string;
  spotifyUrl?: string;
}

const VinylList: React.FC = () => {
  const navigate = useNavigate();
  const [vinyls, setVinyls] = useState<Vinyl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [vinylToDelete, setVinylToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchVinyls();
  }, []);

  const fetchVinyls = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/vinyls');
      setVinyls(response.data);
    } catch (error) {
      console.error('Erro ao carregar vinis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setVinylToDelete(id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (vinylToDelete === null) return;
    
    try {
      await deleteVinyl(vinylToDelete);
      setVinyls(vinyls.filter(v => v.id !== vinylToDelete));
      setShowModal(false);
      setVinylToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar vinil:', error);
    }
  };

  const cancelDelete = () => {
    setShowModal(false);
    setVinylToDelete(null);
  };

  const handleAddOnClickProps = () => {
    navigate('/add');
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="vinyl-list">
      <div className="vinyl-list-header">
        <h2>Minha Coleção ({vinyls.length} vinis)</h2>
        <AddButton 
          onClick={handleAddOnClickProps}
          text="Adicionar"
        />
      </div>
      <div className="vinyl-grid">
        {vinyls.map((vinyl) => (
          <div key={vinyl.id} className="vinyl-card">
            {vinyl.coverImage && (
              <img src={vinyl.coverImage} alt={vinyl.title} />
            )}
            <div className="vinyl-info">
              <h3>{vinyl.title}</h3>
              <p className="artist">{vinyl.artist}</p>
              {vinyl.year && <p className="year">{vinyl.year}</p>}
              {vinyl.label && <p className="label">{vinyl.label}</p>}
              <p className="condition">Condição: {vinyl.condition}</p>
              {vinyl.genre && <p className="genre">{vinyl.genre}</p>}
              {vinyl.notes && <p className="notes">{vinyl.notes}</p>}
              <div className="vinyl-actions">
                <SpotifyButton 
                  artist={vinyl.artist} 
                  album={vinyl.title}
                  spotifyUrl={vinyl.spotifyUrl}
                />
                <DeleteButton onClick={() => handleDelete(vinyl.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Confirmação */}
      {showModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn"
              onClick={cancelDelete}
            >
              <svg className="modal-close-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
              <span className="sr-only">Fechar modal</span>
            </button>
            <div className="modal-body">
              <svg className="modal-warning-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
              <h3 className="modal-title">Tem certeza que deseja mover este vinil para a lixeira?</h3>
              <div className="modal-buttons">
                <button 
                  type="button" 
                  className="modal-btn modal-btn-confirm"
                  onClick={confirmDelete}
                >
                  Sim, tenho certeza
                </button>
                <button 
                  type="button" 
                  className="modal-btn modal-btn-cancel"
                  onClick={cancelDelete}
                >
                  Não, cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VinylList;
