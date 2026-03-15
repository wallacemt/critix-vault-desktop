# Correção: Gêneros e Dados TMDB Completos

**Data**: 15 de Fevereiro de 2026

---

## 🎯 Problema Identificado

Os gêneros das mídias não estavam sendo capturados e salvos no banco local durante o scan de pastas.

### Causa Raiz:

1. **Backend**: Não estava solicitando `credits` e `videos` do TMDB
2. **Frontend**: Não estava extraindo o campo `genres` (e outros campos TMDB) durante a transformação dos dados

---

## ✅ Correções Implementadas

### **Backend (Spring Boot)**

#### 1. **Atualização do TMDBClient**

[TMDBClient.java](../../../critix_backend/src/main/java/com/br/critix/infra/clients/tmdb/TMDBClient.java)

```java
// ANTES
String uri = String.format("/%s/%d?language=pt-BR", mediaType, mediaId);

// DEPOIS
String uri = String.format("/%s/%d?language=pt-BR&append_to_response=credits,videos", mediaType, mediaId);
```

**Mudança**: Adicionado `append_to_response=credits,videos` para obter elenco, equipe técnica e vídeos em uma única requisição.

---

#### 2. **Novos DTOs Criados**

**a) Credits.java** - Elenco e Equipe Técnica

```java
public class Credits {
    private Cast[] cast;
    private Crew[] crew;
}

class Cast {
    private Integer id;
    private String name;
    private String character;
    private String profile_path;
    private Integer order;
    // ... outros campos
}

class Crew {
    private Integer id;
    private String name;
    private String job;
    private String department;
    private String profile_path;
    // ... outros campos
}
```

**b) Videos.java** - Trailers e Vídeos

```java
public class Videos {
    private VideoResult[] results;
}

class VideoResult {
    private String id;
    private String key;
    private String name;
    private String type;
    private String site;
    private Boolean official;
    // ... outros campos
}
```

---

#### 3. **Atualização dos DTOs de Detalhes**

**TMDBMediaMovieDetails.java** e **TMDBMediaTvDetails.java**

```java
// Campos adicionados
private Credits credits;
private Videos videos;
```

---

### **Frontend (Next.js + TypeScript)**

#### 1. **FolderScanService - Extração Completa de Dados TMDB**

[folderScanService.ts](../../../critix_vault_desktop/src/services/folderScanService.ts)

**Função `transformApiResponse()` - Para Filmes**

```typescript
// Extract genres from TMDB data
const genres = apiData.genres?.map((g: any) => g.name) || [];

// Extract extended TMDB fields
const imdbId = apiData.imdb_id || undefined;
const tagline = apiData.tagline || undefined;
const budget = apiData.budget || undefined;
const revenue = apiData.revenue || undefined;
const voteCount = apiData.vote_count || undefined;
const popularity = apiData.popularity || undefined;

// Extract images (backdrops and posters)
const images: string[] = [];
if (apiData.backdrop_path) images.push(`https://image.tmdb.org/t/p/original${apiData.backdrop_path}`);
if (apiData.poster_path) images.push(`https://image.tmdb.org/t/p/w500${apiData.poster_path}`);

// Extract videos
const videos =
  apiData.videos?.results?.map((v: any) => ({
    id: v.id,
    key: v.key,
    name: v.name,
    type: v.type,
    site: v.site,
    official: v.official,
  })) || [];

// Extract cast and crew
const cast =
  apiData.credits?.cast?.slice(0, 20).map((c: any) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
    order: c.order,
  })) || [];

const crew =
  apiData.credits?.crew
    ?.filter((c: any) => c.job === "Director" || c.job === "Producer" || c.job === "Writer")
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
      profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : undefined,
    })) || [];

const baseInfo = {
  // ... outros campos
  genres,
  imdbId,
  tagline,
  budget,
  revenue,
  voteCount,
  popularity,
  images,
  videos,
  cast,
  crew,
};
```

**Função `transformToSeriesWithEpisodes()` - Para Séries**

```typescript
// Extract genres from TMDB data
const genres = apiData.genres?.map((g: any) => g.name) || [];

// Extract extended TMDB fields for series
const imdbId = apiData.imdb_id || undefined;
const tagline = apiData.tagline || undefined;
const voteCount = apiData.vote_count || undefined;
const popularity = apiData.popularity || undefined;

// Extract networks and production companies
const networks = apiData.networks?.map((n: any) => n.name) || [];
const productionCompanies = apiData.production_companies?.map((p: any) => p.name) || [];

// Extract images, videos, cast, crew (mesma lógica dos filmes)
// ...

return {
  // ... outros campos
  genres,
  imdbId,
  tagline,
  voteCount,
  popularity,
  networks,
  productionCompanies,
  images,
  videos,
  cast,
  crew,
} as Series;
```

---

## 📊 Dados TMDB Agora Capturados

| Campo                   | Tipo          | Descrição                              |
| ----------------------- | ------------- | -------------------------------------- |
| **genres**              | `string[]`    | Nomes dos gêneros (Action, Drama, etc) |
| **imdbId**              | `string?`     | ID do IMDb                             |
| **tagline**             | `string?`     | Tagline do filme/série                 |
| **budget**              | `number?`     | Orçamento (apenas filmes)              |
| **revenue**             | `number?`     | Bilheteria (apenas filmes)             |
| **voteCount**           | `number?`     | Quantidade de votos                    |
| **popularity**          | `number?`     | Popularidade no TMDB                   |
| **networks**            | `string[]?`   | Redes de TV (apenas séries)            |
| **productionCompanies** | `string[]?`   | Produtoras (apenas séries)             |
| **images**              | `string[]`    | URLs de imagens                        |
| **videos**              | `TMDBVideo[]` | Trailers e clipes                      |
| **cast**                | `TMDBCast[]`  | Elenco (top 20)                        |
| **crew**                | `TMDBCrew[]`  | Equipe (Diretor, Produtor, Roteirista) |

---

## 🔄 Fluxo de Dados Atualizado

```
1. Usuário escaneia pasta
   ↓
2. folderScanService.scanAndMatchFolder()
   ↓
3. Para cada mídia:
   - Chama apiService.searchMediaByTitle(query)
   ↓
4. Backend (Spring):
   - TMDBService.postSearchMedia()
   - TMDBClient.search() → Busca inicial
   - TMDBClient.getMediaDetails() → Busca detalhes
     ↓ (com append_to_response=credits,videos)
   - Retorna TMDBMediaMovieDetails ou TMDBMediaTvDetails
   ↓
5. Frontend:
   - transformApiResponse() ou transformToSeriesWithEpisodes()
   - Extrai TODOS os campos (genres, cast, crew, videos, etc)
   - Cria objeto Movie ou Series completo
   ↓
6. databaseService.saveMovies() ou saveSeries()
   ↓
7. Dados salvos no banco Prisma SQLite
   ↓
8. UI renderiza badges de gêneros, pode mostrar elenco, trailers, etc
```

---

## 🧪 Como Testar

### 1. **Testar Backend**

```bash
cd critix_backend
./mvnw spring-boot:run
```

Testar endpoint:

```bash
curl "http://localhost:8080/media/v1/search/title?query=Inception"
```

**Verificar** que a resposta contém:

- `genres[]` com nomes dos gêneros
- `credits.cast[]` com elenco
- `credits.crew[]` com equipe técnica
- `videos.results[]` com trailers

---

### 2. **Testar Frontend**

```bash
cd critix_vault_desktop
npm run dev
```

**Passos**:

1. Abrir aplicativo
2. Adicionar/Rescanear uma pasta com filmes
3. Verificar no console do app:
   - Logs mostrando `genres: ["Action", "Sci-Fi"]`
   - Dados de cast e crew sendo extraídos
4. Inspecionar banco de dados:

```bash
npx prisma studio
```

5. Verificar que campo `genres` está populado (JSON array)

---

### 3. **Verificar UI**

- **Cards de Mídia**: Devem exibir badges de gêneros
- **Tela de Detalhes**: Deve mostrar gêneros e tagline
- Dados disponíveis para futuras features (galeria, trailers, elenco)

---

## 📁 Arquivos Modificados

### Backend

- ✅ `TMDBClient.java` - Adicionado append_to_response
- ✅ `TMDBMediaMovieDetails.java` - Campos credits e videos
- ✅ `TMDBMediaTvDetails.java` - Campos credits e videos
- ✅ `Credits.java` - **NOVO** DTO para elenco e equipe
- ✅ `Videos.java` - **NOVO** DTO para vídeos

### Frontend

- ✅ `folderScanService.ts` - Extração completa de dados TMDB
- ✅ `types/index.ts` - Interfaces com novos campos (já existente)
- ✅ `streaming-card.tsx` - Renderização de badges de gêneros (já existente)
- ✅ `MovieDetails.tsx` - Renderização de gêneros e tagline (já existente)

---

## ✅ Status

**Backend**: ✅ Pronto  
**Frontend**: ✅ Pronto  
**Integração**: ✅ Completa  
**Testes**: ⏳ Aguardando validação

---

## 🚀 Próximos Passos

Agora que os dados estão sendo capturados corretamente, podemos implementar:

1. **Galeria de Imagens** - Carrossel com imagens do TMDB
2. **Modal de Trailers** - Player de vídeos do YouTube
3. **Seção de Elenco** - Grid com fotos e personagens
4. **Filtro por Gêneros** - Filtrar biblioteca por gêneros
5. **Estatísticas** - Dashboard com gráficos por gênero, ano, etc

---

**Desenvolvido em**: 15 de Fevereiro de 2026  
**Status**: ✅ Aguardando aprovação para testes
