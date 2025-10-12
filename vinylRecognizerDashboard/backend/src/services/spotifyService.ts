import axios from 'axios';

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiresAt: number;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  external_urls: { spotify: string };
  images: { url: string }[];
  release_date: string;
}

class SpotifyService {
  private static instance: SpotifyService;
  private clientId: string;
  private clientSecret: string;
  private token: SpotifyToken | null = null;
  private cache: Map<string, { album: SpotifyAlbum; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  private constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('Credenciais do Spotify não configuradas. Adicione SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no .env');
    }
  }

  static getInstance(): SpotifyService {
    if (!SpotifyService.instance) {
      SpotifyService.instance = new SpotifyService();
    }
    return SpotifyService.instance;
  }

  private isTokenValid(): boolean {
    return this.token !== null && Date.now() < this.token.expiresAt;
  }

  async getAccessToken(): Promise<string> {
    if (this.isTokenValid() && this.token) {
      return this.token.access_token;
    }

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(
              `${this.clientId}:${this.clientSecret}`
            ).toString('base64')
          }
        }
      );

      this.token = {
        ...response.data,
        expiresAt: Date.now() + (response.data.expires_in * 1000)
      };

      if (!this.token) {
        throw new Error('Token não gerado');
      }

      return this.token.access_token;
    } catch (error) {
      console.error('Erro ao obter token do Spotify:', error);
      throw new Error('Falha na autenticação com Spotify');
    }
  }

  private generateCacheKey(artist: string, album: string): string {
    return `${artist.toLowerCase().trim()}:${album.toLowerCase().trim()}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  async searchAlbum(artist: string, album: string): Promise<SpotifyAlbum | null> {
    const cacheKey = this.generateCacheKey(artist, album);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log(`Cache hit para: ${artist} - ${album}`);
      return cached.album;
    }

    try {
      const token = await this.getAccessToken();
      const query = `artist:${artist} album:${album}`;

      const response = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: query,
          type: 'album',
          limit: 5
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const albums = response.data.albums?.items || [];

      if (albums.length === 0) {
        return null;
      }

      // Encontrar o melhor match
      const bestMatch = albums.find((a: SpotifyAlbum) => {
        const albumNameMatch = a.name.toLowerCase().includes(album.toLowerCase());
        const artistNameMatch = a.artists.some(art => 
          art.name.toLowerCase().includes(artist.toLowerCase())
        );
        return albumNameMatch && artistNameMatch;
      }) || albums[0];

      // Salvar no cache
      this.cache.set(cacheKey, {
        album: bestMatch,
        timestamp: Date.now()
      });

      console.log(`Álbum encontrado e cacheado: ${bestMatch.name}`);
      return bestMatch;
    } catch (error) {
      console.error('Erro ao buscar álbum no Spotify:', error);
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
    console.log('Cache do Spotify limpo');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default SpotifyService.getInstance();
