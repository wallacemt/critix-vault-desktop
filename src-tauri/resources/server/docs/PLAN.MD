# PLAN.MD - Critix Vault Development Plan

## 🎯 Objetivos das Tasks

1. Integrar Sidebar do ShadCN na interface da biblioteca
2. Corrigir lógica de matching de episódios ao trocar séries
3. Implementar edição manual de configurações de séries
4. Adicionar sistema de histórico de mídias assistidas
5. Implementar abertura de pasta da mídia no explorer

---

## 📋 Tasks Detalhadas

### Task 1: Integração da Sidebar do ShadCN

**Prioridade:** Alta  
**Estimativa:** 2-3 horas  
**Arquivos afetados:**
- `src/components/features/library/LibraryLayout.tsx`
- `src/components/ui/sidebar.tsx` (novo)
- `src/app/globals.css` (atualização)

#### Contexto

Atualmente, a biblioteca usa uma sidebar customizada. Precisamos migrar para o componente Sidebar do ShadCN UI para maior consistência, acessibilidade e manutenibilidade.

#### Requisitos Funcionais

1. **Substituir sidebar atual pelo componente ShadCN**
   - Manter todas as funcionalidades existentes
   - Preservar lista de pastas monitoradas
   - Manter botões de adicionar/remover pasta
   - Manter stats footer (contador de filmes/séries)

2. **Estrutura esperada do componente**
   ```tsx
   <SidebarProvider>
     <Sidebar>
       <SidebarHeader>
         {/* Logo e título */}
       </SidebarHeader>
       <SidebarContent>
         {/* Lista de pastas */}
       </SidebarContent>
       <SidebarFooter>
         {/* Stats e botões de ação */}
       </SidebarFooter>
     </Sidebar>
     <SidebarInset>
       {/* Conteúdo principal */}
     </SidebarInset>
   </SidebarProvider>
   ```

3. **Características visuais**
   - Manter tema dark atual
   - Preservar animações de hover
   - Manter indicador visual de pasta selecionada
   - Responsividade: colapsável em telas menores

#### Passos de Implementação

1. **Instalar componentes ShadCN necessários**
   ```bash
   npx shadcn@latest add sidebar
   ```

2. **Criar novo arquivo `src/components/ui/sidebar.tsx`**
   - Copiar componente gerado pelo ShadCN
   - Customizar cores para tema do app (variáveis CSS)

3. **Refatorar `LibraryLayout.tsx`**
   - Importar componentes do Sidebar
   - Migrar conteúdo da sidebar antiga
   - Ajustar estilos para compatibilidade
   - Testar responsividade

4. **Atualizar `globals.css`**
   - Adicionar variáveis CSS específicas do Sidebar
   - Ajustar cores para modo escuro
   - Garantir consistência visual

#### Critérios de Aceitação

- [ ] Sidebar usa componentes ShadCN
- [ ] Todas funcionalidades preservadas
- [ ] Animações funcionando
- [ ] Responsivo e colapsável
- [ ] Tema escuro consistente
- [ ] Sem erros de TypeScript
- [ ] Sem warnings no console

---

### Task 2: Correção da Lógica de Matching de Episódios ao Trocar Séries

**Prioridade:** Crítica  
**Estimativa:** 3-4 horas  
**Arquivos afetados:**
- `src/services/mediaService.ts` (novo ou atualização)
- `src/components/features/media/SeriesDetails.tsx`
- `src/hooks/useMediaLibrary.ts`
- `src-tauri/src/lib.rs` (possível atualização)

#### Contexto

**Problema atual:**
1. App escaneia pasta e encontra episódios
2. Série identificada está incorreta
3. Usuário vai para busca e modifica a série
4. Após trocar, episódios não são contados corretamente
5. Interface exibe série correta mas diz que episódios não foram baixados (mesmo estando na pasta)

**Causa raiz:**
O sistema não está re-mapeando os arquivos locais para a nova série após a troca. Os episódios continuam vinculados ao ID da série antiga.

#### Requisitos Funcionais

1. **Re-scan inteligente após troca de série**
   - Quando usuário trocar série, system deve:
     - Manter referência aos arquivos locais existentes
     - Re-mapear episódios para nova estrutura de temporadas
     - Atualizar status de "downloaded" baseado em arquivos reais
     - Preservar informações de progresso (se existirem)

2. **Validação de episódios**
   - Comparar arquivos locais com estrutura da nova série
   - Marcar episódios como "downloaded" se arquivo existe
   - Marcar como "not downloaded" se não existe
   - Lidar com episódios extras/especiais

3. **Feedback visual durante re-matching**
   - Loading state durante re-processamento
   - Indicação de quantos episódios foram re-mapeados
   - Mensagem de sucesso/erro

#### Dados Necessários da API

**Endpoint para informações de temporada:**
```
GET /media/v1/tv/season/:mediaId/:seasonNumber
```

**Resposta esperada (criar DTO correspondente):**
```typescript
interface SeasonDetailsDTO {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  episodes: EpisodeDTO[];
  air_date: string;
}

interface EpisodeDTO {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string;
  air_date: string;
  runtime: number;
  vote_average: number;
}
```

#### Passos de Implementação

1. **Criar DTOs baseados na API backend**
   - Ler arquivos do backend (se disponíveis em documentação)
   - Criar tipos em `src/types/api.ts`
   - Garantir compatibilidade com tipos internos do app

2. **Criar serviço de re-matching**
   - Arquivo: `src/services/mediaService.ts`
   - Função: `rematchSeriesEpisodes(oldSeriesId, newSeriesId, localFiles)`
   - Lógica:
     ```typescript
     async function rematchSeriesEpisodes(
       oldSeriesId: string,
       newSeriesId: string,
       localFiles: string[]
     ): Promise<RematchResult> {
       // 1. Buscar dados da nova série
       const newSeriesData = await api.getSeries(newSeriesId);
       
       // 2. Para cada temporada, buscar episódios detalhados
       const seasons = await Promise.all(
         newSeriesData.seasons.map(season => 
           api.getSeasonDetails(newSeriesId, season.season_number)
         )
       );
       
       // 3. Mapear arquivos locais para episódios da nova série
       const episodeMatches = mapLocalFilesToEpisodes(localFiles, seasons);
       
       // 4. Atualizar status de download
       const updatedEpisodes = markDownloadedEpisodes(seasons, episodeMatches);
       
       // 5. Salvar no storage local
       await storageService.updateSeriesEpisodes(newSeriesId, updatedEpisodes);
       
       return {
         totalEpisodes: updatedEpisodes.length,
         downloadedEpisodes: episodeMatches.length,
         unmatchedFiles: localFiles.filter(f => !episodeMatches.includes(f))
       };
     }
     ```

3. **Implementar parser de nomes de arquivos**
   ```typescript
   function parseEpisodeFilename(filename: string): EpisodeInfo | null {
     // Padrões suportados:
     // - S01E01, S1E1
     // - 1x01, 1x1
     // - Episode 1, Ep 1
     const patterns = [
       /S(\d+)E(\d+)/i,
       /(\d+)x(\d+)/i,
       /Episode[\s\-_]*(\d+)/i
     ];
     
     for (const pattern of patterns) {
       const match = filename.match(pattern);
       if (match) {
         return {
           season: parseInt(match[1]),
           episode: parseInt(match[2] || match[1])
         };
       }
     }
     return null;
   }
   ```

4. **Atualizar `SeriesDetails.tsx`**
   - Adicionar handler para troca de série
   - Chamar serviço de re-matching
   - Mostrar loading durante processo
   - Atualizar UI com novos dados
   - Exemplo:
     ```tsx
     const handleSeriesChange = async (newSeriesId: string) => {
       setIsRemapping(true);
       try {
         const result = await mediaService.rematchSeriesEpisodes(
           series.id,
           newSeriesId,
           localFiles
         );
         
         toast.success(
           `${result.downloadedEpisodes} episódios remapeados com sucesso!`
         );
         
         // Recarregar dados da série
         await refetchSeries();
       } catch (error) {
         toast.error('Erro ao remapear episódios');
       } finally {
         setIsRemapping(false);
       }
     };
     ```

5. **Adicionar comando Rust para listar arquivos (se necessário)**
   ```rust
   #[tauri::command]
   async fn get_folder_files(folder_path: String) -> Result<Vec<String>, String> {
       let entries = fs::read_dir(&folder_path)
           .map_err(|e| e.to_string())?;
       
       let files: Vec<String> = entries
           .filter_map(|entry| entry.ok())
           .filter(|entry| entry.path().is_file())
           .map(|entry| entry.file_name().to_string_lossy().to_string())
           .collect();
       
       Ok(files)
   }
   ```

#### Critérios de Aceitação

- [ ] DTOs criados para todas respostas da API
- [ ] Re-matching funciona corretamente ao trocar série
- [ ] Episódios locais são detectados após troca
- [ ] Status "downloaded" reflete realidade
- [ ] Loading state durante re-processamento
- [ ] Feedback visual de sucesso/erro
- [ ] Episódios não-mapeados são identificados
- [ ] Funciona com diferentes padrões de nome de arquivo
- [ ] Testes manuais com séries reais

---

### Task 3: Sistema de Edição Manual de Séries

**Prioridade:** Alta  
**Estimativa:** 4-5 horas  
**Arquivos afetados:**
- `src/components/features/media/SeriesDetails.tsx`
- `src/components/features/media/SeriesEditDialog.tsx` (novo)
- `src/services/storageService.ts`
- `src/types/index.ts`

#### Contexto

Usuários precisam poder editar manualmente configurações de séries quando:
- Matching automático falhou
- Episódios estão na ordem errada
- Temporadas estão desorganizadas
- Metadados estão incorretos

#### Requisitos Funcionais

1. **Botão de edição na página de detalhes**
   - Ícone de engrenagem ou editar
   - Abre dialog modal
   - Apenas em séries com status "MATCHED"

2. **Dialog de edição com abas**
   - **Aba 1: Informações Gerais**
     - Título (editável)
     - Ano (editável)
     - Gêneros (multi-select)
     - Sinopse (textarea)
     - Status (Continuing, Ended, etc.)
   
   - **Aba 2: Temporadas**
     - Lista de temporadas
     - Adicionar/remover temporadas
     - Reordenar temporadas
   
   - **Aba 3: Episódios**
     - Por temporada
     - Editar título de episódio
     - Editar número do episódio
     - Marcar como especial
     - Vincular/desvincular arquivo local
   
   - **Aba 4: Arquivos**
     - Lista de arquivos detectados
     - Status de vinculação
     - Re-scan manual
     - Ignorar arquivo

3. **Persistência**
   - Salvar alterações no localStorage
   - Flag `manuallyEdited: true`
   - Não sobrescrever em re-scans automáticos

#### Estrutura de Dados

```typescript
interface SeriesEditState {
  seriesId: string;
  manuallyEdited: boolean;
  editedAt: string;
  changes: {
    metadata?: Partial<Series>;
    seasons?: SeasonEdit[];
    episodes?: EpisodeEdit[];
    fileBindings?: FileBinding[];
  };
}

interface SeasonEdit {
  seasonNumber: number;
  action: 'add' | 'remove' | 'modify';
  data?: Partial<Season>;
}

interface EpisodeEdit {
  episodeId: string;
  action: 'modify' | 'unbind' | 'rebind';
  data?: Partial<Episode>;
  filePath?: string;
}

interface FileBinding {
  filePath: string;
  boundTo?: {
    seasonNumber: number;
    episodeNumber: number;
  };
  ignored: boolean;
}
```

#### Passos de Implementação

1. **Criar componente `SeriesEditDialog.tsx`**
   ```tsx
   interface SeriesEditDialogProps {
     series: Series;
     isOpen: boolean;
     onClose: () => void;
     onSave: (changes: SeriesEditState) => Promise<void>;
   }

   export function SeriesEditDialog({ series, isOpen, onClose, onSave }: SeriesEditDialogProps) {
     const [activeTab, setActiveTab] = useState('general');
     const [editState, setEditState] = useState<SeriesEditState>(/* ... */);
     
     // Implementar lógica de edição
     
     return (
       <Dialog open={isOpen} onOpenChange={onClose}>
         <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Editar Série: {series.title}</DialogTitle>
           </DialogHeader>
           
           <Tabs value={activeTab} onValueChange={setActiveTab}>
             <TabsList>
               <TabsTrigger value="general">Geral</TabsTrigger>
               <TabsTrigger value="seasons">Temporadas</TabsTrigger>
               <TabsTrigger value="episodes">Episódios</TabsTrigger>
               <TabsTrigger value="files">Arquivos</TabsTrigger>
             </TabsList>
             
             <TabsContent value="general">
               {/* Formulário de edição geral */}
             </TabsContent>
             
             {/* Outras tabs */}
           </Tabs>
           
           <DialogFooter>
             <Button variant="outline" onClick={onClose}>
               Cancelar
             </Button>
             <Button onClick={handleSave}>
               Salvar Alterações
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     );
   }
   ```

2. **Adicionar ao `SeriesDetails.tsx`**
   ```tsx
   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
   
   const handleSaveEdits = async (changes: SeriesEditState) => {
     await storageService.saveSeriesEdits(series.id, changes);
     await refetchSeries();
     toast.success('Alterações salvas com sucesso!');
     setIsEditDialogOpen(false);
   };
   
   // No JSX, adicionar botão
   <Button onClick={() => setIsEditDialogOpen(true)}>
     <Settings className="w-4 h-4 mr-2" />
     Editar Série
   </Button>
   
   <SeriesEditDialog
     series={series}
     isOpen={isEditDialogOpen}
     onClose={() => setIsEditDialogOpen(false)}
     onSave={handleSaveEdits}
   />
   ```

3. **Atualizar `storageService.ts`**
   ```typescript
   class StorageService {
     // ...
     
     saveSeriesEdits(seriesId: string, edits: SeriesEditState): void {
       const key = `series-edits-${seriesId}`;
       localStorage.setItem(key, JSON.stringify(edits));
     }
     
     getSeriesEdits(seriesId: string): SeriesEditState | null {
       const key = `series-edits-${seriesId}`;
       const data = localStorage.getItem(key);
       return data ? JSON.parse(data) : null;
     }
     
     applySeriesEdits(series: Series): Series {
       const edits = this.getSeriesEdits(series.id);
       if (!edits) return series;
       
       // Aplicar mudanças
       return {
         ...series,
         ...edits.changes.metadata,
         seasons: this.applySeasonEdits(series.seasons, edits.changes.seasons),
         manuallyEdited: true
       };
     }
   }
   ```

4. **Implementar validações**
   - Não permitir temporadas duplicadas
   - Não permitir episódios duplicados na mesma temporada
   - Validar formato de datas
   - Validar números positivos para season/episode

#### Critérios de Aceitação

- [ ] Dialog de edição abre corretamente
- [ ] Todas as abas funcionam
- [ ] Edições são salvas no localStorage
- [ ] Edições são aplicadas na visualização
- [ ] Flag `manuallyEdited` previne sobrescrita
- [ ] Validações impedem dados inválidos
- [ ] Feedback visual de sucesso/erro
- [ ] Possível cancelar edições
- [ ] UI responsiva e intuitiva

---

### Task 4: Sistema de Histórico de Mídias Assistidas

**Prioridade:** Alta  
**Estimativa:** 3-4 horas  
**Arquivos afetados:**
- `src/types/index.ts`
- `src/services/watchHistoryService.ts` (novo)
- `src/components/features/media/MovieDetails.tsx`
- `src/components/features/media/SeriesDetails.tsx`
- `src/components/features/library/StreamingCard.tsx`
- `src/components/features/history/WatchHistory.tsx` (novo)

#### Contexto

**Necessidade:**
- Usuário assiste um filme e depois apaga o arquivo
- App deve manter histórico de que foi assistido
- Evitar erro ao tentar reproduzir mídia inexistente
- Permitir visualização do histórico completo

**Comportamento esperado:**
- Mídia marcada como "assistida" não pode ser reproduzida (exibir mensagem)
- Badge visual indica "assistido"
- Histórico persistido localmente
- Página dedicada para ver histórico

#### Requisitos Funcionais

1. **Marcar como assistido**
   - Botão nas páginas de detalhes (Movie/Series)
   - Confirmação antes de marcar
   - Salvar timestamp e metadata

2. **Comportamento de mídia assistida**
   - Badge "✓ Assistido" no card
   - Desabilitar botão "Watch Now"
   - Mostrar mensagem: "Você já assistiu este título"
   - Opção de "Desmarcar como assistido"

3. **Página de histórico**
   - Lista cronológica de mídias assistidas
   - Filtro por tipo (filmes/séries)
   - Busca por título
   - Ordenação (mais recente primeiro)
   - Data de quando assistiu
   - Opção de remover do histórico

4. **Integração com episódios (séries)**
   - Marcar episódios individuais como assistidos
   - Marcar temporada inteira
   - Marcar série completa
   - Indicador de progresso (X/Y episódios assistidos)

#### Estrutura de Dados

```typescript
interface WatchHistoryEntry {
  id: string;
  mediaId: string;
  mediaType: 'MOVIE' | 'SERIES';
  title: string;
  poster: string;
  watchedAt: string; // ISO timestamp
  metadata?: {
    seasonNumber?: number;
    episodeNumber?: number;
    runtime?: number;
  };
}

interface SeriesWatchProgress {
  seriesId: string;
  episodes: {
    [key: string]: boolean; // key: "S01E01"
  };
  totalEpisodes: number;
  watchedEpisodes: number;
  lastWatched: string;
}
```

#### Passos de Implementação

1. **Criar `watchHistoryService.ts`**
   ```typescript
   class WatchHistoryService {
     private readonly STORAGE_KEY = 'watch-history';
     private readonly SERIES_PROGRESS_KEY = 'series-progress';
     
     markAsWatched(entry: WatchHistoryEntry): void {
       const history = this.getHistory();
       history.unshift(entry); // Adiciona no início
       localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
     }
     
     unmarkAsWatched(mediaId: string): void {
       const history = this.getHistory();
       const filtered = history.filter(e => e.mediaId !== mediaId);
       localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
     }
     
     isWatched(mediaId: string): boolean {
       const history = this.getHistory();
       return history.some(e => e.mediaId === mediaId);
     }
     
     getHistory(): WatchHistoryEntry[] {
       const data = localStorage.getItem(this.STORAGE_KEY);
       return data ? JSON.parse(data) : [];
     }
     
     markEpisodeWatched(seriesId: string, season: number, episode: number): void {
       const progress = this.getSeriesProgress(seriesId) || {
         seriesId,
         episodes: {},
         totalEpisodes: 0,
         watchedEpisodes: 0,
         lastWatched: new Date().toISOString()
       };
       
       const key = `S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`;
       progress.episodes[key] = true;
       progress.watchedEpisodes = Object.keys(progress.episodes).length;
       progress.lastWatched = new Date().toISOString();
       
       this.saveSeriesProgress(seriesId, progress);
     }
     
     getSeriesProgress(seriesId: string): SeriesWatchProgress | null {
       const data = localStorage.getItem(`${this.SERIES_PROGRESS_KEY}-${seriesId}`);
       return data ? JSON.parse(data) : null;
     }
     
     private saveSeriesProgress(seriesId: string, progress: SeriesWatchProgress): void {
       localStorage.setItem(
         `${this.SERIES_PROGRESS_KEY}-${seriesId}`,
         JSON.stringify(progress)
       );
     }
   }
   
   export const watchHistoryService = new WatchHistoryService();
   ```

2. **Atualizar `MovieDetails.tsx`**
   ```tsx
   const [isWatched, setIsWatched] = useState(
     watchHistoryService.isWatched(movie.id)
   );
   
   const handleMarkAsWatched = () => {
     if (isWatched) {
       watchHistoryService.unmarkAsWatched(movie.id);
       setIsWatched(false);
       toast.success('Removido do histórico');
     } else {
       watchHistoryService.markAsWatched({
         id: crypto.randomUUID(),
         mediaId: movie.id,
         mediaType: 'MOVIE',
         title: movie.title,
         poster: movie.poster,
         watchedAt: new Date().toISOString(),
         metadata: {
           runtime: movie.runtime
         }
       });
       setIsWatched(true);
       toast.success('Marcado como assistido');
     }
   };
   
   const handlePlay = () => {
     if (isWatched) {
       toast.error('Este filme já foi assistido');
       return;
     }
     // Lógica normal de play
   };
   
   // No JSX
   {isWatched && (
     <Badge variant="success" className="absolute top-4 right-4">
       <Check className="w-4 h-4 mr-1" />
       Assistido
     </Badge>
   )}
   
   <Button
     onClick={handlePlay}
     disabled={isWatched}
   >
     {isWatched ? 'Já Assistido' : 'Assistir Agora'}
   </Button>
   
   <Button variant="outline" onClick={handleMarkAsWatched}>
     {isWatched ? 'Desmarcar' : 'Marcar como Assistido'}
   </Button>
   ```

3. **Atualizar `SeriesDetails.tsx`**
   - Similar ao MovieDetails
   - Adicionar botões por episódio
   - Mostrar progresso de temporada/série
   ```tsx
   const progress = watchHistoryService.getSeriesProgress(series.id);
   
   <div className="text-sm text-muted">
     {progress && (
       <span>
         {progress.watchedEpisodes} / {progress.totalEpisodes} episódios assistidos
       </span>
     )}
   </div>
   ```

4. **Atualizar `StreamingCard.tsx`**
   ```tsx
   const isWatched = watchHistoryService.isWatched(media.id);
   
   {isWatched && (
     <Badge className="absolute top-2 right-2" variant="success">
       <Check className="w-3 h-3" />
     </Badge>
   )}
   ```

5. **Criar página de histórico `WatchHistory.tsx`**
   ```tsx
   export function WatchHistory() {
     const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
     const [filter, setFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');
     
     useEffect(() => {
       const data = watchHistoryService.getHistory();
       setHistory(data);
     }, []);
     
     const filteredHistory = history.filter(entry => 
       filter === 'ALL' || entry.mediaType === filter
     );
     
     return (
       <div className="p-8">
         <h1 className="text-3xl font-bold mb-6">Histórico de Visualização</h1>
         
         <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
           <TabsList>
             <TabsTrigger value="ALL">Todos</TabsTrigger>
             <TabsTrigger value="MOVIE">Filmes</TabsTrigger>
             <TabsTrigger value="SERIES">Séries</TabsTrigger>
           </TabsList>
         </Tabs>
         
         <div className="grid gap-4 mt-6">
           {filteredHistory.map(entry => (
             <div key={entry.id} className="flex items-center gap-4 p-4 bg-surface rounded-lg">
               <img src={entry.poster} alt={entry.title} className="w-16 h-24 object-cover rounded" />
               <div className="flex-1">
                 <h3 className="font-semibold">{entry.title}</h3>
                 <p className="text-sm text-muted">
                   Assistido em {new Date(entry.watchedAt).toLocaleDateString()}
                 </p>
               </div>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => handleRemove(entry.mediaId)}
               >
                 <Trash2 className="w-4 h-4" />
               </Button>
             </div>
           ))}
         </div>
       </div>
     );
   }
   ```

6. **Adicionar rota no `app/page.tsx`**
   ```tsx
   // Adicionar novo estado
   'history' | 'movie-details' | 'series-details' | ...
   
   {appState === 'history' && <WatchHistory onBack={handleBack} />}
   ```

#### Critérios de Aceitação

- [ ] Possível marcar/desmarcar filme como assistido
- [ ] Possível marcar episódios individualmente
- [ ] Badge visual indica mídia assistida
- [ ] Botão de play desabilitado para mídias assistidas
- [ ] Mensagem clara quando tentar reproduzir mídia assistida
- [ ] Histórico persiste no localStorage
- [ ] Página de histórico funcional
- [ ] Filtros funcionam corretamente
- [ ] Progresso de séries calculado corretamente
- [ ] Possível remover itens do histórico

---

### Task 5: Funcionalidade de Abrir Pasta da Mídia

**Prioridade:** Média  
**Estimativa:** 1-2 horas  
**Arquivos afetados:**
- `src-tauri/src/lib.rs`
- `src/services/tauri.ts`
- `src/components/features/media/MovieDetails.tsx`
- `src/components/features/media/SeriesDetails.tsx`

#### Contexto

Usuários precisam poder abrir rapidamente a pasta onde o arquivo de mídia está localizado no explorador de arquivos do sistema operacional.

#### Requisitos Funcionais

1. **Botão "Abrir Pasta"**
   - Presente nas páginas de detalhes
   - Ícone de pasta
   - Abre explorador do SO na localização do arquivo

2. **Comportamento multiplataforma**
   - Windows: Abre Explorer e seleciona arquivo
   - macOS: Abre Finder e seleciona arquivo
   - Linux: Abre gerenciador de arquivos padrão

3. **Tratamento de erros**
   - Verificar se arquivo existe antes de abrir
   - Mensagem de erro se pasta não existe
   - Fallback para abrir apenas a pasta (sem seleção)

#### Passos de Implementação

1. **Adicionar comando Rust em `lib.rs`**
   ```rust
   use std::path::Path;
   
   #[tauri::command]
   async fn open_file_location(file_path: String) -> Result<(), String> {
       let path = Path::new(&file_path);
       
       if !path.exists() {
           return Err("Arquivo não encontrado".to_string());
       }
       
       let folder_path = path.parent()
           .ok_or("Não foi possível determinar a pasta")?;
       
       #[cfg(target_os = "windows")]
       {
           // Windows: usar explorer.exe /select
           std::process::Command::new("explorer")
               .args(["/select,", &file_path])
               .spawn()
               .map_err(|e| e.to_string())?;
       }
       
       #[cfg(target_os = "macos")]
       {
           // macOS: usar open -R
           std::process::Command::new("open")
               .args(["-R", &file_path])
               .spawn()
               .map_err(|e| e.to_string())?;
       }
       
       #[cfg(target_os = "linux")]
       {
           // Linux: abrir gerenciador de arquivos
           // Tenta xdg-open primeiro, depois nautilus, dolphin, etc.
           let managers = ["xdg-open", "nautilus", "dolphin", "thunar"];
           let folder_str = folder_path.to_str()
               .ok_or("Caminho inválido")?;
           
           for manager in &managers {
               if let Ok(_) = std::process::Command::new(manager)
                   .arg(folder_str)
                   .spawn()
               {
                   return Ok(());
               }
           }
           
           return Err("Nenhum gerenciador de arquivos encontrado".to_string());
       }
       
       Ok(())
   }
   ```

2. **Adicionar ao `tauri.ts`**
   ```typescript
   export async function openFileLocation(filePath: string): Promise<void> {
     try {
       await invoke<void>('open_file_location', { filePath });
     } catch (error) {
       throw new Error(`Erro ao abrir localização: ${error}`);
     }
   }
   ```

3. **Adicionar botão em `MovieDetails.tsx`**
   ```tsx
   const handleOpenFolder = async () => {
     try {
       await tauriService.openFileLocation(movie.filePath);
     } catch (error) {
       toast.error('Erro ao abrir pasta');
       console.error(error);
     }
   };
   
   // No JSX
   <Button variant="outline" onClick={handleOpenFolder}>
     <FolderOpen className="w-4 h-4 mr-2" />
     Abrir Pasta
   </Button>
   ```

4. **Adicionar em `SeriesDetails.tsx`**
   - Botão geral para pasta da série
   - Botões individuais por episódio (opcional)
   ```tsx
   const handleOpenEpisodeFolder = async (episodeFilePath: string) => {
     try {
       await tauriService.openFileLocation(episodeFilePath);
     } catch (error) {
       toast.error('Erro ao abrir pasta do episódio');
     }
   };
   ```

5. **Adicionar validação de arquivo**
   ```typescript
   // Antes de chamar openFileLocation
   if (!movie.filePath || movie.filePath === '/demo/path/to/movie.mp4') {
     toast.error('Arquivo não encontrado localmente');
     return;
   }
   ```

#### Critérios de Aceitação

- [ ] Botão "Abrir Pasta" presente nas páginas de detalhes
- [ ] Funciona no Windows (abre Explorer e seleciona arquivo)
- [ ] Funciona no macOS (abre Finder e seleciona arquivo)
- [ ] Funciona no Linux (abre gerenciador de arquivos)
- [ ] Exibe erro se arquivo não existe
- [ ] Exibe erro se pasta não existe
- [ ] Não quebra em mídias demo/sem arquivo local
- [ ] Feedback visual (toast) de sucesso/erro

---

## 🔄 Ordem de Execução Recomendada

Devido às dependências entre tasks, recomenda-se a seguinte ordem:

1. **Task 1** (Sidebar) - Independente, melhora base da UI
2. **Task 2** (Re-matching) - Crítica, corrige bug importante
3. **Task 3** (Edição manual) - Depende parcialmente da Task 2
4. **Task 5** (Abrir pasta) - Simples, pode ser feita em paralelo
5. **Task 4** (Histórico) - Mais complexa, pode ser última

---

## 📚 Recursos e Referências

### Documentação Importante

- [ShadCN Sidebar](https://ui.shadcn.com/docs/components/sidebar)
- [Tauri Commands](https://tauri.app/v1/guides/features/command/)
- [React Hook Form](https://react-hook-form.com/) (para formulários de edição)
- [Zod](https://zod.dev/) (validação de schemas)

### Bibliotecas a Considerar

```bash
# Para validação de formulários
bun add react-hook-form zod @hookform/resolvers

# Para toast notifications (se não instalado)
bun add sonner

# Para date handling
bun add date-fns
```

### Padrões de Código

1. **Nomenclatura:**
   - Componentes: PascalCase (`SeriesEditDialog`)
   - Funções: camelCase (`handleSaveEdits`)
   - Constantes: UPPER_SNAKE_CASE (`STORAGE_KEY`)

2. **Estrutura de Arquivos:**
   - Um componente por arquivo
   - Services isolados
   - Tipos centralizados em `types/`

3. **Error Handling:**
   - Sempre usar try/catch em operações assíncronas
   - Toast para feedback ao usuário
   - Console.error para debugging

4. **TypeScript:**
   - Sempre tipar props e retornos
   - Evitar `any`
   - Usar interfaces para objetos complexos

---

## ✅ Checklist Final

Após implementar todas as tasks, verificar:

- [ ] Todas funcionalidades testadas manualmente
- [ ] Sem erros de TypeScript
- [ ] Sem warnings no console
- [ ] Sem erros de Rust compilation
- [ ] UI responsiva em diferentes resoluções
- [ ] Loading states em todas operações assíncronas
- [ ] Error handling adequado
- [ ] Feedback visual (toasts/mensagens)
- [ ] Documentação atualizada (se necessário)
- [ ] Código formatado e limpo

---

## 🐛 Troubleshooting

### Problemas Comuns

1. **Sidebar não aparece:**
   - Verificar importações do ShadCN
   - Conferir `globals.css` atualizado
   - Checar se `SidebarProvider` está no nível correto

2. **Re-matching não funciona:**
   - Verificar se API retorna dados corretos
   - Conferir parser de nomes de arquivo
   - Validar localStorage

3. **Comando Rust falha:**
   - Verificar permissões de arquivo
   - Conferir se comando está registrado em `lib.rs`
   - Checar logs do Tauri

4. **Histórico não persiste:**
   - Verificar localStorage disponível
   - Conferir JSON.stringify/parse
   - Validar estrutura de dados

---
