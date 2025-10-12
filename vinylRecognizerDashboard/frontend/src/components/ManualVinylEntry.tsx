import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAlbum, getAlbumDetails, type AlbumSearchResult } from '../services/albumService';
import { addVinyl } from '../services/api';
import { searchSpotifyAlbum } from '../services/spotifyApi';
import { useToast } from '../../../src/hooks/useToast';
import './ManualVinylEntry.css';

const ManualVinylEntry: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showInfo, showWarning } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AlbumSearchResult[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    year: '',
    label: '',
    genre: '',
    condition: 'VG+',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const results = await searchAlbum(searchQuery);
    setSearchResults(results);
    setLoading(false);
  };

  const handleSelectAlbum = async (result: AlbumSearchResult) => {
    setLoading(true);
    try {
      const details = await getAlbumDetails(result.id);
      setSelectedAlbum(details);
      setCoverImageUrl(details.coverImage || '');
      setImagePreview(details.coverImage || '');
      setFormData({
        title: details.title,
        artist: details.artist,
        year: details.year?.toString() || '',
        label: details.label,
        genre: details.genre.join(', '),
        condition: 'VG+',
        notes: '',
      });
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setCoverImageUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setCoverImageUrl(url);
    setImagePreview(url);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!coverImageUrl && !imagePreview) {
      alert('Por favor, adicione uma imagem da capa do vinil');
      return;
    }
    
    setLoading(true);
    try {
      // Auto-sync com Spotify
      let spotifyAlbumUrl = '';
      if (formData.artist && formData.title) {
        showInfo('Buscando álbum no Spotify...');
        try {
          const spotifyResult = await searchSpotifyAlbum(formData.artist, formData.title);
          if (spotifyResult) {
            spotifyAlbumUrl = spotifyResult.url;
            setSpotifyUrl(spotifyResult.url);
            showSuccess('Álbum encontrado no Spotify!');
          } else {
            showWarning('Álbum não encontrado no Spotify');
          }
        } catch (error) {
          console.warn('Erro ao buscar no Spotify, continuando sem link:', error);
        }
      }

      await addVinyl({
        ...formData,
        year: parseInt(formData.year) || undefined,
        coverImage: coverImageUrl || imagePreview,
        spotifyUrl: spotifyAlbumUrl || undefined,
      });
      showSuccess('Vinil adicionado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Erro ao adicionar vinil:', error);
      alert('Erro ao adicionar vinil');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedAlbum(null);
    setCoverImageUrl('');
    setImageFile(null);
    setImagePreview('');
    setFormData({
      title: '',
      artist: '',
      year: '',
      label: '',
      genre: '',
      condition: 'VG+',
      notes: '',
    });
  };

  return (
    <div className="manual-vinyl-entry">
      <h2>Adicionar Vinil Manualmente</h2>

      <div className="entry-container">
        <div className="form-section">
          <div className="search-section">
            <input
              type="text"
              placeholder="Pesquisar álbum (artista - título)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={loading}>
              {loading ? 'Pesquisando...' : 'Pesquisar'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Resultados da Pesquisa</h3>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="search-result-item"
                  onClick={() => handleSelectAlbum(result)}
                >
                  {result.coverImage && <img src={result.coverImage} alt={result.title} />}
                  <div>
                    <h4>{result.title}</h4>
                    <p>{result.year}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="vinyl-form">
            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Artista *</label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Imagem da Capa *</label>
              <div className="image-input-group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  id="file-upload"
                  className="file-input"
                />
                <label htmlFor="file-upload" className="file-label">
                  📁 Escolher Arquivo
                </label>
                <span className="or-separator">OU</span>
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Cole a URL da imagem"
                  className="url-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Ano</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Gravadora</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Gênero</label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Condição</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              >
                <option value="M">Mint (M)</option>
                <option value="NM">Near Mint (NM)</option>
                <option value="VG+">Very Good Plus (VG+)</option>
                <option value="VG">Very Good (VG)</option>
                <option value="G">Good (G)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Adicionando...' : 'Adicionar Vinil'}
              </button>
              <button type="button" onClick={resetForm}>
                Limpar
              </button>
            </div>
          </form>
        </div>

        <div className="preview-section">
          <h3>Preview do Card</h3>
          <div className="vinyl-card-preview">
            <div className="preview-image-container">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" />
              ) : (
                <div className="no-image-placeholder">
                  <span>📀</span>
                  <p>Nenhuma imagem selecionada</p>
                </div>
              )}
            </div>
            <div className="vinyl-info-preview">
              <h3>{formData.title || 'Título do Vinil'}</h3>
              <p className="artist">{formData.artist || 'Nome do Artista'}</p>
              {formData.year && <p className="year">{formData.year}</p>}
              {formData.label && <p className="label">{formData.label}</p>}
              <p className="condition">Condição: {formData.condition}</p>
              {formData.genre && <p className="genre">{formData.genre}</p>}
              {formData.notes && <p className="notes">{formData.notes}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualVinylEntry;
