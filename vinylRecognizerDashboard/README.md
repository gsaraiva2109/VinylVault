# Vinyl Collection Manager

Sistema completo para gerenciamento de coleção de vinis com reconhecimento manual e integração com Discogs.

## 🚀 Início Rápido

### Pré-requisitos
- Node.js v18+
- MongoDB
- npm ou yarn

### Instalação e Execução

**Opção 1: Comando único (NPM)**
# 🎵 Vinyl Recognizer Dashboard

Sistema completo de gerenciamento de coleção de vinis com reconhecimento manual, integração com Discogs e Spotify, sistema de lixeira e notificações toast.

![React](https://img.shields.io/badge/React-19.1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![MariaDB](https://img.shields.io/badge/MariaDB-11.x-orange)

## ✨ Funcionalidades

### 🎨 Interface
- ✅ Design moderno e responsivo com tema escuro/claro
- ✅ Fonte Inter aplicada em todo o sistema
- ✅ Animações suaves e transições elegantes
- ✅ Sistema de notificações toast (sucesso, erro, aviso, info)
- ✅ Botão de scroll-to-top com fade animado
- ✅ Modais de confirmação temáticos

### 📀 Gerenciamento de Vinis
- ✅ Adicionar vinis manualmente com preview em tempo real
- ✅ Busca de álbuns no Discogs com preenchimento automático
- ✅ Upload de imagem ou URL da capa
- ✅ Campos completos: título, artista, ano, gravadora, gênero, condição, notas
- ✅ Visualização em grid responsivo
- ✅ Sistema de soft delete (lixeira)
- ✅ Exclusão permanente com confirmação modal
- ✅ Restauração de vinis da lixeira
- ✅ Auto-exclusão após 30 dias na lixeira

### 🎧 Integração Spotify
- ✅ Auto-sync ao adicionar vinis (busca automática no Spotify)
- ✅ Botão Spotify em cada card
- ✅ Cache de 24 horas para otimizar requisições
- ✅ Abertura direta do álbum no Spotify
- ✅ Notificações toast quando álbum não encontrado
- ✅ Armazenamento persistente de URLs do Spotify

### 🗑️ Sistema de Lixeira
- ✅ Soft delete com período de 30 dias
- ✅ Contagem regressiva de dias restantes
- ✅ Restauração com um clique
- ✅ Exclusão permanente com modal de confirmação
- ✅ Auto-limpeza de itens expirados

## 🚀 Início Rápido

### Pré-requisitos
- Node.js v18+
- MariaDB 11.x
- npm ou yarn
- Conta no [Spotify for Developers](https://developer.spotify.com/)
- Conta no [Discogs](https://www.discogs.com/settings/developers)

### 1. Clonar o Repositório
```bash
git clone https://github.com/gsaraiva2109/vinylRecognizerDashboard.git
cd vinylRecognizerDashboard
```

### 2. Configurar Banco de Dados
```bash
# Instalar MariaDB (se necessário)
sudo apt install mariadb-server  # Ubuntu/Debian
brew install mariadb             # macOS

# Criar banco de dados
sudo mysql -u root -p
CREATE DATABASE vinyl_collection;
CREATE USER 'vinyl_user'@'localhost' IDENTIFIED BY 'sua_senha';
GRANT ALL PRIVILEGES ON vinyl_collection.* TO 'vinyl_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Configurar Variáveis de Ambiente

**Backend** (`backend/.env`):
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vinyl_collection
DB_USER=vinyl_user
DB_PASSWORD=sua_senha

# Server
PORT=5000
FRONTEND_URL=http://localhost:5173

# Spotify API
SPOTIFY_CLIENT_ID=seu_client_id_spotify
SPOTIFY_CLIENT_SECRET=seu_client_secret_spotify

# Discogs API
DISCOGS_TOKEN=seu_token_discogs
```

**Como obter credenciais:**
- **Spotify**: [Dashboard](https://developer.spotify.com/dashboard) → Create App → Copie Client ID e Client Secret
- **Discogs**: [Settings](https://www.discogs.com/settings/developers) → Generate Token

### 4. Executar Migration do Spotify
```bash
# Adicionar coluna spotifyUrl no banco
./RUN_MIGRATION.sh
```

### 5. Instalar e Executar

**Opção 1: Script Automático (Recomendado)**
```bash
chmod +x START.sh
./START.sh
```

**Opção 2: Manual**
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm install
npm run dev
```

**Opção 3: Comando NPM**
```bash
npm run install:all  # Instala tudo
npm run dev          # Roda tudo
```

### 6. Acessar Aplicação
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/health

## 📁 Estrutura do Projeto

```
vinylRecognizerDashboard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts          # Configuração Sequelize
│   │   ├── controllers/
│   │   │   ├── VinylController.ts   # CRUD de vinis
│   │   │   └── SpotifyController.ts # Busca Spotify
│   │   ├── models/
│   │   │   └── Vinyl.ts             # Modelo Sequelize
│   │   ├── routes/
│   │   │   ├── vinylRoutes.ts       # Rotas de vinis
│   │   │   └── spotifyRoutes.ts     # Rotas do Spotify
│   │   ├── services/
│   │   │   └── spotifyService.ts    # Lógica do Spotify
│   │   └── server.ts                # Servidor Express
│   ├── migrations/
│   │   └── add_spotify_url.sql      # Migration Spotify
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── VinylList.tsx        # Lista de vinis
│       │   ├── ManualVinylEntry.tsx # Adicionar vinil
│       │   ├── DeletedVinyls.tsx    # Lixeira
│       │   ├── SpotifyButton.tsx    # Botão Spotify
│       │   ├── Toast.tsx            # Notificação toast
│       │   ├── ToastContainer.tsx   # Container de toasts
│       │   ├── ScrollToTop.tsx      # Botão scroll
│       │   ├── DeleteButton.tsx     # Botão deletar
│       │   └── AddButton.tsx        # Botão adicionar
│       ├── hooks/
│       │   └── useToast.ts          # Hook de toasts
│       └── services/
│           ├── api.ts               # Cliente Axios
│           ├── albumService.ts      # Serviço Discogs
│           └── spotifyApi.ts        # Serviço Spotify
│
├── src/                             # Componentes compartilhados
│   ├── components/
│   ├── hooks/
│   └── App.tsx
│
├── .gitignore
├── README.md
├── START.sh                         # Script de início
├── STOP.sh                          # Script de parada
└── RUN_MIGRATION.sh                 # Script de migration
```

## 🎨 Tecnologias Utilizadas

### Frontend
- **React** 19.1.1 - Biblioteca UI
- **TypeScript** 5.x - Tipagem estática
- **Vite** 7.1.14 - Build tool moderna
- **React Router** 7.9.4 - Navegação SPA
- **Axios** - Cliente HTTP
- **CSS Modules** - Estilização com escopo

### Backend
- **Node.js** 18+ - Runtime JavaScript
- **Express** - Framework web
- **TypeScript** - Tipagem estática
- **Sequelize** - ORM para MySQL/MariaDB
- **Axios** - Requisições HTTP
- **ts-node-dev** - Hot reload em desenvolvimento

### Banco de Dados
- **MariaDB** 11.x - Database relacional
- **Soft Delete** - Exclusão lógica com timestamps

### APIs Externas
- **Spotify Web API** - Integração musical
- **Discogs API** - Metadados de álbuns

## 🔧 Scripts Disponíveis

### Raiz do Projeto
```bash
npm run install:all    # Instala todas as dependências
npm run dev           # Roda backend + frontend
npm run build         # Build para produção
```

### Backend
```bash
npm run dev           # Desenvolvimento com hot reload
npm run build         # Compilar TypeScript
npm start             # Produção
```

### Frontend
```bash
npm run dev           # Servidor de desenvolvimento
npm run build         # Build para produção
npm run preview       # Preview da build
```

## 🎯 API Endpoints

### Vinis
- `GET /api/vinyls` - Listar todos os vinis ativos
- `GET /api/vinyls/:id` - Buscar vinil por ID
- `POST /api/vinyls` - Adicionar novo vinil
- `PUT /api/vinyls/:id` - Atualizar vinil
- `DELETE /api/vinyls/:id` - Soft delete (mover para lixeira)
- `GET /api/vinyls/deleted` - Listar vinis deletados
- `PUT /api/vinyls/:id/restore` - Restaurar da lixeira
- `DELETE /api/vinyls/:id/permanent` - Exclusão permanente

### Spotify
- `POST /api/spotify/search` - Buscar álbum no Spotify
- `GET /api/spotify/cache/stats` - Estatísticas do cache
- `DELETE /api/spotify/cache` - Limpar cache

### Sistema
- `GET /health` - Health check do servidor

## 🎨 Recursos Visuais

### Tema Escuro/Claro
O sistema detecta automaticamente a preferência do usuário e aplica o tema correspondente.

### Animações
- Fade-in/fade-out no botão de scroll
- Slide-in nos toasts
- Hover effects nos cards e botões
- Transições suaves entre estados

### Responsividade
- Grid adaptativo para diferentes tamanhos de tela
- Layout mobile-first
- Breakpoints otimizados

## 🔐 Segurança

- ✅ Variáveis de ambiente para credenciais sensíveis
- ✅ CORS configurado para o frontend
- ✅ Validação de dados no backend
- ✅ Soft delete para recuperação de dados
- ✅ Confirmações modais para ações destrutivas

## 📝 Notas de Desenvolvimento

### Sistema de Cache do Spotify
- Cache de 24 horas para resultados de busca
- Cache permanente de URLs salvas no banco
- Estatísticas de cache disponíveis via API

### Sistema de Lixeira
- Vinis deletados permanecem 30 dias na lixeira
- Auto-exclusão após expiração
- Contagem regressiva visual nos cards

### Auto-Sync Spotify
- Busca automática ao adicionar novo vinil
- Notificações toast durante o processo
- Fallback gracioso se Spotify não encontrar

## 🐛 Troubleshooting

### Erro de Conexão com Banco
```bash
# Verificar se MariaDB está rodando
sudo systemctl status mariadb

# Reiniciar MariaDB
sudo systemctl restart mariadb
```

### Erro no Spotify
- Verifique se as credenciais em `backend/.env` estão corretas
- Confirme que o app está ativo no Spotify Dashboard
- Verifique logs do backend para detalhes

### Erro no Discogs
- Verifique o token em `backend/.env`
- Respeite o rate limit da API (60 req/min)

## 📄 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

## 👨‍💻 Autor

**Gabriel Saraiva**
- GitHub: [@gsaraiva2109](https://github.com/gsaraiva2109)

## 🙏 Agradecimentos

- [Discogs API](https://www.discogs.com/developers)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no GitHub!

**Opção 2: Script Shell**
```bash
# Dar permissão
chmod +x START.sh

# Executar
./START.sh
```

**Opção 3: Manual**
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm start
```

## 📁 Estrutura do Projeto

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
