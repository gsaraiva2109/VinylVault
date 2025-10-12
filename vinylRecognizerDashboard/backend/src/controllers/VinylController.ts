import { Request, Response } from 'express';
import Vinyl from '../models/Vinyl';

export class VinylController {
  async getAll(req: Request, res: Response) {
    try {
      const vinyls = await Vinyl.findAll({
        where: { isDeleted: false },
        order: [['createdAt', 'DESC']],
      });
      res.json(vinyls);
    } catch (error) {
      console.error('Erro ao buscar vinis:', error);
      res.status(500).json({ error: 'Erro ao buscar vinis' });
    }
  }

  async getDeleted(req: Request, res: Response) {
    try {
      const vinyls = await Vinyl.findAll({
        where: { isDeleted: true },
        order: [['deletedAt', 'DESC']],
      });
      res.json(vinyls);
    } catch (error) {
      console.error('Erro ao buscar vinis deletados:', error);
      res.status(500).json({ error: 'Erro ao buscar vinis deletados' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const vinyl = await Vinyl.findByPk(req.params.id);
      if (!vinyl) {
        return res.status(404).json({ error: 'Vinil não encontrado' });
      }
      res.json(vinyl);
    } catch (error) {
      console.error('Erro ao buscar vinil:', error);
      res.status(500).json({ error: 'Erro ao buscar vinil' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const vinyl = await Vinyl.create(req.body);
      res.status(201).json(vinyl);
    } catch (error) {
      console.error('Erro ao criar vinil:', error);
      res.status(400).json({ error: 'Erro ao criar vinil' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const vinyl = await Vinyl.findByPk(req.params.id);
      if (!vinyl) {
        return res.status(404).json({ error: 'Vinil não encontrado' });
      }
      await vinyl.update(req.body);
      res.json(vinyl);
    } catch (error) {
      console.error('Erro ao atualizar vinil:', error);
      res.status(400).json({ error: 'Erro ao atualizar vinil' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const vinyl = await Vinyl.findByPk(req.params.id);
      if (!vinyl) {
        return res.status(404).json({ error: 'Vinil não encontrado' });
      }
      // Soft delete: marca como deletado ao invés de apagar
      await vinyl.update({
        isDeleted: true,
        deletedAt: new Date(),
      });
      res.json({ message: 'Vinil movido para lixeira' });
    } catch (error) {
      console.error('Erro ao deletar vinil:', error);
      res.status(500).json({ error: 'Erro ao deletar vinil' });
    }
  }

  async restore(req: Request, res: Response) {
    try {
      const vinyl = await Vinyl.findByPk(req.params.id);
      if (!vinyl) {
        return res.status(404).json({ error: 'Vinil não encontrado' });
      }
      // Restaura o vinil
      await vinyl.update({
        isDeleted: false,
        deletedAt: undefined,
      });
      res.json({ message: 'Vinil restaurado com sucesso', vinyl });
    } catch (error) {
      console.error('Erro ao restaurar vinil:', error);
      res.status(500).json({ error: 'Erro ao restaurar vinil' });
    }
  }

  async permanentDelete(req: Request, res: Response) {
    try {
      const vinyl = await Vinyl.findByPk(req.params.id);
      if (!vinyl) {
        return res.status(404).json({ error: 'Vinil não encontrado' });
      }
      await vinyl.destroy();
      res.json({ message: 'Vinil deletado permanentemente' });
    } catch (error) {
      console.error('Erro ao deletar permanentemente vinil:', error);
      res.status(500).json({ error: 'Erro ao deletar permanentemente vinil' });
    }
  }

  async cleanupOldDeleted(req: Request, res: Response) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deleted = await Vinyl.destroy({
        where: {
          isDeleted: true,
          deletedAt: {
            $lte: thirtyDaysAgo,
          },
        },
      });

      res.json({ message: `${deleted} vinis deletados permanentemente` });
    } catch (error) {
      console.error('Erro ao limpar vinis antigos:', error);
      res.status(500).json({ error: 'Erro ao limpar vinis antigos' });
    }
  }
}
