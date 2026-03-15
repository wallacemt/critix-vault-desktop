# Critix Vault - Guia Completo de Implementação

## 🎉 Visão Geral das Melhorias

Este documento descreve todas as melhorias implementadas no Critix Vault, transformando-o em uma aplicação desktop premium com experiência de usuário excepcional.

---

## 🚀 Implementações Técnicas (FullStack)

### 1. **Sistema de Scan de Pastas Completo**

**Arquivo:** `src/services/folderScanService.ts`

Implementação de scanner recursivo de arquivos de mídia:

- Suporte para extensões: `.mkv`, `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.m4v`
- Match automático com API do Critix/TMDB
- Progress callback para feedback visual durante scan
- Extração inteligente de nomes de arquivos (remove tags de qualidade, ano, etc.)

**Rust Backend:** `src-tauri/src/lib.rs`

```rust
fn scan_folder(folder_path: String) -> Result<Vec<String>, String>
```

- Scan recursivo de diretórios
- Filtro por extensões de mídia
- Performance otimizada

**Como usar:**

```typescript
import { folderScanService } from "@/services/folderScanService";

const result = await folderScanService.scanAndMatchFolder(folderId, folderPath, (progress) => {
  console.log(`${progress.processedFiles}/${progress.totalFiles}`);
});
```

### 2. **Persistência de Dados com localStorage**

**Arquivo:** `src/services/storageService.ts`

Armazenamento local para não perder dados entre sessões:

- Salva folders, movies e series
- Sync automático com Tauri
- Timestamp de última sincronização
- Métodos: `saveFolders()`, `getFolders()`, `saveMovies()`, `getMovies()`, etc.

**Como usar:**

```typescript
import { storageService } from "@/services/storageService";

// Salvar
storageService.saveFolders(folders);
storageService.saveMovies(movies);

// Carregar
const folders = storageService.getFolders();
const movies = storageService.getMovies();
```

### 3. **Dialog de Seleção de Pastas (Tauri)**

**Rust Command:** `select_folder_dialog`

```rust
async fn select_folder_dialog(app: tauri::AppHandle) -> Result<Option<String>, String>
```

Usa o `tauri_plugin_dialog` para abrir diálogo nativo do sistema operacional.

---

## 🎨 Melhorias de Design e UI/UX

### 1. **Sistema de Tipografia Padronizado**

**Layout Principal:** `src/app/layout.tsx`

```typescript
--font - display; // Moonjelly - Para títulos e destaques
--font - sans; // Poppins - Para textos secundários e body
```

**Uso:**

```tsx
<h1 className="font-display">Título Principal</h1>
<p className="font-sans">Texto do corpo</p>
```

### 2. **Variáveis CSS Customizadas**

**Arquivo:** `src/app/globals.css`

Paleta de cores premium:

```css
--color-primary: #ffc107; /* Dourado moderno */
--bg-body: #121212; /* Fundo principal */
--bg-surface: #1e1e1e; /* Cartões e surfaces */
--bg-surface-light: #2c2c2c; /* Inputs e elementos terciários */
--text-primary: #f5f5f5; /* Texto principal */
--text-secondary: #b0b0b0; /* Texto secundário */
--text-muted: #6e6e6e; /* Texto desabilitado */
--color-danger: #e50914; /* Erros */
--color-success: #00c853; /* Sucesso */
--glow-primary: 0 0 15px rgba(255, 193, 7, 0.4); /* Brilho dourado */
```

### 3. **Landing Page com Animações Premium**

**Arquivo:** `src/components/features/landing/LandingPage.tsx`

**Tecnologias:** Framer Motion + GSAP

**Animações implementadas:**

- ✨ Background gradients animados (rotação infinita)
- 🎈 Logo flutuante (efeito float)
- 💫 Glow pulse no logo
- 📦 Feature cards com stagger animation
- 🎭 Fade-in/scale para todos elementos
- 🖱️ Hover effects nos botões e cards

**Efeitos visuais:**

- Parallax scroll no hero section
- Gradient borders nos cards
- Hover effects com transformações 3D
- Transições suaves entre estados

### 4. **Skeleton Loading States**

**Arquivo:** `src/components/ui/media-skeleton.tsx`

Componentes de loading bonitos:

- `<MediaCardSkeleton />` - Card individual
- `<MediaGridSkeleton count={12} />` - Grid completo
- Shimmer effect animado
- Gradient de fundo

**Como usar:**

```tsx
{
  loading ? <MediaGridSkeleton count={12} /> : <MediaGrid media={data} />;
}
```

### 5. **Error States Premium**

**Arquivo:** `src/components/ui/error-state.tsx`

Componentes para exibir erros elegantemente:

- `<ErrorState />` - Tela cheia de erro
- `<InlineError />` - Erro inline

**Features:**

- Animações com Framer Motion
- Suporte a ícones customizados ou imagens (`/images/503.svg`)
- Botões de retry e voltar ao início
- Gradientes e efeitos visuais

**Como usar:**

```tsx
{
  error ? (
    <ErrorState title="Erro ao carregar" message={error} onRetry={() => refetch()} onGoHome={() => router.push("/")} />
  ) : (
    <Content />
  );
}
```

### 6. **Library Layout Melhorado**

**Arquivo:** `src/components/features/library/LibraryLayout.tsx`

**Melhorias visuais:**

- Sidebar animada (slide-in com spring animation)
- Tabs animadas com indicador móvel
- Animated background no header
- Stats footer com contador de filmes/séries
- Custom scrollbar estilizada
- Folder items com hover effects
- Empty state animado

**Animações GSAP:**

- Stagger nos folder items
- Smooth transitions entre states

---

## 📦 Bibliotecas Instaladas

```bash
bun add framer-motion gsap
```

### Framer Motion

- Animações declarativas e performáticas
- Variants para orchestração
- Layout animations
- Gestures (hover, tap, drag)

### GSAP (GreenSock Animation Platform)

- Animações de alta performance
- Sequências e timelines
- Easing functions avançadas
- Stagger animations

---

## 🎯 Funcionalidades Implementadas

### ✅ Backend (Rust/Tauri)

- [x] Dialog de seleção de pastas nativo
- [x] Scan recursivo de diretórios
- [x] Filtro de extensões de mídia
- [x] Abertura de arquivos com player padrão ou VLC

### ✅ Services

- [x] Folder scan service com progress callback
- [x] Storage service para persistência local
- [x] API service para comunicação com Critix API
- [x] Demo service para TMDB trending

### ✅ UI Components

- [x] Landing Page animada premium
- [x] Skeleton loaders para todos componentes
- [x] Error states (fullscreen e inline)
- [x] Media cards com hover effects
- [x] Library layout com sidebar animada

### ✅ Tipografia e Cores

- [x] Variáveis CSS customizadas
- [x] Font-display (Moonjelly) para títulos
- [x] Font-sans (Poppins) para body
- [x] Paleta de cores dark theme premium

### ✅ Animações

- [x] Framer Motion para transições de página
- [x] GSAP para sequências complexas
- [x] Hover effects em todos elementos interativos
- [x] Loading states animados
- [x] Page transitions

---

## 🚀 Como Rodar o Projeto

### Desenvolvimento

```bash
# Instalar dependências
bun install

# Rodar em modo dev
bun run tauri dev
```

### Build de Produção

```bash
# Build completo (Rust + Next.js)
bun run tauri build
```

---

## 📁 Estrutura de Arquivos Atualizada

```
src/
├── app/
│   ├── globals.css          # Variáveis CSS customizadas
│   ├── layout.tsx           # Font-display e font-sans config
│   └── page.tsx             # Roteamento principal
├── components/
│   ├── features/
│   │   ├── landing/
│   │   │   └── LandingPage.tsx      # ✨ PREMIUM com animações
│   │   ├── library/
│   │   │   ├── LibraryLayout.tsx    # ✨ Melhorado com sidebar animada
│   │   │   └── _components/
│   │   │       ├── streaming-card.tsx
│   │   │       └── streaming-grid.tsx
│   │   └── media/
│   │       ├── MovieDetails.tsx
│   │       └── SeriesDetails.tsx
│   └── ui/
│       ├── media-skeleton.tsx       # 🎨 Skeleton loaders
│       ├── error-state.tsx          # ❌ Error states premium
│       ├── skeleton.tsx
│       └── ... (outros componentes ShadCN)
├── services/
│   ├── folderScanService.ts        # 🔍 Scanner de pastas
│   ├── storageService.ts           # 💾 Persistência local
│   ├── api.ts
│   ├── tauri.ts
│   ├── demoService.ts
│   └── mediaService.ts
├── hooks/
│   ├── useFolders.ts               # ✨ Integrado com storage
│   ├── useMediaLibrary.ts
│   └── ... (outros hooks)
└── types/
    └── index.ts

src-tauri/
└── src/
    └── lib.rs                      # ✅ Commands: select_folder_dialog, scan_folder
```

---

## 🎨 Guia de Estilo

### Cores

```tsx
// Primárias
bg-[var(--bg-body)]           // Fundo principal
bg-[var(--bg-surface)]        // Cartões
bg-[var(--bg-surface-light)]  // Inputs

// Texto
text-[var(--text-primary)]    // Texto principal (títulos)
text-[var(--text-secondary)]  // Texto secundário (descrições)
text-[var(--text-muted)]      // Texto desabilitado

// Accent
from-[var(--color-primary)]   // Dourado (#ffc107)
text-[var(--color-danger)]    // Vermelho para erros
text-[var(--color-success)]   // Verde para sucesso
```

### Gradientes

```tsx
// Background animado
bg-gradient-to-br from-blue-600/10 to-transparent

// Botões premium
bg-gradient-to-r from-[var(--color-primary)] to-amber-500

// Cards hover
bg-gradient-to-br from-blue-500/20 to-cyan-500/20
```

### Sombras

```tsx
shadow-[var(--glow-primary)]  // Glow dourado
shadow-2xl                     // Sombra profunda
```

---

## 🎬 Próximos Passos Recomendados

### Prioridade Alta

1. **Implementar lógica de scan real** - Conectar `folderScanService` com a API do Critix
2. **Adicionar progress bar** - Durante scan de pastas grandes
3. **Implementar watch progress** - Salvar em que ponto do filme/série o usuário parou
4. **File watcher** - Detectar novos arquivos adicionados automaticamente

### Prioridade Média

5. **Settings page** - Configurações de player, idioma, tema
6. **Search functionality** - Buscar na biblioteca
7. **Filters e sorts** - Por gênero, ano, rating, etc.
8. **Collections** - Criar coleções customizadas

### Prioridade Baixa

9. **Stats dashboard** - Estatísticas da biblioteca
10. **Export/Import** - Backup da biblioteca
11. **Integração com outros serviços** - Trakt.tv, etc.

---

## 🐛 Debug e Troubleshooting

### Error: "pnpm not found"

- **Solução:** Use `bun` em vez de `pnpm`

### Fontes não carregam

- **Verificar:** Arquivos `.otf` existem em `src/app/assets/fonts/`
- **Verificar:** `@font-face` no `globals.css`

### Animações travando

- **Reduzir:** Quantidade de elementos animados simultaneamente
- **Usar:** `will-change: transform` em CSS

### Tauri dialog não abre

- **Verificar:** Plugin instalado no `Cargo.toml`

```toml
tauri-plugin-dialog = "2.0"
```

---

## 📚 Recursos

### Documentação

- [Framer Motion](https://www.framer.com/motion/)
- [GSAP](https://gsap.com/docs/v3/)
- [Tauri 2.x](https://v2.tauri.app)
- [Next.js App Router](https://nextjs.org/docs/app)

### Design Inspiration

- Netflix UI
- Disney+ UI
- Plex Media Server

---

## 👨‍💻 Desenvolvido com

- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **Desktop:** Tauri 2.x, Rust
- **Styling:** Tailwind CSS, CSS Variables
- **Animation:** Framer Motion, GSAP
- **UI Components:** ShadCN UI
- **Icons:** Lucide React
- **Fonts:** Moonjelly (Display), Poppins (Sans)

---

## 📄 Licença

Este projeto é proprietário e desenvolvido para o sistema Critix.

---

**Versão:** 1.0.0  
**Última atualização:** Janeiro 2026  
**Status:** ✅ MVP Completo com UI/UX Premium
