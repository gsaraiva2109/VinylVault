import { Router } from 'express';
import { VinylController } from '../controllers/VinylController';

const router = Router();
const vinylController = new VinylController();

router.get('/vinyls', vinylController.getAll);
router.get('/vinyls/deleted', vinylController.getDeleted);
router.get('/vinyls/:id', vinylController.getById);
router.post('/vinyls', vinylController.create);
router.put('/vinyls/:id', vinylController.update);
router.delete('/vinyls/:id', vinylController.delete);
router.post('/vinyls/:id/restore', vinylController.restore);
router.delete('/vinyls/:id/permanent', vinylController.permanentDelete);
router.post('/vinyls/cleanup', vinylController.cleanupOldDeleted);

export default router;
