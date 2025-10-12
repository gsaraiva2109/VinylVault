# 🤝 Guia de Contribuição

Obrigado por considerar contribuir com o Vinyl Recognizer Dashboard! Este documento fornece diretrizes para contribuir com o projeto.

## 📋 Código de Conduta

Este projeto segue padrões de conduta profissional. Seja respeitoso e construtivo em todas as interações.

## 🚀 Como Contribuir

### 1. Fork e Clone

```bash
# Fork o repositório no GitHub
# Clone seu fork
git clone https://github.com/SEU_USERNAME/vinylRecognizerDashboard.git
cd vinylRecognizerDashboard

# Adicione o repositório original como upstream
git remote add upstream https://github.com/gsaraiva2109/vinylRecognizerDashboard.git
```

### 2. Crie uma Branch

```bash
# Atualize a main
git checkout main
git pull upstream main

# Crie uma branch para sua feature/fix
git checkout -b feature/minha-nova-feature
# ou
git checkout -b fix/corrigir-bug
```

### 3. Desenvolva

- Escreva código limpo e bem comentado
- Siga os padrões de código TypeScript/React
- Mantenha a consistência com o estilo existente
- Teste suas alterações localmente

### 4. Commit

Use mensagens de commit claras e descritivas:

```bash
# Exemplos de boas mensagens
git commit -m "feat: adiciona filtro de busca por gênero"
git commit -m "fix: corrige erro no upload de imagem"
git commit -m "docs: atualiza README com novas instruções"
git commit -m "style: aplica formatação Inter em componentes"
git commit -m "refactor: reorganiza estrutura de serviços"
```

**Padrões de Commit:**
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação, CSS
- `refactor:` - Refatoração de código
- `test:` - Adicionar/corrigir testes
- `chore:` - Manutenção/tarefas

### 5. Push e Pull Request

```bash
# Push para seu fork
git push origin feature/minha-nova-feature

# Abra um Pull Request no GitHub
```

**Checklist do Pull Request:**
- [ ] Código testado localmente
- [ ] Sem erros no console
- [ ] Documentação atualizada (se necessário)
- [ ] Commits bem formatados
- [ ] Branch atualizada com a main

## 🎨 Padrões de Código

### TypeScript
- Use tipagem estrita
- Evite `any` quando possível
- Prefira interfaces para objetos
- Use arrow functions

### React
- Componentes funcionais com hooks
- Use TypeScript para props
- Mantenha componentes pequenos e reutilizáveis
- CSS em arquivos separados

### CSS
- Use nomes de classes descritivos
- Mantenha consistência com o tema
- Suporte dark mode quando aplicável
- Mobile-first design

### Nomenclatura
- **Arquivos**: PascalCase para componentes (`VinylList.tsx`)
- **Variáveis**: camelCase (`vinylList`)
- **Constantes**: UPPER_SNAKE_CASE (`CACHE_DURATION`)
- **CSS Classes**: kebab-case (`vinyl-card`)

## 🧪 Testes

Antes de enviar um PR:

```bash
# Frontend
cd frontend
npm run dev  # Verifique se compila

# Backend
cd backend
npm run dev  # Verifique se inicia

# Teste manual
# 1. Adicionar vinil
# 2. Buscar no Spotify
# 3. Deletar vinil
# 4. Restaurar da lixeira
# 5. Alternar tema escuro/claro
```

## 📝 Documentação

Se adicionar nova funcionalidade:
- Atualize o README.md
- Adicione comentários no código
- Documente endpoints de API
- Atualize exemplos de uso

## 🐛 Reportar Bugs

Ao reportar bugs, inclua:
- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots (se aplicável)
- Ambiente (OS, navegador, versões)

## 💡 Sugestões de Features

Para sugerir novas funcionalidades:
- Abra uma Issue descrevendo a feature
- Explique o caso de uso
- Discuta antes de implementar

## ⚡ Áreas para Contribuir

### Features Sugeridas
- [ ] Sistema de backup automático
- [ ] Exportação de coleção (CSV, JSON)
- [ ] Busca avançada com filtros
- [ ] Estatísticas da coleção
- [ ] Wishlist de vinis
- [ ] Integração com outras APIs musicais
- [ ] Sistema de tags customizadas
- [ ] Gráficos e visualizações

### Melhorias
- [ ] Otimização de performance
- [ ] Testes unitários
- [ ] Testes E2E
- [ ] Acessibilidade (a11y)
- [ ] Internacionalização (i18n)
- [ ] PWA support
- [ ] Docker setup

### Documentação
- [ ] Tutorial em vídeo
- [ ] Guia de troubleshooting expandido
- [ ] Exemplos de uso avançado
- [ ] Comentários de código

## 📧 Contato

Dúvidas? Entre em contato:
- Abra uma Issue
- GitHub: [@gsaraiva2109](https://github.com/gsaraiva2109)

## 📜 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença MIT do projeto.

---

**Obrigado por contribuir! 🎉**
