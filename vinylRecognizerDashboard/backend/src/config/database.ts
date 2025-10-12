import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vinyl_collection',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectModule: require('mysql2'),
});

export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ MariaDB conectado com sucesso');
    
    // Sincronizar modelos (criar tabelas se não existirem)
    await sequelize.sync({ alter: true });
    console.log('✓ Tabelas sincronizadas');
  } catch (error) {
    console.error('✗ Erro ao conectar MariaDB:', error);
    process.exit(1);
  }
};

export default sequelize;
