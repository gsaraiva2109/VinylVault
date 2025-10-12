import React, { useEffect, useState } from 'react';
import { getDeletedVinyls, restoreVinyl, permanentDeleteVinyl } from '../services/api';
import './DeletedVinyls.css';

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
  deletedAt: Date;
}

const DeletedVinyls: React.FC = () => {
  const [vinyls, setVinyls] = useState<Vinyl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [vinylToDelete, setVinylToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchDeletedVinyls();
  }, []);

  const fetchDeletedVinyls = async () => {
    try {
      const data = await getDeletedVinyls();
      setVinyls(data);
    } catch (error) {
      console.error('Erro ao carregar vinis deletados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    if (window.confirm('Deseja restaurar este vinil?')) {
      try {
        await restoreVinyl(id);
        setVinyls(vinyls.filter(v => v.id !== id));
        alert('Vinil restaurado com sucesso!');
      } catch (error) {
        console.error('Erro ao restaurar vinil:', error);
        alert('Erro ao restaurar vinil');
      }
    }
  };

  const handlePermanentDelete = async (id: number) => {
    setVinylToDelete(id);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (vinylToDelete === null) return;
    
    try {
      await permanentDeleteVinyl(vinylToDelete);
      setVinyls(vinyls.filter(v => v.id !== vinylToDelete));
      setShowModal(false);
      setVinylToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar permanentemente vinil:', error);
      alert('Erro ao deletar permanentemente vinil');
    }
  };

  const cancelDelete = () => {
    setShowModal(false);
    setVinylToDelete(null);
  };

  const getDaysRemaining = (deletedAt?: Date) => {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deleted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays);
  };

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <div className="deleted-vinyls">
      <div className="deleted-header">
        <h2>🗑️ Lixeira ({vinyls.length} itens)</h2>
        <p className="info-text">Os itens permanecem na lixeira por 30 dias antes de serem deletados permanentemente</p>
      </div>
      
      {vinyls.length === 0 ? (
        <div className="empty-trash">
          <span className="empty-icon">🎉</span>
          <p>A lixeira está vazia!</p>
        </div>
      ) : (
        <div className="vinyl-grid">
          {vinyls.map((vinyl) => (
            <div key={vinyl.id} className="vinyl-card deleted">
              <div className="days-remaining">
                {getDaysRemaining(vinyl.deletedAt)} dias restantes
              </div>
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
                
                <div className="action-buttons">
                  <button 
                    className="restore-btn" 
                    onClick={() => handleRestore(vinyl.id)}
                  >
                    Restaurar
                  </button>
                  <button 
                    className="permanent-delete-btn" 
                    onClick={() => handlePermanentDelete(vinyl.id)}
                  >
                    Deletar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <svg 
              onClick={cancelDelete}
              xmlns="http://www.w3.org/2000/svg"
              className="modal-close-icon"
              viewBox="0 0 320.591 320.591"
            >
              <path
                d="M30.391 318.583a30.37 30.37 0 0 1-21.56-7.288c-11.774-11.844-11.774-30.973 0-42.817L266.643 10.665c12.246-11.459 31.462-10.822 42.921 1.424 10.362 11.074 10.966 28.095 1.414 39.875L51.647 311.295a30.366 30.366 0 0 1-21.256 7.288z"
              />
              <path
                d="M287.9 318.583a30.37 30.37 0 0 1-21.257-8.806L8.83 51.963C-2.078 39.225-.595 20.055 12.143 9.146c11.369-9.736 28.136-9.736 39.504 0l259.331 257.813c12.243 11.462 12.876 30.679 1.414 42.922-.456.487-.927.958-1.414 1.414a30.368 30.368 0 0 1-23.078 7.288z"
              />
            </svg>

            <div className="modal-body">
              <svg xmlns="http://www.w3.org/2000/svg" className="modal-icon" viewBox="0 0 24 24">
                <path
                  d="M19 7a1 1 0 0 0-1 1v11.191A1.92 1.92 0 0 1 15.99 21H8.01A1.92 1.92 0 0 1 6 19.191V8a1 1 0 0 0-2 0v11.191A3.918 3.918 0 0 0 8.01 23h7.98A3.918 3.918 0 0 0 20 19.191V8a1 1 0 0 0-1-1Zm1-3h-4V2a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2H4a1 1 0 0 0 0 2h16a1 1 0 0 0 0-2ZM10 4V3h4v1Z"
                />
                <path 
                  d="M11 17v-7a1 1 0 0 0-2 0v7a1 1 0 0 0 2 0Zm4 0v-7a1 1 0 0 0-2 0v7a1 1 0 0 0 2 0Z"
                />
              </svg>
              <div className="modal-text">
                <h4 className="modal-title">Tem certeza que deseja deletar permanentemente?</h4>
                <p className="modal-description">
                  Esta ação é <strong>IRREVERSÍVEL</strong>. O vinil será deletado permanentemente e não poderá ser recuperado.
                </p>
              </div>
            </div>

            <div className="modal-buttons">
              <button 
                type="button"
                onClick={confirmDelete}
                className="modal-btn modal-btn-delete"
              >
                Deletar Permanentemente
              </button>
              <button 
                type="button"
                onClick={cancelDelete}
                className="modal-btn modal-btn-cancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedVinyls;
