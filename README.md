# 🎬 Critix Vault

<div align="center">

**Transforme sua biblioteca local de filmes e séries em uma experiência visual de streaming premium**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?logo=tauri)](https://tauri.app/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange?logo=rust)](https://www.rust-lang.org/)

</div>

---

## 📖 Sobre

**Critix Vault** é uma aplicação desktop moderna que transforma suas pastas de filmes e séries em uma biblioteca visual organizada, semelhante aos serviços de streaming como Netflix e Prime Video.

Utilizando a poderosa API do [Critix](https://github.com/Walaff/critix_api) integrada ao **TMDB**, o app identifica automaticamente suas mídias, busca metadados completos (capas, sinopses, avaliações) e apresenta tudo em uma interface elegante e responsiva.

### ✨ Características Principais

- 🎯 **Reconhecimento Automático** - Escaneie pastas e identifique filmes/séries automaticamente
- 🎨 **Interface Premium** - Design moderno inspirado em serviços de streaming
- 💾 **Armazenamento Persistente** - Dados salvos localmente em formato JSON (Rust backend)
- 🖼️ **Cache de Imagens** - Funcione offline com imagens em cache
- 📺 **Suporte Completo** - Filmes, séries com temporadas/episódios
- 🔍 **Busca e Filtros** - Encontre rapidamente o que procura
- ✏️ **Edição Manual** - Corrija matches incorretos facilmente
- ⚙️ **Configurações Flexíveis** - Gerencie dados, cache e exportações

---

## 🚀 Como Usar

### Pré-requisitos

- **Node.js** 20+ ou **Bun**
- **Rust** 1.70+
- **Git**

### Instalação

1. **Clone o repositório**

   ```bash
   git clone https://github.com/seu-usuario/critix_vault_desktop.git
   cd critix_vault_desktop
   ```

2. **Instale as dependências**

   ```bash
   bun install
   # ou
   npm install
   ```

3. **Configure a API**

   Crie um arquivo `.env.local` na raiz do projeto:

   ```env
   NEXT_PUBLIC_CRITIX_API_URL=http://localhost:8080
   ```

4. **Execute o app em modo dev**
   ```bash
   bun run tauri dev
   # ou
   npm run tauri dev
   ```

### Build para Produção

```bash
# Build do Next.js
bun run build

# Build do Tauri (gera executável)
cd src-tauri
cargo tauri build
```

O executável estará em `src-tauri/target/release/bundle/`

---

## 🛠️ Stack Tecnológica

### Frontend

- **[Next.js 15](https://nextjs.org/)** - Framework React
- **[React 19](https://react.dev/)** - UI Library
- **[TypeScript](https://www.typescriptlang.org/)** - Type Safety
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes UI
- **[Framer Motion](https://www.framer.com/motion/)** - Animações
- **[GSAP](https://greensock.com/gsap/)** - Animações avançadas

### Backend (Desktop)

- **[Tauri 2.0](https://tauri.app/)** - Desktop Framework
- **[Rust](https://www.rust-lang.org/)** - Sistema de arquivos, persistência
- **JSON** - Armazenamento local de dados

### API Externa

- **[Critix API](https://github.com/Walaff/critix_api)** - Backend Java para metadados
- **[TMDB](https://www.themoviedb.org/)** - The Movie Database

---

## 📁 Estrutura do Projeto

```
critix_vault_desktop/
├── src/                      # Frontend Next.js
│   ├── app/                  # Rotas do app
│   ├── components/           # Componentes React
│   ├── hooks/                # Custom hooks
│   ├── services/             # Serviços (API, Tauri)
│   ├── types/                # TypeScript types
│   └── lib/                  # Utilitários
├── src-tauri/                # Backend Rust
│   ├── src/
│   │   ├── commands/         # Comandos Tauri
│   │   ├── models/           # Estruturas de dados
│   │   ├── storage/          # Gerenciamento de dados
│   │   └── lib.rs            # Entry point
│   └── Cargo.toml            # Dependências Rust
├── docs/                     # Documentação
└── .github/workflows/        # CI/CD Pipelines
```

---

## 🎯 Funcionalidades

### ✅ Implementadas

- [x] Adicionar/remover pastas para monitoramento
- [x] Escanear arquivos de mídia (`.mkv`, `.mp4`, `.avi`, etc.)
- [x] Match automático com TMDB via Critix API
- [x] Detecção de séries com padrão `S01E01`
- [x] Armazenamento persistente (Rust backend)
- [x] Cache de imagens para funcionamento offline
- [x] Interface de biblioteca com grid/list view
- [x] Detalhes de filmes e séries
- [x] Edição manual de metadados
- [x] Página de configurações (reset, export/import)
- [x] Pipelines CI/CD (GitHub Actions)

### 🔜 Próximas Features

- [ ] Histórico de visualização
- [ ] Sistema de favoritos
- [ ] Filtros avançados (gênero, ano, avaliação)
- [ ] Player integrado
- [ ] Suporte a animes com API especializada
- [ ] Sincronização em nuvem (opcional)

---

## 📸 Screenshots

_Em breve..._

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📜 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🙏 Créditos

### Criador

- **Walafe Alencar** - Desenvolvimento do Critix Vault Desktop

### Integração e Serviços

- **[Critix API](https://github.com/Walaff/critix_api)** - Backend Java para busca de metadados
- **[TMDB](https://www.themoviedb.org/)** - The Movie Database - Fonte de dados de filmes e séries

### Tecnologias

- **[Tauri](https://tauri.app/)** - Framework desktop
- **[Next.js](https://nextjs.org/)** - React framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes UI

---

## 🔗 Links

- **Repositório**: [GitHub](https://github.com/seu-usuario/critix_vault_desktop)
- **Critix API**: [GitHub](https://github.com/Walaff/critix_api)
- **Documentação**: [docs/](./docs/)

---

<div align="center">

**Feito com ❤️ usando Tauri, Next.js e Rust**

</div>
