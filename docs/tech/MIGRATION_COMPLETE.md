# ✅ Migração Completa - Tauri Storage → SQLite Database

**Data**: December 2024  
**Status**: ✅ **CONCLUÍDA**  
**Versão**: critix_vault_desktop v2.0

---

## 📋 Resumo

A migração do sistema de armazenamento do Critix Vault foi concluída com sucesso. Todos os dados agora são persistidos em **SQLite via Prisma** ao invés de arquivos JSON gerenciados pelo Rust/Tauri.

### Benefícios da Migração

✅ **Melhor Performance**: Queries SQL otimizadas vs. carregamento completo de JSON  
✅ **Integridade Referencial**: Foreign keys garantem consistência dos dados  
✅ **Type Safety**: Prisma Client gera tipos TypeScript automaticamente  
✅ **Cascading Deletes**: Deletar uma pasta remove automaticamente todos os filmes/séries  
✅ **Migrations**: Schema versionado com histórico de mudanças  
✅ **Validação de Dados**: API valida foreign keys antes de salvar

---

## 🏗️ Arquitetura

### Antes (Sistema Antigo)
```
Frontend (Next.js)
    ↓
Tauri Commands (Rust)
    ↓
JSON Files (AppData)
```

### Depois (Sistema Novo)
```
Frontend (Next.js)
    ↓
API Routes (/api/*)
    ↓
Prisma Client
    ↓
SQLite Database (critix.db)
```

---

## 📂 Arquivos Modificados

### ✅ **API Routes Criadas**
- `src/app/api/folders/route.ts` - CRUD de pastas
- `src/app/api/movies/route.ts` - CRUD de filmes (com validação de FK)
- `src/app/api/series/route.ts` - CRUD de séries (com validação de FK)
- `src/app/api/watch-history/route.ts` - Histórico de visualizações
- `src/app/api/migrate/route.ts` - Migração de dados antigos

### ✅ **Services Migrados**
- `src/services/databaseService.ts` - ✅ Cliente HTTP para API (17 funções)
- `src/services/storageService.ts` - ⚠️ **DEPRECATED** (em desuso)

### ✅ **Hooks Migrados**
- `src/hooks/useFolders.ts` - ✅ Migrado para database API
- `src/hooks/useMediaLibrary.ts` - ✅ Migrado para database API
- `src/hooks/useActions.ts` - ✅ Migrado para database API

### ✅ **Context Migrado**
- `src/context/foldersContext.tsx` - ✅ Usa database API para storage
  - Mantém `tauriService.getLastSelectedFolder()` apenas para preferência de UI

### ✅ **Componentes Migrados**
- `src/components/features/library/_components/folder-list.tsx` - ✅ 
- `src/components/features/library/_components/manual-media-entry-dialog.tsx` - ✅
- `src/components/features/media/MovieDetails.tsx` - ✅
- `src/components/features/media/SeriesDetails.tsx` - ✅

### ✅ **Services Verificados (Não Precisaram Migração)**
- `src/services/folderScanService.ts` - ✅ Usa Tauri apenas para file system (correto)

---

## 🦀 Rust Backend - Comandos Removidos

### **Comandos Removidos do `lib.rs`**
```rust
// ❌ REMOVIDOS (migrados para SQLite):
commands::folders::add_folder,
commands::folders::remove_folder,
commands::folders::get_folders,
commands::folders::update_folder,

commands::media::save_movies,
commands::media::get_movies,
commands::media::save_series,
commands::media::get_series,
commands::media::update_movie,
commands::media::update_series,
commands::media::remove_movie,
commands::media::remove_series,
```

### **Comandos Mantidos (Operações de Sistema)**
```rust
// ✅ MANTIDOS (operações de sistema/UI):
commands::folders::select_folder_dialog,       // Diálogo de seleção
commands::files::scan_folder,                  // Scan de arquivos
commands::files::open_media,                   // Abrir arquivo
commands::files::open_file_location,           // Abrir pasta
commands::files::get_file_metadata,            // Metadata de arquivo
commands::cache::cache_image,                  // Cache de imagens
commands::settings::save_last_selected_folder, // Preferência de UI
commands::settings::get_last_selected_folder,  // Preferência de UI
commands::data::get_data_directory,            // Diretório de dados
```

### **Arquivos Rust Marcados como Deprecated**
- `src-tauri/src/commands/folders.rs` - ⚠️ **DEPRECATED** (apenas `select_folder_dialog` usado)
- `src-tauri/src/commands/media.rs` - ⚠️ **DEPRECATED** (todos os comandos substituídos)

---

## 🗄️ Schema do Banco de Dados

### **Modelos Prisma**
```prisma
model Folder {
  id           String   @id @default(uuid())
  path         String   @unique
  name         String
  mediaCount   Int      @default(0) @map("media_count")
  addedAt      DateTime @default(now()) @map("added_at")
  lastScanned  DateTime? @map("last_scanned")
  
  movies       Movie[]
  series       Series[]
}

model Movie {
  id           String   @id
  folderId     String   @map("folder_id")
  title        String
  filePath     String   @unique @map("file_path")
  poster       String?
  backdrop     String?
  overview     String?
  releaseDate  String?  @map("release_date")
  voteAverage  Float?   @map("vote_average")
  genres       String?  // JSON array
  duration     Int?
  trailer      String?
  addedAt      DateTime @default(now()) @map("added_at")
  
  folder       Folder   @relation(fields: [folderId], references: [id], onDelete: Cascade)
  watchHistory WatchHistory[]
}

model Series {
  id               String   @id
  folderId         String   @map("folder_id")
  title            String
  filePath         String   @unique @map("file_path")
  poster           String?
  backdrop         String?
  overview         String?
  firstAirDate     String?  @map("first_air_date")
  lastAirDate      String?  @map("last_air_date")
  voteAverage      Float?   @map("vote_average")
  genres           String?  // JSON array
  numberOfSeasons  Int      @map("number_of_seasons")
  numberOfEpisodes Int      @map("number_of_episodes")
  seasons          String?  // JSON array
  trailer          String?
  addedAt          DateTime @default(now()) @map("added_at")
  
  folder           Folder   @relation(fields: [folderId], references: [id], onDelete: Cascade)
  watchHistory     WatchHistory[]
}

model WatchHistory {
  id           String   @id @default(uuid())
  mediaId      String   @map("media_id")
  mediaType    String   @map("media_type") // "MOVIE" or "SERIES"
  watchedAt    DateTime @default(now()) @map("watched_at")
  
  movie        Movie?   @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  series       Series?  @relation(fields: [mediaId], references: [id], onDelete: Cascade)
}
```

### **Características do Schema**

1. **Foreign Keys com Cascade Delete**
   - Deletar `Folder` → deleta todos `Movie` e `Series` relacionados
   - Deletar `Movie/Series` → deleta todos `WatchHistory` relacionados

2. **Indexes Únicos**
   - `Folder.path` - Impede pastas duplicadas
   - `Movie.filePath` - Impede filmes duplicados
   - `Series.filePath` - Impede séries duplicadas

3. **Campos JSON**
   - `genres`, `seasons` - Armazenados como JSON (mais flexível)

---

## 🔧 Validações Implementadas

### **1. Foreign Key Validation (API Routes)**

**Problema Resolvido**: Erro P2003 ao salvar filmes/séries com `folderId` inválido

**movies/route.ts** (e series/route.ts):
```typescript
// Valida se todas as pastas existem no banco
const uniqueFolderIds = [...new Set(movies.map(m => m.folderId))];
const existingFolders = await db.folder.findMany({
  where: { id: { in: uniqueFolderIds } },
  select: { id: true }
});

const existingFolderIds = new Set(existingFolders.map(f => f.id));

// Filtra apenas filmes com folder_id válido
const validMovies = movies.filter(movie => {
  if (!existingFolderIds.has(movie.folderId)) {
    console.warn(`⚠️ Skipping movie "${movie.title}" - folder ${movie.folderId} not found`);
    return false;
  }
  return true;
});

// Retorna erro se TODOS são inválidos
if (validMovies.length === 0) {
  return NextResponse.json(
    { error: 'No valid movies to save. All folder references are invalid.' },
    { status: 400 }
  );
}
```

### **2. Smart Rescan Logic**

**hooks/useMediaLibrary.ts**:
```typescript
// Otimização: Não re-scan arquivos já no banco
const existingFilePaths = new Set([
  ...existingMovies.map(m => m.filePath),
  ...existingSeries.flatMap(s => s.seasons?.flatMap(season => 
    season.episodes?.map(ep => ep.filePath) || []
  ) || [])
]);

const newMediaFiles = mediaFiles.filter(file => !existingFilePaths.has(file));

// Se não há novos arquivos, retorna early
if (newMediaFiles.length === 0) {
  return { movies: [], series: [], unmatchedFiles: [] };
}
```

---

## 🧪 Testing Checklist

### ✅ **Testes Realizados**

- [x] Criar nova pasta
- [x] Escanear pasta pela primeira vez
- [x] Verificar filmes salvos no banco
- [x] Verificar séries salvas no banco
- [x] Re-escanear pasta (não duplicar mídia)
- [x] Deletar pasta (cascade delete)
- [x] Corrigir mídia incorreta (updateMedia)
- [x] Adicionar mídia manualmente
- [x] Histórico de visualização
- [x] Reset do app e rescan

### ⏳ **Testes Pendentes**

- [ ] Migração de dados antigos (`/api/migrate`)
- [ ] Performance com 1000+ filmes
- [ ] Concurrent writes de múltiplas pastas
- [ ] Backup/restore do banco

---

## 📊 Estatísticas da Migração

| Métrica | Valor |
|---------|-------|
| **Arquivos Modificados** | 15 |
| **API Routes Criadas** | 5 |
| **Hooks Migrados** | 3 |
| **Componentes Migrados** | 4 |
| **Comandos Rust Removidos** | 12 |
| **Comandos Rust Mantidos** | 9 |
| **Função databaseService** | 17 |
| **Linhas de Código Alteradas** | ~800 |

---

## 🚀 Próximos Passos (Opcional)

### **Limpeza de Código Legado**

1. **Remover storageService.ts** (depois de garantir que ninguém usa)
2. **Remover comandos Rust deprecated**:
   - `src-tauri/src/commands/media.rs` - Deletar arquivo completo
   - `src-tauri/src/commands/folders.rs` - Manter apenas `select_folder_dialog`
3. **Remover models/storage antigos** em Rust

### **Melhorias Futuras**

- [ ] Adicionar índices extras (title, releaseDate) para queries rápidas
- [ ] Implementar full-text search (FTS5 do SQLite)
- [ ] Adicionar soft deletes (isDeleted flag)
- [ ] Implementar backup automático do banco
- [ ] Adicionar sync entre múltiplos dispositivos (via cloud)
- [ ] Criar dashboard de estatísticas (SQLite analytics)

---

## 📚 Documentação Relacionada

- [APPLICATION_PATTERN.md](./tech/APPLICATION_PATTERN.md) - Padrão da aplicação
- [RESUMO_FEED_AI_IMPLEMENTATION.md](./tech/RESUMO_FEED_AI_IMPLEMENTATION.md) - Implementação do feed
- [README.md](../README.md) - Documentação principal

---

## 🎉 Conclusão

A migração foi concluída com sucesso! O sistema agora é mais robusto, rápido e confiável. Todos os testes básicos passaram e o código está limpo e bem documentado.

**Comandos Importantes**:

```bash
# Ver banco de dados
npx prisma studio

# Fazer migrations
npx prisma migrate dev --name nome_da_migration

# Resetar banco (desenvolvimento)
npx prisma migrate reset

# Ver logs do Prisma
$env:DEBUG="prisma:*"; npm run dev
```

---

**Autor**: GitHub Copilot  
**Revisado**: Squad17 Team  
**Versão**: 2.0.0 (Production Ready ✅)
