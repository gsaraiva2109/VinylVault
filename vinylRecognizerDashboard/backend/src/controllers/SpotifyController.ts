import { Request, Response } from 'express';
import spotifyService from '../services/spotifyService';

class SpotifyController {
  async searchAlbum(req: Request, res: Response): Promise<void> {
    try {
      const { artist, album } = req.body;

      if (!artist || !album) {
        res.status(400).json({
          error: 'Artista e álbum são obrigatórios'
        });
        return;
      }

      const spotifyAlbum = await spotifyService.searchAlbum(artist, album);

      if (!spotifyAlbum) {
        res.status(404).json({
          error: 'Álbum não encontrado no Spotify'
        });
        return;
      }

      res.status(200).json({
        id: spotifyAlbum.id,
        name: spotifyAlbum.name,
        artist: spotifyAlbum.artists[0]?.name,
        url: spotifyAlbum.external_urls.spotify,
        image: spotifyAlbum.images[0]?.url,
        releaseDate: spotifyAlbum.release_date
      });
    } catch (error) {
      console.error('Erro ao buscar álbum no Spotify:', error);
      res.status(500).json({
        error: 'Erro interno ao buscar no Spotify'
      });
    }
  }

  async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = spotifyService.getCacheStats();
      res.status(200).json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas do cache:', error);
      res.status(500).json({
        error: 'Erro ao obter estatísticas'
      });
    }
  }

  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      spotifyService.clearCache();
      res.status(200).json({
        message: 'Cache limpo com sucesso'
      });
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      res.status(500).json({
        error: 'Erro ao limpar cache'
      });
    }
  }
}

export default new SpotifyController();
