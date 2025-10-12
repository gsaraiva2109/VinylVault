const ManualVinylEntry: React.FC = () => {
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<AlbumSearchResult[]>([]);
const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
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

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        await addVinyl({
            ...formData,
            year: parseInt(formData.year) || undefined,
            coverImage: selectedAlbum?.coverImage,
        });
        alert('Vinil adicionado com sucesso!');
        resetForm();
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
);