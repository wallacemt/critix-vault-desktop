# The Blueprint-001 — Torrent Browser Discovery

## Metadata
- Project:            Critix Vault Desktop (+ critix_backend)
- Date:               2026-06-14
- Architect:          Morpheus Agent
- Blueprint version:  v1
- Status:             Draft

---

## 1. Context and Objective

A tela `torrent-search` hoje é um buscador "plano": o usuário digita um texto, o Rust chama
`apibay.org` diretamente e a UI lista resultados crus (nome, categoria, tamanho, seeders).
Não há descoberta de conteúdo, não há enriquecimento visual com TMDB, e o endpoint do PirateBay
fica exposto diretamente ao renderer via Rust.

O objetivo é transformar essa tela em um **Torrent Browser Discovery**: ao abrir, ele apresenta
um "feed" de mídias em alta (TMDB trending/popular + destaques scrapeados de apachetorrent.com),
cada uma enriquecida com metadados do TMDB e cruzada com torrents do PirateBay. Os cards reutilizam
o visual da biblioteca (`StreamingCard`), mas em modo "discovery" — apenas um botão **Download** e
navegação para detalhes. A busca manual atual é preservada.

O sistema deve degradar graciosamente: se o `critix_backend` estiver offline, a busca manual via
Rust→apibay continua funcionando; se apachetorrent.com cair, o feed cai de volta só para o TMDB.

### Escopo
- IN: feed de descoberta, enriquecimento TMDB, cruzamento com PirateBay, scraping apachetorrent,
  layout grid/lista, filtros, navegação para detalhes, migração da query PirateBay para o backend.
- OUT: gerenciamento de downloads/progresso, autenticação de trackers privados, legendas
  (já cobertas por outras rotas), mudanças na biblioteca local.

---

## 2. Requirements

### Funcionais
- **RF-01** Ao abrir a tela, exibir mídias em alta do TMDB (trending + popular) sem ação do usuário.
- **RF-02** Para cada mídia do feed, associar torrents correspondentes do PirateBay (melhor match por seeders).
- **RF-03** Exibir cards no padrão visual da biblioteca (`StreamingCard`), em modo discovery (somente Download + clique para detalhes).
- **RF-04** Scrapear apachetorrent.com para obter mídias em destaque e enriquecê-las com TMDB.
- **RF-05** Alternar layout entre grid e lista, reusando o padrão de `useLibraryLeyout`.
- **RF-06** Ao clicar num card, abrir a página de detalhes da mídia, carregando dados via proxy TMDB.
- **RF-07** Filtrar por categoria (filme/série), gênero, ano e qualidade (TMDB + metadados do torrent).
- **RF-08** Manter a busca manual por texto (comportamento atual preservado).
- **RF-09** Migrar a query do PirateBay: Rust → critix_backend → apibay.org (com cache Redis).
- **RF-10** Permitir paginação / "carregar mais" no feed.

### Não-funcionais
- **RNF-01 (Resiliência)** A tela funciona com `critix_backend` offline: busca manual via Rust continua; feed mostra estado degradado claro.
- **RNF-02 (Resiliência)** Falha de apachetorrent.com ou apibay.org nunca quebra o feed — fallback parcial.
- **RNF-03 (Performance)** Primeira pintura do feed < 1.5s quando o cache do backend está quente (Redis hit).
- **RNF-04 (Cache)** Trending/popular reusa o cache `tmdb` (24h). Resultados PirateBay cacheados (TTL curto, ~15min). Scraping apachetorrent cacheado (~1h).
- **RNF-05 (Segurança)** O endpoint apibay/PirateBay nunca é chamado diretamente pelo renderer; passa pelo backend ou pelo Rust validado. Magnet links continuam validados no Rust antes de irem ao SO.
- **RNF-06 (Rate limiting)** O proxy PirateBay no backend respeita rate limit por IP/sessão para não ser banido pelo apibay.
- **RNF-07 (Manutenibilidade)** Sem duplicação de `StreamingCard`; reuso via props. Sem duplicação do TMDBClient.
- **RNF-08 (Identidade visual)** Dark theme, accent emerald na tela torrent, framer-motion preservados.

---

## 3. Architecture Decisions (ADRs)

### ADR-01 — Onde mora a lógica do "discovery feed" (composição TMDB + PirateBay)
- **Contexto:** O feed precisa combinar trending TMDB, popular TMDB, destaques scrapeados e torrents do PirateBay. Isso pode ser composto no desktop (Next API / React) ou no `critix_backend`.
- **Opções:**
  - **A. Compor no backend (Spring Boot)** — um endpoint `/media/v1/discovery/feed` que orquestra TMDB + PirateBay + scraping e devolve pronto.
    - Prós: cache Redis centralizado (já existe `tmdb`), uma única ida à rede do ponto de vista do desktop, lógica testável em Java, segredo do apibay/scraping fora do cliente.
    - Contras: acopla o feed à disponibilidade do backend.
  - **B. Compor no desktop (Next API routes / React)** — buscar trending TMDB e, para cada item, chamar PirateBay.
    - Prós: funciona sem backend para a parte de torrent.
    - Contras: N+1 requisições do cliente, sem cache compartilhado, duplica orquestração, expõe mais lógica.
- **Decisão:** **A**, com **degradação**: o feed *enriquecido* é servido pelo backend; quando o backend está offline, o desktop cai para o modo "busca manual + trending básico se houver cache local de imagens". A composição pesada fica no backend.
- **Consequências:** Centraliza cache e resiliência server-side. O desktop precisa de um caminho de fallback explícito (ADR-05). É preciso um novo módulo de orquestração no backend (`DiscoveryService`).

### ADR-02 — Migração da query PirateBay: novo client no backend, Rust mantém só o download
- **Contexto:** Hoje `search_torrents` (Rust) chama apibay.org. RF-09 pede centralizar no backend.
- **Opções:**
  - **A. Backend passa a ser a fonte de busca PirateBay; Rust mantém apenas `intercept_torrent_link` (download).**
  - **B. Rust continua sendo o proxy do PirateBay.**
- **Decisão:** **A** para o fluxo de discovery e para a busca manual *quando online*; **mantém-se** `search_torrents` no Rust como **fallback offline** (RNF-01) — não removê-lo. O download (`intercept_torrent_link`) **permanece exclusivamente no Rust** por segurança (validação de magnet + handoff ao SO).
- **Consequências:** Dois caminhos de busca coexistem temporariamente (backend preferencial, Rust fallback). É uma duplicação *consciente e justificada* pela resiliência. Documentar claramente para não divergirem o shape de resposta — ambos devem normalizar para o mesmo DTO de torrent.

### ADR-03 — HTTP client no backend para apibay.org: RestClient (não WebClient)
- **Contexto:** O TMDBClient usa `WebClient` (reativo, bloqueia com `.block()`). Spring Boot 4.0.0 recomenda `RestClient` para chamadas imperativas quando não se usa WebFlux de fato.
- **Verificação (context7, 2026-06-14):** Docs Spring Boot v4.0.0 — "If you are not using Spring WebFlux or Project Reactor we recommend that you use `org.springframework.web.client.RestClient`. Spring Boot pre-configures a prototype `RestClient.Builder` bean."
- **Opções:**
  - **A. RestClient** para o novo `PirateBayClient`.
  - **B. WebClient** por consistência com TMDBClient.
- **Decisão:** **A (RestClient)** para o novo client PirateBay e scraping HTTP auxiliar. Não refatorar o TMDBClient existente (fora de escopo).
- **Consequências:** Introduz um segundo estilo de client no backend. Justificado: TMDBClient já existe e funciona; novo código segue a recomendação atual da plataforma. Documentar o porquê para evitar "consertarem" depois.

### ADR-04 — Scraping de apachetorrent.com: no backend com Jsoup
- **Contexto:** RF-04. O scraping pode rodar no Rust (reqwest + parse manual) ou no backend (Jsoup).
- **Verificação (context7, 2026-06-14):** Jsoup 1.20.1 — `Jsoup.connect(url).userAgent(...).timeout(...).get()` + `doc.select(cssQuery)`. API atual confirmada.
- **Opções:**
  - **A. Backend + Jsoup** — parsing robusto de HTML, cache Redis, normalização junto da composição do feed.
  - **B. Rust + reqwest** — sem dependência de parser HTML maduro; parsing frágil.
- **Decisão:** **A**. O scraping vive no `DiscoveryService` (backend), cacheado, e os títulos extraídos são re-resolvidos no TMDB (via `postSearchMedia`/`search`) para enriquecimento. Site indisponível → lista de destaques vazia, feed continua só com TMDB (RNF-02).
- **Consequências:** Nova dependência `org.jsoup:jsoup:1.20.1` no `pom.xml`. Seletores CSS são frágeis a mudanças do site — isolar num único `ApacheTorrentScraper` com seletores configuráveis e logar quando o parse retornar zero itens (sinal de quebra de layout).

### ADR-05 — Reuso do `StreamingCard` via prop `mode`, sem componente duplicado
- **Contexto:** RNF-07 proíbe duplicar o card. O `StreamingCard` atual exige um objeto `Media` e mostra botões de biblioteca condicionados a callbacks (`onPlay`, `onEdit`, `onDelete`, `onToggleHidden`) — mas **sempre** renderiza o toggle "assistido", que não faz sentido no discovery.
- **Opções:**
  - **A. Adicionar prop `mode?: "library" | "discovery"` + `onDownload?`** ao `StreamingCard`. Em `discovery`, esconde watched/edit/delete/play e mostra Download.
  - **B. Criar `TorrentDiscoveryCard` separado.**
- **Decisão:** **A**. Adapta o componente existente com uma prop discriminante e um callback `onDownload`. O objeto continua sendo `Media` (a mídia TMDB normalizada), com um campo opcional carregando o(s) torrent(s) associado(s).
- **Consequências:** `StreamingCard` ganha um caminho condicional a mais. Aceitável e localizado. Evita drift visual entre biblioteca e discovery. O toggle "assistido" precisa ser explicitamente suprimido em modo discovery.

### ADR-06 — Roteamento do proxy do desktop: estender allowlist, não criar rota nova
- **Contexto:** `src/app/api/external/[...path]/route.ts` tem allowlist estrita (`/status`, `/media/`). Os novos endpoints do backend ficarão sob `/media/v1/discovery/...`, que **já casa** com o prefixo `/media/`.
- **Decisão:** Manter o proxy genérico. Como os endpoints novos vivem sob `/media/`, **nenhuma mudança na allowlist é necessária**. Apenas adicionar métodos no `ApiService`.
- **Consequências:** Zero alteração no route handler. Confirmar que o timeout de 5s do proxy é suficiente para o feed composto — **risco**: a composição (TMDB + PirateBay + scraping) pode exceder 5s na primeira chamada fria. Mitigação em ADR-07.

### ADR-07 — Estratégia de cache e "warm-up" do feed para caber no timeout de 5s do proxy
- **Contexto:** O proxy do desktop aborta em 5s. Um feed frio (sem cache) que faz TMDB + N buscas PirateBay + scraping pode estourar isso.
- **Opções:**
  - **A. Pré-aquecer o cache** com `@Scheduled` no backend (atualiza o feed em background a cada X min) → requisição do desktop quase sempre pega cache quente.
  - **B. Computar sob demanda** e arriscar timeout.
  - **C. Endpoint assíncrono em duas fases** (devolve TMDB rápido, torrents depois).
- **Decisão:** **A + C-light**: `@Scheduled` aquece `discovery:feed` periodicamente; o endpoint sempre serve do cache. O cruzamento com PirateBay é feito **lazy e cacheado por mídia** (`piratebay:match:<imdb|title>`), e a UI pode pedir os torrents de uma mídia individualmente se vierem ausentes. Verificação context7 confirma `@Scheduled` e Redis cache suportados no Spring Boot 4.
- **Consequências:** Feed responde rápido (cache quente). Custo: um job agendado e TTLs a calibrar. Primeira inicialização do backend pode ter um curto período sem feed quente — UI mostra skeleton.

---

## 4. Technology Stack

| Camada | Tecnologia | Versão (verificada via context7) | Verif. | Justificativa |
|--------|-----------|----------------------------------|--------|---------------|
| Backend runtime | Spring Boot | 4.0.0 (já em uso no `pom.xml`) | 2026-06-14 | Plataforma existente do `critix_backend`. |
| Backend lang | Java | 21 (já em uso) | 2026-06-14 | Definido no `pom.xml` (`<java.version>21</java.version>`). |
| HTTP client (novo) | Spring `RestClient` | parte do Spring Framework 7 / Boot 4.0.0 | 2026-06-14 | Recomendação oficial Boot 4 para chamadas imperativas (ADR-03). |
| HTML scraping | Jsoup | 1.20.1 | 2026-06-14 | Última estável; API `connect/select` confirmada (ADR-04). |
| Cache | Redis (Spring Data Redis) | já configurado (`RedisCacheConfig`) | 2026-06-14 | Reuso do cache manager existente; adicionar caches nomeados. |
| Agendamento | Spring `@Scheduled` | Spring Boot 4.0.0 | 2026-06-14 | Warm-up do feed (ADR-07). |
| Desktop UI | Next.js 15 / React / TS | já em uso | — | Stack existente do desktop. |
| Animação | Framer Motion | já em uso | — | Identidade visual (RNF-08). |
| Tauri/Rust | Tauri (reqwest) | já em uso | — | Mantém `intercept_torrent_link` + fallback de busca. |

> Nota: as versões "já em uso" não foram bumpadas — esta feature não exige upgrade de stack. A única dependência **nova** é Jsoup 1.20.1 no backend.

---

## 5. Directory Structure

### Backend (`critix_backend/src/main/java/com/br/critix/`)
```
infra/clients/piratebay/                         # NOVO — client do PirateBay (apibay.org)
  PirateBayClient.java                           # RestClient → apibay.org/q.php
  dto/
    PirateBayTorrentDTO.java                     # shape cru do apibay (id, name, info_hash, seeders...)
infra/clients/apachetorrent/                     # NOVO — scraper de destaques
  ApacheTorrentScraper.java                      # Jsoup → lista de títulos/links em destaque
  dto/
    ApacheHighlightDTO.java                      # título bruto + ano/qualidade extraídos
application/discovery/                            # NOVO — orquestração do feed
  DiscoveryService.java                          # compõe TMDB + PirateBay + scraping (cacheado)
  DiscoveryFeedWarmupJob.java                    # @Scheduled warm-up do cache do feed
presentation/controller/
  DiscoveryController.java                        # NOVO — endpoints REST sob /media/v1/discovery/*
presentation/dto/discovery/                       # NOVO — DTOs de resposta da API
  DiscoveryFeedResponseDTO.java
  DiscoveryItemDTO.java                          # mídia TMDB normalizada + torrents associados
  TorrentMatchDTO.java                           # torrent normalizado (estável, compartilhado)
infra/config/redis/
  RedisCacheConfig.java                          # EDITAR — adicionar caches "discovery" e "piratebay"
```

### Desktop (`critix_vault_desktop/src/`)
```
types/
  discovery.ts                                   # NOVO — DiscoveryItem, TorrentMatch, DiscoveryFeed, filtros
services/
  api.ts                                         # EDITAR — getDiscoveryFeed(), getTorrentsForMedia(), searchTorrentsViaBackend()
hooks/
  useTorrentDiscovery.ts                         # NOVO — estado: feed, loading, filtros, paginação, layout, fallback
components/features/
  library/_components/
    streaming-card.tsx                           # EDITAR — prop mode="discovery" + onDownload
  discovery/                                     # NOVO — componentes específicos do discovery
    DiscoveryFilters.tsx                         # barra/painel de filtros (categoria, gênero, ano, qualidade)
    DiscoverySection.tsx                         # seção "Em Alta" (grid/lista de cards discovery)
    TorrentPickerDialog.tsx                      # quando há vários torrents p/ a mídia, escolher qual baixar
app/(app)/torrent-search/
  page.tsx                                       # EDITAR — adiciona feed discovery acima da busca manual
```

### Rust (`critix_vault_desktop/src-tauri/src/commands/torrent.rs`)
```
torrent.rs                                       # SEM mudança estrutural — mantém search_torrents (fallback)
                                                 #   e intercept_torrent_link (download). Ver ADR-02.
```

---

## 6. Components and Responsibilities

### Backend

**`PirateBayClient`** (infra/clients/piratebay)
- Faz: GET em `https://apibay.org/q.php?q=<query>&cat=0` via `RestClient`, com user-agent e timeout; filtra entradas com `info_hash` nulo (`0000...`); mapeia para `PirateBayTorrentDTO`.
- Não faz: cache (fica no service), composição com TMDB, construção de magnet (isso é do desktop/Rust).
- Depende de: `RestClient.Builder` (injetado).

**`ApacheTorrentScraper`** (infra/clients/apachetorrent)
- Faz: `Jsoup.connect("https://apachetorrent.com/").userAgent(...).timeout(...).get()`, seleciona os blocos de destaque por CSS, extrai título/ano/qualidade → `ApacheHighlightDTO`.
- Não faz: resolução TMDB, cache.
- Resiliência: em `IOException`/parse vazio, retorna `List.of()` e loga WARN (sinal de quebra de layout).

**`DiscoveryService`** (application/discovery)
- Faz: orquestra o feed — (1) pega trending+popular do `TMDBService`; (2) pega destaques do `ApacheTorrentScraper` e re-resolve no TMDB; (3) para cada mídia, busca o melhor match no `PirateBayClient` (por título/ano, ordenado por seeders); (4) normaliza tudo em `DiscoveryItemDTO`. Cacheado em Redis (`discovery`). Também expõe `getTorrentsForMedia(title, year)` cacheado (`piratebay`).
- Não faz: I/O HTTP direto (delega aos clients), serialização HTTP (é do controller).
- Depende de: `TMDBService` (reuso!), `PirateBayClient`, `ApacheTorrentScraper`.

**`DiscoveryFeedWarmupJob`** (application/discovery)
- Faz: `@Scheduled(fixedDelayString=...)` chama `DiscoveryService.getFeed()` para manter o cache quente (ADR-07).
- Não faz: servir requisições.

**`DiscoveryController`** (presentation/controller)
- Faz: expõe os endpoints da seção 8; trata exceções no padrão do `MediaController` (ResponseEntity + Map de erro). Sob `/media/v1/discovery/*` (ADR-06).
- Não faz: lógica de negócio (delega ao service).

### Desktop

**`useTorrentDiscovery`** (hook)
- Faz: carrega o feed via `apiService.getDiscoveryFeed()`; gerencia `loading/error`, filtros (categoria, gênero, ano, qualidade), paginação/"carregar mais", `viewMode` (grid/lista, persistido em localStorage no padrão de `useLibraryLeyout`), e o **fallback** (se backend offline → expõe `degraded: true` e habilita só busca manual).
- Não faz: render; download (delega ao Rust via `tauriService.interceptTorrentLink`).

**`DiscoverySection` / `DiscoveryFilters` / `TorrentPickerDialog`**
- `DiscoverySection`: renderiza a grade/lista de `StreamingCard mode="discovery"`.
- `DiscoveryFilters`: UI de filtros, controla o estado do hook.
- `TorrentPickerDialog`: se a mídia tiver >1 torrent, deixa o usuário escolher qual baixar antes de chamar `interceptTorrentLink`.

**`StreamingCard` (editado)**
- Em `mode="discovery"`: oculta play/edit/delete/hidden/watched; mostra um botão **Download** (chama `onDownload(media)`); clique no card → `onClick` (navega para detalhes).

---

## 7. Data Model

Não há novas tabelas — tudo é cache efêmero em Redis e DTOs de transporte. Modelos lógicos:

```jsonc
// ILLUSTRATIVE — reference for Neo Agent
// TorrentMatchDTO (normalizado, compartilhado entre busca manual e discovery)
{
  "id": "string",            // id do apibay
  "name": "string",          // nome do torrent
  "infoHash": "string",      // 40 hex chars; nunca "0000..."
  "seeders": 0,
  "leechers": 0,
  "sizeBytes": 0,
  "category": "string",      // código apibay (100=Filmes, 600=Séries...)
  "quality": "1080p|720p|4K|null", // inferido do name (regex)
  "addedAt": "epoch-string"
}

// DiscoveryItemDTO (mídia TMDB normalizada + torrents)
{
  "tmdbId": 0,
  "mediaType": "movie|tv",
  "title": "string",
  "originalTitle": "string|null",
  "year": 0,
  "posterPath": "string|null",     // path TMDB (desktop monta URL)
  "backdropPath": "string|null",
  "overview": "string|null",
  "voteAverage": 0.0,
  "genres": [{ "id": 0, "name": "string" }],
  "source": "trending|popular|apachetorrent",
  "torrents": [ /* TorrentMatchDTO[] — pode vir vazio e ser carregado on-demand */ ]
}

// DiscoveryFeedResponseDTO
{
  "items": [ /* DiscoveryItemDTO[] */ ],
  "page": 1,
  "totalPages": 1,
  "generatedAt": "ISO-8601",
  "partial": false   // true se alguma fonte (apache/apibay) falhou no warm-up
}
```

### Chaves de cache Redis (prefixo `critix:` já aplicado pelo config)
| Cache name | Key | TTL | Conteúdo |
|------------|-----|-----|----------|
| `discovery` | `feed:p<page>` | 30 min (warm-up a cada ~20 min) | `DiscoveryFeedResponseDTO` |
| `piratebay` | `match:<normalizedTitle>:<year>` | 15 min | `List<TorrentMatchDTO>` |
| `discovery` | `apache-highlights` | 1 h | `List<ApacheHighlightDTO>` |
| `tmdb` | `trending` / `popular:*` | 24 h (existente) | reuso, sem mudança |

> Os caches `discovery` e `piratebay` devem ser adicionados ao `RedisCacheConfig.cacheManager` (mapa `cacheConfigurations`).

---

## 8. API Contracts / Interfaces

Todos sob `/media/v1/discovery` (casa com a allowlist `/media/` do proxy — ADR-06). Erros seguem o
padrão do `MediaController` (`ResponseEntity` + `Map.of("error","message")`, status 503/500).

### GET `/media/v1/discovery/feed`
- Query: `page` (default 1), `category` (`movie|tv|all`, default all)
- 200 → `DiscoveryFeedResponseDTO`
- 503 → backend ok mas TMDB indisponível e sem cache → `{ error, message }` (desktop cai para fallback)

### GET `/media/v1/discovery/torrents`
- Query: `title` (req), `year` (opcional), `mediaType` (`movie|tv`, opcional)
- 200 → `{ "torrents": TorrentMatchDTO[] }`  (lista vazia se nada encontrado — **não** é erro)
- Usado para carregar torrents on-demand de uma mídia cujo `torrents` veio vazio no feed.

### GET `/media/v1/discovery/search`  (migração da busca manual — RF-09)
- Query: `query` (req)
- 200 → `{ "torrents": TorrentMatchDTO[] }`
- Substitui o caminho Rust→apibay quando o backend está online.

### Interfaces no Desktop (`ApiService`, illustrative)
```ts
// ILLUSTRATIVE — reference for Neo Agent
async getDiscoveryFeed(page = 1, category: "movie"|"tv"|"all" = "all"): Promise<DiscoveryFeed> {
  const p = new URLSearchParams({ page: String(page), category });
  return this.request(`/media/v1/discovery/feed?${p.toString()}`);
}
async getTorrentsForMedia(title: string, year?: number, mediaType?: "movie"|"tv"): Promise<{ torrents: TorrentMatch[] }> {
  const p = new URLSearchParams({ title });
  if (year) p.append("year", String(year));
  if (mediaType) p.append("mediaType", mediaType);
  return this.request(`/media/v1/discovery/torrents?${p.toString()}`);
}
async searchTorrentsViaBackend(query: string): Promise<{ torrents: TorrentMatch[] }> {
  return this.request(`/media/v1/discovery/search?query=${encodeURIComponent(query)}`);
}
```

### StreamingCard (assinatura nova, illustrative)
```ts
// ILLUSTRATIVE — reference for Neo Agent
interface StreamingCardProps {
  media: Media;
  mode?: "library" | "discovery";   // default "library"
  onClick?: (media: Media) => void;
  onDownload?: (media: Media) => void; // usado só em mode="discovery"
  // ...callbacks de biblioteca existentes permanecem, ignorados em discovery
}
```

---

## 9. Applied Design Patterns
- **Adapter / Anti-Corruption Layer:** `PirateBayClient` e `ApacheTorrentScraper` traduzem fontes externas instáveis para DTOs internos estáveis (`TorrentMatchDTO`, `ApacheHighlightDTO`). O resto do sistema nunca vê o shape cru.
- **Facade:** `DiscoveryService` é a fachada que esconde a orquestração de 3 fontes atrás de `getFeed()` / `getTorrentsForMedia()`.
- **Cache-Aside (declarativo):** `@Cacheable` nos métodos do `DiscoveryService`, reaproveitando o cache manager existente.
- **Strategy de resiliência (desktop):** o hook escolhe a fonte de busca (backend quando online, Rust quando offline) — comportamento isolado no `useTorrentDiscovery`.
- **Discriminated prop / variant component:** `StreamingCard` com `mode` (ADR-05).

---

## 10. Cross-Cutting Concerns
- **Erros:** Backend segue o padrão `MediaController` (ResponseEntity + Map). Desktop usa `ApiService.request` que já loga via `logger` e respeita `externalApiOnline`.
- **Logging:** Cada client externo loga sucesso/falha com duração (padrão do `TMDBClient`). Scraper loga WARN quando retorna zero itens (detector de quebra de layout).
- **Configuração:** URLs e timeouts externalizados em `application.properties` (`piratebay.api.base`, `piratebay.api.timeout`, `apachetorrent.url`, `discovery.warmup.interval`, TTLs de cache no padrão `cache.*` já existente).
- **Observabilidade:** `partial: true` no feed sinaliza degradação parcial para a UI mostrar aviso discreto.
- **i18n:** Strings de UI em pt-BR, consistentes com a tela atual.
- **Offline (RNF-01/02):** `useApiConnectivity` (já existe no desktop) define se o hook usa backend ou fallback Rust.

---

## 11. Scalability and Performance
- **Gargalo principal:** o cruzamento com PirateBay (1 request por mídia). Mitigação: cache `piratebay:match:*` (15min) + carregamento on-demand (não bloquear o feed inteiro à espera de todos os torrents) + warm-up agendado (ADR-07).
- **Budget de latência:** feed do desktop deve caber no timeout de 5s do proxy → garantido servindo cache quente. Warm-up assíncrono fora do caminho da requisição.
- **Rate limiting do apibay (RNF-06):** o backend limita a frequência de chamadas ao apibay (ex.: limitar nº de matches por warm-up, espaçar requests). Considerar `RateLimitService` (já existe no backend, usa RedisTemplate) para o proxy de busca manual.
- **Paginação:** feed paginado (`page`), cache por página. UI "carregar mais".

---

## 12. Security
- **Renderer nunca fala direto com apibay/apachetorrent** (RNF-05): tudo via backend (online) ou Rust validado (offline).
- **Download:** `intercept_torrent_link` (Rust) **permanece a única via de download** e já valida `magnet:` + `xt=urn:` — não alterar (ver `torrent.rs`).
- **SSRF / injeção:** o `query` e `title` enviados ao apibay devem ser URL-encodados e limitados em tamanho no backend. O scraper só acessa o host fixo `apachetorrent.com` (sem URL dinâmica do cliente).
- **Cache poisoning:** chaves de cache derivadas de input do usuário (`match:<title>`) devem ser normalizadas/saneadas (lowercase, trim, limite de tamanho) para evitar explosão de chaves.
- **⚠️ Encaminhar à Lawliet Agent:** revisar (1) o proxy de busca manual quanto a SSRF/abuso de rate limit, (2) a sanitização de input nas chaves de cache, (3) implicações legais/segurança do scraping de apachetorrent.com.

---

## 13. Dependencies and External Services
| Serviço | Uso | Falha → comportamento |
|---------|-----|------------------------|
| TMDB (via TMDBService/Redis) | trending, popular, detalhes, enriquecimento | TMDBClient já trata com retry/fallback; feed vazio se sem cache → 503 → UI fallback |
| apibay.org (PirateBay) | torrents para cada mídia + busca manual | falha → `torrents: []` (não quebra feed); manual cai p/ Rust se backend off |
| apachetorrent.com | destaques scrapeados | falha → `apache-highlights` vazio; feed segue só com TMDB (RNF-02) |
| Cliente BitTorrent do SO | recebe magnet (Rust) | inalterado |

---

## 14. Implementation Plan (for Neo Agent)

> Dependências entre fases são estritas: **Fase A → B → C → D**; E é paralela a C/D mas depende de A.

### Fase A — Backend: clients e DTOs estáveis (base de tudo)
- A1. Add dependência `org.jsoup:jsoup:1.20.1` no `pom.xml`.
- A2. Criar `PirateBayTorrentDTO`, `TorrentMatchDTO`, `ApacheHighlightDTO`, `DiscoveryItemDTO`, `DiscoveryFeedResponseDTO`.
- A3. Criar `PirateBayClient` (RestClient → apibay, filtra info_hash nulo, infere `quality` por regex no name).
- A4. Criar `ApacheTorrentScraper` (Jsoup, host fixo, retorna `List.of()` em falha).
- DoD: clients testáveis isoladamente; DTOs serializam para o shape da seção 7.

### Fase B — Backend: orquestração, cache e endpoints
- B1. Criar `DiscoveryService` com `@Cacheable` (`discovery`, `piratebay`); compõe TMDB + PirateBay + apache; marca `partial` quando uma fonte falha.
- B2. Editar `RedisCacheConfig` — adicionar caches `discovery` e `piratebay` com TTLs (seção 7).
- B3. Criar `DiscoveryController` (`/media/v1/discovery/feed|torrents|search`) no padrão do `MediaController`.
- B4. Criar `DiscoveryFeedWarmupJob` (`@Scheduled`) + `@EnableScheduling` se ainda não habilitado.
- B5. Externalizar config em `application.properties`.
- DoD: `GET /media/v1/discovery/feed` responde do cache em < 1s quente; endpoints retornam os contratos da seção 8.

### Fase C — Desktop: tipos e serviço
- C1. Criar `types/discovery.ts` (espelha DTOs).
- C2. Editar `services/api.ts` — `getDiscoveryFeed`, `getTorrentsForMedia`, `searchTorrentsViaBackend`.
- DoD: chamadas tipadas passam pelo proxy `/api/external` sem mudança no route handler.

### Fase D — Desktop: hook + UI
- D1. Criar `useTorrentDiscovery` (feed, filtros, paginação, viewMode persistido, fallback online/offline).
- D2. Editar `StreamingCard` — prop `mode="discovery"` + `onDownload` (ADR-05).
- D3. Criar `DiscoverySection`, `DiscoveryFilters`, `TorrentPickerDialog`.
- D4. Editar `torrent-search/page.tsx` — seção "Em Alta" (feed) acima; busca manual preservada abaixo; toggle grid/lista; navegação para detalhes ao clicar.
- DoD: RF-01..RF-08 e RF-10 verificáveis na UI; identidade visual preservada.

### Fase E — Migração da busca manual (RF-09) e resiliência
- E1. Roteamento de busca no hook: backend quando `isOnline`, `tauriService.searchTorrents` (Rust) quando offline. Normalizar ambos para `TorrentMatch`.
- E2. Garantir degradação: backend offline → feed mostra estado degradado, manual ainda funciona via Rust.
- DoD: RNF-01/02 verificáveis derrubando backend e/ou fontes externas.

---

## 15. Acceptance Criteria (for Agent Smith)
- **AC-01** Abrir a tela com backend online e cache quente exibe ≥1 card de mídia TMDB sem digitar nada (RF-01).
- **AC-02** Cada card discovery mostra **apenas** botão Download (sem play/edit/delete/watched) (RF-03, ADR-05).
- **AC-03** Clicar num card navega para a página de detalhes carregando dados via proxy TMDB (RF-06).
- **AC-04** Alternar grid↔lista muda o layout e persiste a escolha entre reloads (RF-05).
- **AC-05** Filtrar por categoria/gênero/ano/qualidade reduz o conjunto exibido coerentemente (RF-07).
- **AC-06** A busca manual por texto continua retornando resultados e permitindo download (RF-08).
- **AC-07** Com backend **offline**, a busca manual ainda funciona (via Rust) e o feed mostra estado degradado, sem tela quebrada (RNF-01).
- **AC-08** Com apachetorrent.com inacessível, o feed ainda exibe itens TMDB (`partial: true`) (RNF-02, RF-04 degradado).
- **AC-09** `GET /media/v1/discovery/feed` com cache quente responde em < 1.5s e dentro do timeout de 5s do proxy (RNF-03, ADR-07).
- **AC-10** Download dispara `intercept_torrent_link` no Rust com um magnet válido; magnet inválido é rejeitado (Segurança, seção 12).
- **AC-11** `GET /media/v1/discovery/torrents` para mídia sem torrents retorna `{ torrents: [] }` com status 200 (não erro).
- **AC-12** Nenhum componente novo duplica `StreamingCard` (inspeção: a única fonte de card é `streaming-card.tsx`) (RNF-07).

---

## 16. Out of Scope
- Gestão de downloads, fila e progresso de torrent.
- Trackers privados / autenticação de indexers.
- Persistência em banco do feed (é cache efêmero).
- Refatorar o `TMDBClient` de WebClient para RestClient (apenas o novo código usa RestClient).
- Remover `search_torrents` do Rust (mantido como fallback).

---

## 17. Risks and Open Questions
- **R-01 (alto):** Seletores CSS de apachetorrent.com são frágeis. Mitigação: isolar no `ApacheTorrentScraper`, logar WARN em parse vazio, e o feed nunca depende dele (degrada). **OQ:** confirmar a estrutura HTML real do site antes de codar os seletores (Neo deve inspecionar a página).
- **R-02 (alto):** apibay.org pode banir por excesso de requisições (1 por mídia). Mitigação: cache + warm-up espaçado + rate limit (RNF-06). **OQ:** qual o nº máximo de mídias por warm-up aceitável?
- **R-03 (médio):** Timeout de 5s do proxy do desktop vs. feed frio. Mitigação: warm-up agendado (ADR-07). **OQ:** intervalo do `@Scheduled` (sugestão: 20min) e TTL do cache `discovery` (sugestão: 30min) precisam ser confirmados pelo dono.
- **R-04 (médio):** Matching TMDB↔PirateBay por título/ano é impreciso (releases com nomes "sujos"). Mitigação: usar normalização (já existe via Gemini no `postSearchMedia`) e ordenar por seeders. **OQ:** aceitamos custo de IA (Gemini) no caminho de matching ou só regex?
- **R-05 (legal/segurança):** Scraping + indexação de torrents tem implicações. **Encaminhar à Lawliet Agent** (seção 12).
- **OQ-06:** O feed deve misturar filmes e séries por padrão, ou separar em duas trilhas ("Filmes em alta" / "Séries em alta")? O design atual mistura com filtro de categoria — confirmar preferência.

---

## Handoff
- Generated artifact:  docs/blueprints/The-Blueprint-001.md
  (caminho absoluto: /mnt/e/WorkSpace/PESONAL_PROJECTS/CRITIX/critix_vault_desktop/docs/blueprints/The-Blueprint-001.md)
- Status:              Awaiting approval
- Next agent:          Neo Agent (implementation)
- Required action:     Revisar e aprovar este Blueprint. Após aprovação, invocar o Neo Agent para
                       implementar o Plano de Implementação (seção 14), começando pela Fase A.
- Notes:               Decisões de alto impacto que precisam de sua confirmação antes da Fase A:
                       OQ-03 (intervalos de warm-up/TTL), OQ-04 (usar Gemini no matching?),
                       OQ-06 (misturar ou separar filmes/séries). Partes de segurança/legais
                       (scraping, proxy de busca, sanitização de chaves de cache) devem passar
                       pela Lawliet Agent antes de ir para produção.
```
