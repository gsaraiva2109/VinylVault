import api from './api';

export interface SpotifyAlbumResponse {
  id: string;
  name: string;
  artist: string;
  url: string;
  image?: string;
  releaseDate: string;
}

export const searchSpotifyAlbum = async (
  artist: string,
  album: string
): Promise<SpotifyAlbumResponse | null> => {
  try {
    const response = await api.post('/spotify/search', { artist, album });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getCacheStats = async () => {
  const response = await api.get('/spotify/cache/stats');
  return response.data;
};

export const clearCache = async () => {
  const response = await api.delete('/spotify/cache');
  return response.data;
};
