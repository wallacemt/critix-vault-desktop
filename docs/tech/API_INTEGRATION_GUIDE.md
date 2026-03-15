# 🚀 Migração JSON → SQLite - Guia de Integração

## 📋 Resumo das Alterações

Esta migração move o armazenamento de dados do **JSON** (via Tauri) para **SQLite** (via Prisma) e substitui Server Actions por **API Routes HTTP**.

---

## ✅ Correções Aplicadas

### 1. **appDataDir Corrigido**

**Problema**: `app.appDataDir()` não existe na API do Tauri

**Solução**: Usar o comando Tauri existente `get_data_directory`

```typescript
// ANTES (❌ Incorreto)
import { app } from '@tauri-apps/api'
const appDataDir = await app.appDataDir()

// DEPOIS (✅ Correto)
import { invoke } from '@tauri-apps/api/core'
const appDataDir = await invoke<string>('get_data_directory')
```

**Arquivos corrigidos**:
- ✅ [src/lib/prisma.ts](src/lib/prisma.ts)
- ✅ [src/lib/migrate-from-json.ts](src/lib/migrate-from-json.ts)

### 2. **Banco Salva na Mesma Pasta do JSON**

O banco SQLite agora é salvo no **mesmo diretório** onde os arquivos JSON eram salvos:

```
Windows: C:\Users\{user}\AppData\Roaming\critix-vault\critix.db
macOS:   ~/Library/Application Support/critix-vault/critix.db
Linux:   ~/.local/share/critix-vault/critix.db
```

---

## 🌐 Nova Arquitetura: API Routes (HTTP)

### Estrutura Antiga (Server Actions)
```
src/app/actions/
  ├── folders.ts      ('use server')
  ├── media.ts        ('use server')
  └── watchHistory.ts ('use server')
```

### Estrutura Nova (API Routes) ✅
```
src/app/api/
  ├── folders/route.ts        (GET, POST, DELETE, PATCH)
  ├── movies/route.ts         (GET, POST, DELETE)
  ├── series/route.ts         (GET, POST, DELETE)
  └── watch-history/route.ts  (GET, POST, DELETE)
```

---

## 📡 Endpoints da API

### **Folders API** (`/api/folders`)

```typescript
// GET: Listar todas as pastas
fetch('/api/folders')

// POST: Adicionar pasta
fetch('/api/folders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: '/path/to/folder', name: 'My Folder' })
})

// DELETE: Remover pasta (cascade deleta mídias)
fetch('/api/folders?id={folderId}', { method: 'DELETE' })

// PATCH: Atualizar contagem de mídias
fetch('/api/folders', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ folderId: 'abc' })
})
```

### **Movies API** (`/api/movies`)

```typescript
// GET: Listar filmes (opcionalmente filtrar por pasta)
fetch('/api/movies')
fetch('/api/movies?folderId={folderId}')

// POST: Salvar filmes (bulk upsert)
fetch('/api/movies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify([movie1, movie2, ...])
})

// DELETE: Remover filme
fetch('/api/movies?id={movieId}', { method: 'DELETE' })
```

### **Series API** (`/api/series`)

```typescript
// GET: Listar séries com temporadas e episódios
fetch('/api/series')
fetch('/api/series?folderId={folderId}')

// POST: Salvar séries (bulk upsert com seasons e episodes)
fetch('/api/series', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify([series1, series2, ...])
})

// DELETE: Remover série (cascade deleta seasons e episodes)
fetch('/api/series?id={seriesId}', { method: 'DELETE' })
```

### **Watch History API** (`/api/watch-history`)

```typescript
// GET: Buscar histórico
fetch('/api/watch-history')                      // Últimos 100
fetch('/api/watch-history?mediaId={mediaId}')    // De uma mídia
fetch('/api/watch-history?limit=10')             // Limitar resultados

// POST: Adicionar/atualizar histórico
fetch('/api/watch-history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mediaId: 'abc',
    mediaType: 'MOVIE',
    progress: 75,
    completed: false
  })
})

// DELETE: Limpar histórico de uma mídia
fetch('/api/watch-history?mediaId={mediaId}', { method: 'DELETE' })
```

---

## 🛠️ Serviço Frontend

Criamos um serviço que encapsula todas as chamadas HTTP:

```typescript
// src/services/databaseService.ts

import { getFolders, addFolder, removeFolder } from '@/services/databaseService'
import { getMovies, saveMovies, removeMovie } from '@/services/databaseService'
import { getSeries, saveSeries, removeSeries } from '@/services/databaseService'
import { addWatchHistory, markAsWatched } from '@/services/databaseService'

// Exemplo de uso
const folders = await getFolders()
await addFolder('/path', 'My Folder')

const movies = await getMovies()
await saveMovies([movie1, movie2])

await markAsWatched('movieId', 'MOVIE')
```

---

## 🔄 Como Integrar no Sistema

### **1. Criar o Banco de Dados**

```bash
cd critix_vault_desktop
npx prisma migrate dev --name init
```

Isso vai:
- Criar `prisma/migrations/` com a migration inicial
- Criar o arquivo `critix.db` no diretório de dados do app
- Aplicar o schema ao banco

### **2. Executar a Migração de Dados**

Acesse no app: **`http://localhost:3000/migration`**

Ou use a função diretamente:

```typescript
import { migrateFromJSON, verifyMigration } from '@/lib/migrate-from-json'

// Migrar dados
const result = await migrateFromJSON()
console.log(`✅ Migrated ${result.details.movies} movies, ${result.details.series} series`)

// Verificar integridade
const verify = await verifyMigration()
if (verify.success) {
  console.log('✅ All data migrated correctly')
} else {
  console.error('⚠️ Issues found:', verify.issues)
}
```

### **3. Substituir Chamadas Tauri por API Calls**

**Exemplo 1: Hooks de Folders**

```typescript
// ANTES (Tauri)
import { invoke } from '@tauri-apps/api/core'
const folders = await invoke<Folder[]>('get_folders')

// DEPOIS (API)
import { getFolders } from '@/services/databaseService'
const folders = await getFolders()
```

**Exemplo 2: Salvar Filmes**

```typescript
// ANTES (Tauri)
await invoke('save_movies', { movies })

// DEPOIS (API)
import { saveMovies } from '@/services/databaseService'
await saveMovies(movies)
```

**Exemplo 3: Deletar Série**

```typescript
// ANTES (Tauri)
await invoke('remove_series', { seriesId })

// DEPOIS (API)
import { removeSeries } from '@/services/databaseService'
await removeSeries(seriesId)
```

### **4. Atualizar Hooks**

**useFolders.ts**:
```typescript
import { getFolders, addFolder, removeFolder } from '@/services/databaseService'

export function useFolders() {
  // ...
  const loadFolders = async () => {
    const data = await getFolders()
    setFolders(data)
  }
  
  const handleAddFolder = async (path: string, name: string) => {
    await addFolder(path, name)
    await loadFolders()
  }
  // ...
}
```

**useMediaLibrary.ts**:
```typescript
import { getMovies, saveMovies, getSeries, saveSeries } from '@/services/databaseService'

export function useMediaLibrary() {
  // ...
  const loadMedia = async (folderId?: string) => {
    const [movies, series] = await Promise.all([
      getMovies(folderId),
      getSeries(folderId)
    ])
    setMovies(movies)
    setSeries(series)
  }
  // ...
}
```

### **5. Atualizar folderScanService**

```typescript
// src/services/folderScanService.ts

import { saveMovies, saveSeries, updateFolderMediaCount } from '@/services/databaseService'

class FolderScanService {
  async scanFolder(folderPath: string, folderId: string) {
    // ... lógica de scan
    
    // Salvar resultados
    await saveMovies(movies)
    await saveSeries(series)
    
    // Atualizar contador
    await updateFolderMediaCount(folderId)
  }
}
```

---

## 📦 Dependências

Certifique-se de que estas dependências estão instaladas:

```json
{
  "dependencies": {
    "@prisma/client": "^7.4.0",
    "@prisma/adapter-better-sqlite3": "^7.4.0",
    "better-sqlite3": "^11.8.1"
  },
  "devDependencies": {
    "prisma": "^7.4.0"
  }
}
```

---

## 🧪 Testando a Integração

### 1. **Verificar Conexão do Banco**

```typescript
import { prisma } from '@/lib/prisma'

const db = await prisma
const folders = await db.folder.findMany()
console.log('✅ Database connected:', folders.length, 'folders')
```

### 2. **Testar API Endpoints**

```bash
# Listar folders
curl http://localhost:3000/api/folders

# Adicionar folder
curl -X POST http://localhost:3000/api/folders \
  -H "Content-Type: application/json" \
  -d '{"path":"/test", "name":"Test Folder"}'

# Listar movies
curl http://localhost:3000/api/movies

# Listar series
curl http://localhost:3000/api/series
```

### 3. **Testar Migração**

1. Acesse `http://localhost:3000/migration`
2. Clique em "Start Migration"
3. Aguarde conclusão
4. Clique em "Verify Migration"
5. Verifique se todos os dados foram migrados

---

## 🔍 Troubleshooting

### Erro: "Failed to get data directory"

**Causa**: Tauri não conseguiu obter o diretório de dados

**Solução**: Verifique que o comando `get_data_directory` existe no Rust backend:

```rust
// src-tauri/src/commands/data.rs
#[tauri::command]
pub fn get_data_directory() -> Result<String, String> {
    // ...
}
```

### Erro: "Table does not exist"

**Causa**: Banco de dados não foi criado

**Solução**: Execute a migration:

```bash
npx prisma migrate dev --name init
```

### Erro: "Failed to connect to database"

**Causa**: Caminho do banco incorreto ou permissões

**Solução**: Verifique logs:

```typescript
const dbPath = await getDbPath()
console.log('📦 Database path:', dbPath)
```

Certifique-se de que o diretório existe e tem permissões de escrita.

---

## ✅ Checklist de Integração

- [x] ✅ Corrigir `appDataDir` → `invoke('get_data_directory')`
- [x] ✅ Criar API Routes (`/api/folders`, `/api/movies`, `/api/series`, `/api/watch-history`)
- [x] ✅ Criar `databaseService.ts` com funções HTTP
- [ ] ⏳ Executar `npx prisma migrate dev --name init`
- [ ] ⏳ Executar migração de dados JSON → SQLite
- [ ] ⏳ Atualizar `useFolders.ts` para usar `databaseService`
- [ ] ⏳ Atualizar `useMediaLibrary.ts` para usar `databaseService`
- [ ] ⏳ Atualizar `folderScanService.ts` para usar `databaseService`
- [ ] ⏳ Atualizar componentes que chamam Tauri diretamente
- [ ] ⏳ Testar CRUD de pastas
- [ ] ⏳ Testar scan e salvar mídias
- [ ] ⏳ Testar delete com cascade
- [ ] ⏳ Testar watch history
- [ ] ⏳ Remover imports de `/app/actions` (não mais necessários)
- [ ] ⏳ (Opcional) Remover comandos Tauri de storage do Rust

---

## 🎯 Próximos Passos

1. **Executar migration**: `npx prisma migrate dev --name init`
2. **Testar API**: Use Postman ou curl para testar endpoints
3. **Migrar dados**: Acesse `/migration` e execute
4. **Atualizar hooks**: Substituir `invoke()` por `databaseService`
5. **Testar app**: Verificar que tudo funciona
6. **Deploy**: Quando estiver ok, fazer commit

---

**Última atualização**: Agora  
**Autor**: GitHub Copilot  
**Status**: ✅ Pronto para integração
