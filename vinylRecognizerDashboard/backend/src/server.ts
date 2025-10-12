import dotenv from 'dotenv';

// Carregar variáveis de ambiente PRIMEIRO
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import vinylRoutes from './routes/vinylRoutes';
import spotifyRoutes from './routes/spotifyRoutes';

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
connectDatabase();

// Routes
app.use('/api', vinylRoutes);
app.use('/api/spotify', spotifyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'MariaDB'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`✓ Servidor rodando na porta ${PORT}`);
  console.log(`✓ API disponível em http://localhost:${PORT}/api`);
  console.log(`✓ Health check em http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
});
