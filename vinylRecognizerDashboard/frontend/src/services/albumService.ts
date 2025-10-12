import axios from 'axios';

const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN || '';
const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';

export interface AlbumSearchResult {
  id: string;
  title: string;
  artist: string;
  year?: number;
  label?: string;
  coverImage?: string;
  genre?: string[];
}

export const searchAlbum = async (query: string): Promise<AlbumSearchResult[]> => {
  try {
    const response = await axios.get('https://api.discogs.com/database/search', {
      params: {
        q: query,
        type: 'release',
        token: DISCOGS_TOKEN,
      },
    });

    return response.data.results.map((item: any) => ({
      id: item.id,
      title: item.title,
      artist: item.title.split(' - ')[0] || '',
      year: item.year,
      label: item.label?.[0] || '',
      coverImage: item.cover_image,
      genre: item.genre || [],
    }));
  } catch (error) {
    console.error('Erro ao buscar álbum:', error);
    return [];
  }
};

export const getAlbumDetails = async (discogsId: string) => {
  try {
    const response = await axios.get(`https://api.discogs.com/releases/${discogsId}`, {
      params: { token: DISCOGS_TOKEN },
    });

    return {
      title: response.data.title,
      artist: response.data.artists?.[0]?.name || '',
      year: response.data.year,
      label: response.data.labels?.[0]?.name || '',
      coverImage: response.data.images?.[0]?.uri || '',
      genre: response.data.genres || [],
      styles: response.data.styles || [],
      tracklist: response.data.tracklist || [],
    };
  } catch (error) {
    console.error('Erro ao buscar detalhes do álbum:', error);
    throw error;
  }
};
