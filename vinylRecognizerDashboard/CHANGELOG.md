# 📝 Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-12

### ✨ Adicionado
- Sistema completo de gerenciamento de coleção de vinis
- Integração com Discogs API para busca de álbuns
- Integração com Spotify API com cache de 24 horas
- Auto-sync do Spotify ao adicionar novos vinis
- Sistema de soft delete com lixeira de 30 dias
- Sistema de notificações toast (sucesso, erro, aviso, info)
- Botão de scroll-to-top com animações fade
- Tema escuro/claro automático
- Fonte Inter aplicada em todo o sistema
- Modais de confirmação para ações destrutivas
- Preview em tempo real ao adicionar vinis
- Upload de imagem ou URL para capas
- Botão Spotify em cada card de vinil
- Sistema de restauração de vinis deletados
- Contagem regressiva de dias na lixeira
- Cache permanente de URLs do Spotify no banco
- Migration SQL para adicionar campo spotifyUrl
- Scripts automatizados (START.sh, STOP.sh, RUN_MIGRATION.sh)
- Documentação completa no README
- Guia de contribuição (CONTRIBUTING.md)
- Licença MIT

### 🎨 Interface
- Design moderno e responsivo
- Grid adaptativo para diferentes tamanhos de tela
- Animações suaves em botões e cards
- Transições elegantes entre estados
- Fade-in/fade-out no scroll-to-top
- Slide-in nas notificações toast
- Hover effects customizados
- Modal overlay com blur de fundo

### 🔧 Backend
- API RESTful com Express e TypeScript
- ORM Sequelize com MariaDB
- Soft delete com campos isDeleted e deletedAt
- Auto-limpeza de itens expirados na lixeira
- Cache de tokens do Spotify
- Cache de buscas do Spotify (24h)
- Validação de dados
- CORS configurado
- Health check endpoint
- Tratamento de erros robusto

### 📱 Frontend
- React 19.1.1 com TypeScript
- Vite como build tool
- React Router para navegação
- Custom hooks (useToast)
- Componentes reutilizáveis
- Serviços de API organizados
- CSS com suporte a dark mode
- Mobile-first design

### 🗄️ Banco de Dados
- Modelo Vinyl com campos completos
- Soft delete com período de 30 dias
- Campo spotifyUrl para cache permanente
- Timestamps automáticos (createdAt, updatedAt, deletedAt)
- Índices otimizados

### 🔐 Segurança
- Variáveis de ambiente para credenciais
- CORS restrito ao frontend
- Validação de entrada de dados
- Sanitização de URLs
- Confirmações modais para exclusões

### 📚 Documentação
- README completo com instruções detalhadas
- Guia de troubleshooting
- Documentação de API endpoints
- Exemplos de uso
- Arquivo .env.example
- Guia de contribuição
- Changelog estruturado

### 🚀 Performance
- Cache de 24h para buscas do Spotify
- Cache permanente de URLs no banco
- Lazy loading de componentes
- Otimização de re-renders
- Debounce em buscas

---

## [Futuro] - Planejado

### 🎯 Features Planejadas
- Sistema de backup automático
- Exportação de coleção (CSV, JSON, PDF)
- Busca avançada com múltiplos filtros
- Estatísticas e gráficos da coleção
- Wishlist de vinis desejados
- Sistema de tags customizadas
- Integração com Last.fm
- Integração com Apple Music
- Galeria de imagens expandida
- Histórico de edições

### 🔧 Melhorias Planejadas
- Testes unitários (Jest)
- Testes E2E (Cypress)
- PWA support
- Docker setup
- CI/CD com GitHub Actions
- Internacionalização (i18n)
- Acessibilidade (a11y) completa
- Performance monitoring
- Error tracking (Sentry)

---

## Formato de Versão

- **MAJOR**: Mudanças incompatíveis na API
- **MINOR**: Novas funcionalidades compatíveis
- **PATCH**: Correções de bugs compatíveis

## Categorias de Mudanças

- **Adicionado**: Novas funcionalidades
- **Alterado**: Mudanças em funcionalidades existentes
- **Depreciado**: Funcionalidades que serão removidas
- **Removido**: Funcionalidades removidas
- **Corrigido**: Correções de bugs
- **Segurança**: Correções de vulnerabilidades
