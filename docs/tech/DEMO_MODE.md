# 🎬 Demo Mode - Critix Vault

## Visão Geral

O **Modo Demo** permite que os usuários explorem a interface do Critix Vault sem precisar adicionar pastas locais. Ele exibe conteúdo trending real do TMDB (The Movie Database) em tempo real.

## Como Funciona

### 1. **Ativação do Demo**

- Na tela inicial (Landing Page), um novo botão **"View Demo"** está disponível
- Ao clicar, o app carrega automaticamente o conteúdo trending do TMDB
- Não é necessário adicionar pastas ou ter arquivos locais

### 2. **Fonte de Dados**

- Utiliza a rota já implementada: `/media/v1/trending`
- Busca filmes e séries que estão em alta no momento
- Dados são convertidos automaticamente para o formato do app

### 3. **Interface do Demo**

- Sidebar com informações sobre o demo
- Contador de filmes e séries carregados
- Mesma interface de biblioteca, mas com dados do TMDB
- Tabs para filtrar entre todos, filmes ou séries

## Arquivos Implementados

### Services

```
src/services/demoService.ts
```

- `loadDemoData()` - Carrega dados trending do TMDB
- `convertToMovie()` - Converte dados TMDB para formato Movie
- `convertToSeries()` - Converte dados TMDB para formato Series
- `createDemoFolder()` - Cria uma pasta virtual de demo

### Hooks

```
src/hooks/index.ts (atualizado)
```

- `useDemoData()` - Hook para gerenciar estado do demo
- Carrega dados trending
- Gerencia loading e error states

### Components

```
src/features/demo/DemoLibrary.tsx
```

- Componente principal do modo demo
- Layout similar ao LibraryLayout
- Sidebar informativa com estatísticas
- Integração com StreamingCard para exibir mídia

### Pages

```
src/app/page.tsx (atualizado)
```

- Novo estado: `'demo'`
- Handler `handleViewDemo()` para ativar demo
- Navegação entre demo e outras telas
- Gerenciamento de estado anterior para voltar corretamente

### Landing Page

```
src/features/landing/LandingPage.tsx (atualizado)
```

- Novo botão "View Demo"
- Prop opcional `onViewDemo`
- Dica contextual sobre o demo

## Fluxo de Uso

### Para o Usuário

1. App inicia → Splash Screen
2. Verifica API
3. Chega na Landing Page
4. Usuário pode:
   - **Adicionar Pasta** → Usar app normalmente
   - **Ver Demo** → Explorar conteúdo trending

### Modo Demo Ativo

```
Landing Page → Click "View Demo" → Demo Library
                                        ↓
                        [Carrega dados do TMDB]
                                        ↓
                        [Exibe em formato streaming]
                                        ↓
                        [Click em card → Detalhes]
```

## Características

### ✅ Funcionalidades

- ✅ Carregamento automático de trending
- ✅ Conversão de dados TMDB → App format
- ✅ Mesma UX da biblioteca normal
- ✅ Navegação para detalhes de filme/série
- ✅ Filtros por tipo (todos/filmes/séries)
- ✅ Loading states
- ✅ Error handling com retry
- ✅ Botão de voltar para landing

### 🎨 Visual

- Interface similar à biblioteca normal
- Indicadores visuais de que é um demo
- Estatísticas em tempo real
- Ícone 🎬 para identificar demo
- Sidebar informativa

### 🔄 Conversão de Dados

**TMDB → Movie:**

```typescript
{
  id: 'demo-movie-{tmdb_id}',
  type: 'MOVIE',
  title: tmdb.title,
  poster: 'https://image.tmdb.org/t/p/w500{poster_path}',
  backdrop: 'https://image.tmdb.org/t/p/w500{backdrop_path}',
  overview: tmdb.overview,
  rating: tmdb.vote_average,
  status: 'MATCHED',
  filePath: '/demo/path/to/movie.mp4',
  // ...
}
```

**TMDB → Series:**

```typescript
{
  id: 'demo-series-{tmdb_id}',
  type: 'SERIES',
  title: tmdb.name,
  poster: 'https://image.tmdb.org/t/p/w500{poster_path}',
  // ...
  seasons: [],
  numberOfSeasons: 1,
  numberOfEpisodes: 10,
}
```

## Benefícios

### Para Desenvolvedores

- ✅ Testar UI sem setup de arquivos locais
- ✅ Dados reais do TMDB
- ✅ Validar integração com API
- ✅ Demonstrar funcionalidades

### Para Usuários

- ✅ Explorar interface antes de adicionar pastas
- ✅ Ver como o app funciona
- ✅ Descobrir trending content
- ✅ Não requer setup inicial

## Limitações do Demo

### Não Funciona

- ❌ Play de arquivos (não existem arquivos locais)
- ❌ Adicionar/remover pastas
- ❌ Scan de diretórios
- ❌ Detalhes completos de séries (temporadas/episódios)

### Funciona Normalmente

- ✅ Navegação pela interface
- ✅ Visualização de cards
- ✅ Filtros e tabs
- ✅ Detalhes básicos de filmes
- ✅ Loading states
- ✅ Voltar para landing

## Uso da API

### Endpoint Utilizado

```
GET /media/v1/trending
```

### Resposta Esperada

```typescript
[
  {
    id: number,
    title?: string,
    name?: string,
    media_type: 'movie' | 'tv',
    poster_path: string,
    backdrop_path: string,
    overview: string,
    vote_average: number,
    release_date?: string,
    first_air_date?: string,
    // ...
  }
]
```

### Tratamento de Erros

- Timeout de 15 segundos
- Retry manual disponível
- Mensagens de erro amigáveis
- Fallback para array vazio

## Exemplos de Código

### Ativar Demo

```typescript
const handleViewDemo = () => {
  setPreviousState(appState);
  setAppState("demo");
};
```

### Carregar Dados Demo

```typescript
const { movies, series, loading, error, loadDemo } = useDemoData();

useEffect(() => {
  loadDemo();
}, [loadDemo]);
```

### Exibir Interface

```typescript
<DemoLibrary
  onBack={handleBack}
  onMediaClick={handleMediaClick}
  onMediaPlay={handlePlayMovie}
/>
```

## Melhorias Futuras

### Possíveis Adições

- [ ] Cache de dados trending (evitar reload)
- [ ] Diferentes categorias (popular, top rated, etc.)
- [ ] Filtro por gênero
- [ ] Paginação para mais resultados
- [ ] Busca dentro do demo
- [ ] Opção de "favoritar" no demo
- [ ] Transição suave entre demo e biblioteca real

## Observações Técnicas

### Performance

- Dados carregados sob demanda
- Timeout de 15s para prevenir travamentos
- Imagens lazy-loaded automaticamente
- Conversão eficiente de dados

### Estado

- Estado do demo isolado do estado da biblioteca
- Histórico de navegação mantido
- Volta corretamente para tela anterior
- Limpeza de estado ao sair do demo

### Segurança

- Apenas leitura de dados públicos do TMDB
- Sem armazenamento de dados sensíveis
- Paths de arquivo fictícios
- Sem acesso ao filesystem

---

**O modo demo está pronto para uso! Inicie o app e clique em "View Demo" na landing page.** 🚀
