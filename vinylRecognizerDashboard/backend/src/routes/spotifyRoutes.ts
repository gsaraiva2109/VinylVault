import { Router } from 'express';
import spotifyController from '../controllers/SpotifyController';

const router = Router();

router.post('/search', (req, res) => spotifyController.searchAlbum(req, res));
router.get('/cache/stats', (req, res) => spotifyController.getCacheStats(req, res));
router.delete('/cache', (req, res) => spotifyController.clearCache(req, res));

export default router;
