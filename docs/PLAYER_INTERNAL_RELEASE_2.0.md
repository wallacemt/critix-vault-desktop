# Critix Vault 2.0 — Engenharia do Player Interno
### Release `release/2.0.0` · Jun/2026

---

## 1. Contexto e Problema

Critix Vault é um app desktop de biblioteca de mídia local construído com **Tauri 2.x** (shell Rust) + **Next.js 16** (frontend + servidor de API) + **SQLite via Prisma**. O motor de renderização de vídeo é o **WebView2** (Chromium embutido no Windows), o que impõe uma restrição fundamental: o WebView2 **não decodifica nativamente containers MKV nem os codecs de áudio mais comuns nesses arquivos** — AC3, DTS, EAC3 — por questões de licenciamento.

O problema é real e prevalente: a esmagadora maioria dos arquivos que os usuários baixam são MKV com H.264/HEVC+AC3 ou DTS. Antes da 2.0, a única saída era abrir o arquivo no VLC ou player de sistema. Isso funcionava, mas quebrava a experiência: o usuário saía do app, perdia o contexto da fila de episódios, e o progresso de assistido precisava ser marcado manualmente.

O objetivo da release 2.0 foi construir uma experiência de playback completa dentro do app, endereçando três requisitos conflitantes:

1. **Jogar qualquer arquivo** que o usuário tenha, incluindo MKV+AC3.
2. **Manter o player embutido** (Vidstack) para formatos que o WebView2 suporta — MP4/H.264/AAC, WebM — onde o app tem progresso real, resume e menus de faixa.
3. **Não aumentar o bundle** com binários pesados (restrição de Store / MSIX).

---

## 2. Decisões Arquiteturais (ADRs)

### ADR-01 — Player externo como canonical para MKV; FFmpeg apenas se já instalado

**Contexto:** Há dois caminhos para fazer MKV funcionar no app:

- **Opção A — Player de sistema.** Zero custo de bundle; já 90% construído; abre qualquer codec que o VLC do usuário suporte. Contra: sem acesso ao clock do player externo, o progresso é uma estimativa.
- **Opção B — Transcodificação via FFmpeg.** Mantém o playback dentro do app com progresso real. Contra: binário FFmpeg ≈ 50–80 MB bundled — viola a restrição de Store.

**Decisão:** A rota principal para MKV é o player de sistema (Opção A). Porém, durante a implementação, identificou-se um subconjunto do problema que a Opção A não resolve: arquivos com **áudio AC3/DTS mas somente um track de áudio**, onde o usuário nem precisa escolher — e ainda assim o WebView2 rejeita o codec silenciosamente, reproduzindo sem som.

A solução foi um **híbrido**: o app detecta o codec via `ffprobe`, e se o codec for incompatível, usa o `ffmpeg` **já instalado no sistema do usuário** (via lookup em PATH → registro do Windows → caminhos comuns) para transcodificar o áudio para AAC, sem nada ser bundled no instalador. O resultado é servido pelo servidor Next.js embutido com suporte a range requests, exatamente como um MP4 nativo.

**Consequência prática:** O app tem custo zero de bundle, funciona offline, e cobre o caso mais comum (MKV+AC3) sem depender de que o usuário tenha o VLC instalado.

---

### ADR-02 — Player Vidstack embutido mantido para formatos suportados

O player embutido é retido como caminho principal para MP4, M4V, WebM e MKV após transcodificação. Ele entrega: progresso real com autosave a cada 10s, resume preciso, menus de faixa de áudio e legenda, playback rate, seleção de legenda sidecar (.srt/.vtt), e overlay de próximo episódio. Remover ele para servir apenas o player externo regressaria todo esse valor nos formatos que funcionam perfeitamente.

---

### ADR-03 — `preferred_player` como ponto único de decisão de rota

**Contexto:** As ações de "jogar" estavam duplicadas em três pontos do código (`handlePlayerChoice`, `playEpisodeForSeries`, `handlePlayMovie`), cada uma repetindo a mesma sequência `setWatchSession + openMedia + router.push("/watching")`.

**Decisão:** Centralizar em `dispatchPlay(item, queue, pref)` em `useActions.ts`. A preferência lida do Rust via `tauriService.getSettings()` determina o branch:

```
"INTERNAL" → openMedia() + router.push("/player")
"EXTERNAL" → tauriService.openMedia() + setWatchSession() + router.push("/watching")
"ASK"      → setPendingPlay() → PlayerChoiceGate captura → PlayerChoiceModal
```

O resultado: um único ponto de dispatch, testável, que honra a preferência persistida em settings.

---

### ADR-04 — `reactStrictMode: false` (restrição do Vidstack)

O `MediaProvider` do Vidstack insere o elemento `<video>` no Shadow DOM de forma imperativa durante a montagem. Com `reactStrictMode: true`, o React monta o componente duas vezes em desenvolvimento — isso causa uma tela preta permanente porque o Shadow DOM é manipulado uma segunda vez sem o elemento `<video>` ainda presente. Essa não é uma limitação do Vidstack em si, mas da incompatibilidade entre manipulação imperativa de DOM e o double-render intencional do strict mode. A flag está documentada no `CLAUDE.md` e em `next.config.mjs` com comentário explicativo.

---

### ADR-05 — Probe sempre antes de jogar containers AT_RISK

Containers `.mkv`, `.avi`, `.mov`, `.ts` e `.m2ts` passam por um probe via `GET /api/probe` antes de o player montar. O probe (via `ffprobe -show_streams`) retorna:

- Lista de `audioStreams[]` com `relativeIndex` (contador de áudio apenas, 0-based), `codec`, `language`, `title`, `channels`, `needsTranscode`.
- `needsTranscode: true` se **qualquer** faixa de áudio usar codec incompatível (AC3, DTS, EAC3, TrueHD, WMA, MP1, MP2...).

**Decisão chave:** `relativeIndex` é um contador exclusivo de streams de áudio (0, 1, 2...), mapeando diretamente para o argumento `-map 0:a:N` do FFmpeg. Não é o índice global do stream no container (que seria `-map 0:N`). Essa distinção é crítica: um arquivo MKV com 8 streams de áudio, onde o português está no stream global `0:8`, tem `relativeIndex = 7`. Usar o índice global errado selecionaria a faixa errada silenciosamente.

---

## 3. Arquitetura de Playback — Fluxo Completo

```
UI (click Jogar)
  └─ useActions.handlePlayMovie / playEpisodeForSeries
       └─ tauriService.getSettings() → preferred_player
            ├─ "EXTERNAL" → tauriService.openMedia() → OS/VLC
            ├─ "ASK"      → setPendingPlay() → PlayerChoiceModal
            └─ "INTERNAL" → playerStore.openMedia()
                              └─ router.push("/player")
                                   └─ VideoSurface (ssr:false, dynamic import)
                                        ├─ Fast path: .mp4/.webm → status "idle", monta direto
                                        └─ AT_RISK (.mkv etc):
                                             ├─ GET /api/probe → ffprobe
                                             ├─ audioStreams.length > 1 → AudioSelectModal
                                             ├─ selectedAudioIndex resolvido
                                             ├─ needsTranscode? → POST /api/hls/start
                                             │    ├─ Hit cache (SHA1 do path:aN) → resposta imediata
                                             │    └─ Cache miss → FFmpeg:
                                             │         ffmpeg -map 0:v:0 -map 0:a:N
                                             │                -c:v copy -c:a aac -movflags +faststart
                                             │         → tempPath → rename → cachePath
                                             ├─ Player monta com URL do MP4 resultante
                                             └─ status "idle" (AAC, track 0 default) → raw stream
```

---

## 4. Infraestrutura de Streaming (Phase 3)

A base de streaming foi construída inteiramente no servidor Next.js embutido no Tauri:

### `GET /api/stream`
Serve o arquivo de vídeo bruto com suporte a **HTTP range requests** (`Accept-Ranges: bytes`). Isso é indispensável para que o Vidstack faça seek sem re-download. A rota valida o caminho contra a tabela `Folder` no banco via `resolveAndGuardPath()` — um guard contra path traversal: se o arquivo não estiver dentro de uma pasta registrada pelo usuário, a requisição recebe 403.

### `GET /api/probe`
Executa `ffprobe -show_streams` e retorna o mapa de streams de áudio e legendas. Resultado cacheado em memória (`globalThis._probeCache`) — um arquivo só é probado uma vez por sessão.

### `POST /api/hls/start`
Dispara o FFmpeg (localizado via `find-binary.ts`) para transcodificar o arquivo para MP4 com a faixa de áudio selecionada. Características:
- **Cache persistente:** arquivo gravado em `CRITIX_DATA_DIR/transcodes/{SHA1}.mp4`. A chave SHA1 inclui o caminho resolvido + índice de áudio, então `jpn` e `por` geram arquivos distintos. Reproduções subsequentes são instantâneas.
- **Atomic write:** grava em `.tmp.mp4`, renomeia para `.mp4` ao finalizar — sem arquivos corrompidos no cache.
- **Abort on disconnect:** se o cliente fechar o player durante a transcodificação, `request.signal` dispara `SIGTERM` no processo FFmpeg imediatamente, parando o consumo de CPU.
- **Validação de cache por mtime:** o cache é invalidado se o arquivo fonte for modificado desde a última transcodificação.

### `GET /api/hls/[sessionId]/video`
Serve o MP4 transcodificado (do cache ou temp) com range requests, exatamente como o `/api/stream` — o Vidstack não sabe que é um arquivo gerado.

---

## 5. Componente VideoSurface — Engenharia Interna

`VideoSurface.tsx` é o componente mais complexo da base de código. Algumas decisões internas:

### Estado de transcodificação como máquina de estados
```typescript
type TranscodeState =
  | { status: "idle" }           // raw stream, sem transcode
  | { status: "probing" }        // aguardando ffprobe
  | { status: "selecting-audio"; streams: AudioStreamInfo[]; codec: string }
  | { status: "transcoding"; codec: string }
  | { status: "ready"; videoUrl: string; sessionId: string; codec: string }
  | { status: "error"; audioCodec: string };
```

O componente arranca **sempre em `"probing"`**, nunca em `"idle"`. Isso garante que o `<MediaPlayer>` do Vidstack não monte antes da decisão de codec — se montasse com o raw stream de um arquivo AC3 e depois precisasse trocar a fonte para o MP4 transcodificado, o Vidstack faria um unmount/remount do `<video>` causando tela preta.

### Seleção de áudio como Promise controlada por ref
Quando há múltiplas faixas de áudio, a execução do efeito é **suspensa** via uma `Promise` cujo `resolve` está guardado em `audioSelectCallbackRef`. O componente muda para `status: "selecting-audio"` e fica esperando. Quando o usuário confirma a seleção no modal, `audioSelectCallbackRef.current(index)` é chamado — e a Promise resolve, retomando o efeito.

O AbortController do efeito está conectado ao `signal.addEventListener("abort", () => resolve(null))`: se o usuário navegar para fora enquanto o modal está aberto, o efeito é cancelado limpo, sem leak de estado.

### `rePickCounter` para troca de idioma mid-playback
O botão "Trocar idioma" incrementa `rePickCounter`, que está na lista de dependências do `useEffect` principal. Isso re-executa todo o fluxo: stop da sessão ativa → probe (cache) → modal → transcode da faixa escolhida. A sessão anterior é terminada via `stopHlsSession()` → SIGTERM no FFmpeg server-side.

### O fast-path para .mp4/.webm
Arquivos com extensão fora de `AT_RISK_EXTS` pulam o probe completamente e vão direto para `status: "idle"`. Isso garante que um MP4/H.264/AAC não adicione latência de ffprobe antes do play.

---

## 6. Sistema de Preferência de Player

### `preferred_player: "ASK" | "INTERNAL" | "EXTERNAL"`
Persistido no Rust (`AppSettings`) via `save_settings`, com proteção de leitura antes de escrita (o `save_settings` preserva campos sensíveis como `torrent_client_pass` independente do que o renderer enviar).

### `PlayerChoiceModal` + `PlayerChoiceGate`
O gate é montado uma vez no layout (nunca desmontado). Quando `pendingPlay !== null` (apenas no caso `"ASK"`), o modal aparece. O checkbox "Lembrar minha escolha" salva a preferência via `tauriService.saveSettings()` apenas quando `remember = true`.

**Bug corrigido nesta sessão:** O estado `remember` nunca resetava entre aberturas do modal (o componente nunca desmonta). Um `useEffect(() => { if (open) setRemember(false); }, [open])` resolve: a cada vez que o modal abre, o checkbox começa desmarcado — prevenindo que uma escolha anterior vaze para a próxima sessão de decisão.

---

## 7. Seleção de Idioma — O Problema Mais Sutil

### O bug de track 0 em arquivos all-AAC

Para arquivos onde todos os codecs de áudio são suportados (ex.: releases NF com AAC em 8 idiomas), existe um caminho especial:

```typescript
if (selectedStream && !selectedStream.needsTranscode && !probe.needsTranscode && selectedAudioIndex === 0) {
  setTranscode({ status: "idle" }); // reproduz o raw stream
  return;
}
```

Quando o usuário seleciona a faixa 0 (geralmente o padrão do container, ex.: japonês), o app reproduz o stream bruto MKV. O WebView2/Chromium seleciona a faixa marcada como `(default)` no container — que coincide. Funciona.

O problema: **o botão "Trocar idioma" só aparecia quando `transcode.status === "ready"`**. No estado `"idle"` (raw stream rodando), o usuário não tinha como acessar o modal de seleção de idioma novamente, ficando preso no idioma padrão sem saída visível.

### Correção implementada

O botão "Trocar idioma" agora é renderizado sempre que `playerReady && hasMultipleAudioRef.current`, independente do estado da transcodificação. Ele mostra ainda um badge com o idioma atual:

```tsx
{hasMultipleAudioRef.current && (
  <button onClick={handleRePick}>
    <Languages /> Trocar idioma
    {activeAudioStream && (
      <span className="font-mono text-[10px]">
        {audioLabel(activeAudioStream)}  {/* ex.: "POR", "JPN", "Portuguese" */}
      </span>
    )}
  </button>
)}
```

O `activeAudioStream` é um estado React que é atualizado em todos os exit points do fluxo de inicialização — incluindo o path `"idle"` — garantindo que o badge sempre reflita a faixa que está tocando de fato.

---

## 8. Segurança e Hardening

### `resolveAndGuardPath()` — path traversal prevention
Toda rota de API que acessa o sistema de arquivos (`/api/stream`, `/api/probe`, `/api/hls/start`, `/api/subtitle`) passa por `resolveAndGuardPath()`:
1. `realpath()` resolve symlinks e normaliza o caminho absoluto.
2. O caminho resolvido é validado contra a lista de `Folder` registradas no banco — o arquivo deve estar **dentro** de uma pasta que o usuário adicionou explicitamente.
3. Qualquer desvio retorna 403.

Isso garante que um caminho como `../../../../etc/passwd` enviado por um script malicioso na WebView seja rejeitado antes de chegar ao disco.

### Rust `open_media` — validação de path antes do spawn
O comando Rust responsável por abrir arquivos no player externo usa `canonicalize()` para validar que o caminho existe e é um arquivo regular antes de passar para o shell (`cmd /C start`, `xdg-open`, `open`, ou `vlc`). Se o VLC não estiver instalado, o comando cai de volta para o player padrão do sistema ao invés de retornar erro.

---

## 9. Persistência e Cache

| Camada | Mecanismo | Chave | Validade |
|--------|-----------|-------|----------|
| Probe result | `Map<string, AudioProbeResult>` em `globalThis` | `realpath` do arquivo | Toda a sessão do servidor |
| Transcode file | `CRITIX_DATA_DIR/transcodes/{SHA1}.mp4` | `SHA1(realpath:aN)` | Até o arquivo fonte ser modificado (mtime check) |
| HLS sessions | `Map<string, Session>` em `globalThis` | `sessionId` UUID | 2h (prune automático) |
| Watch history | SQLite via Prisma | `mediaId + episodeId` | Permanente |
| Resume position | SQLite via Prisma | `mediaId + episodeId` | Permanente |
| Preferred player | Rust JSON settings file | — | Permanente |

O globalThis como namespace de cache é intencional: o Next.js em modo dev descarta módulos em hot-reload, mas o `globalThis` sobrevive — mantendo o cache de probe e sessões consistente durante o desenvolvimento.

---

## 10. Linha do Tempo da Release

| Fase | Commit | O que entrou |
|------|--------|-------------|
| Phase 0.5 | `69bb00e` | Autoscan na inicialização do app |
| Phase 1 | `797369d` | Fix watch-history granular por episódio |
| Phase 2 | `980c5d4` | Fix shadow-restore com UUID de geração do banco |
| Phase 3 | `ba07f0e` | Infraestrutura de streaming: `/api/stream`, `/api/subtitle`, `resolveAndGuardPath`, `open_media` Rust |
| Phase 4 | `94712b3` | Player Vidstack embutido: `VideoSurface`, `PlayerChoiceModal`, `PlayerChoiceGate`, `playerStore`, `preferred_player` |
| Phase 5 | `c3b6848` | Browser de torrent sandboxado + magnet handoff |
| Phase 6 | `7fa63ae` | Bundle audit, updater artifacts, otimizações Rust |
| Post-6 | `ce0f886` + `ad0f5cb` | Probe FFprobe + transcodificação HLS/MP4 + AudioSelectModal + `rePickCounter` |
| Post-6 | `e1648ea` | `playerService` atualizado: `AudioStreamInfo.relativeIndex`, `SubtitleStreamInfo` |
| 24/Jun/2026 | (sessão atual) | **Bug fix #1:** reset do `remember` em `PlayerChoiceModal`; **Bug fix #2:** botão "Trocar idioma" visível em todos os estados + badge de idioma ativo (`activeAudioStream`) |

---

## 11. Aprendizados e Decisões Não Óbvias

**Por que não é HLS real?**
O nome `api/hls` é enganador — o output não é um playlist `.m3u8` com segmentos. O servidor produz um único arquivo MP4 com `-movflags +faststart` (atom `moov` no início do arquivo) e o serve via range requests. Isso é mais simples, mais rápido para arquivos de episódios (30–45min → ~30-60s de transcodificação), e elimina toda a complexidade de segmentação e manifesto HLS. O Vidstack recebe um `video/mp4` normal e faz seek nativamente.

**Por que `muted` durante a transcodificação?**
Enquanto o FFmpeg roda, o player já está montado com o raw stream (o usuário vê o vídeo imediatamente). Mas esse stream tem áudio no codec errado (ex.: AC3) que o WebView2 rejeita. Para não deixar silêncio confuso ou um erro de codec visível, o player é colocado em `muted={isTranscoding}`. Quando o MP4 fica pronto, a fonte troca, o mute sai.

**Por que `selectedCodec` é capturado antes do await?**
```typescript
const selectedStream = audioStreams.find((s) => s.relativeIndex === selectedAudioIndex) ?? null;
const selectedCodec = selectedStream?.codec ?? probe.audioCodec ?? "unknown";
setActiveAudioStream(selectedStream); // ← antes do await startHlsSession
setTranscode({ status: "transcoding", codec: selectedCodec });
const session = await startHlsSession(...);
```
Se `selectedStream` fosse capturado depois do `await`, a closure do efeito poderia estar rodando com state React obsoleto (o componente pode ter re-renderizado durante a espera). Capturar antes do primeiro `await` garante consistência.

**Por que `relativeIndex` e não o índice global?**
FFmpeg usa `-map 0:a:N` para selecionar a N-ésima faixa de áudio (contando apenas áudio). Se usássemos o índice global `0:N`, um arquivo com streams misturados (video + audio + legenda + attachments) produziria um mapeamento incorreto. O `relativeIndex` espelha exatamente o que o FFmpeg espera.

---

## 12. Próximos Passos (Roadmap)

- **`NowPlayingBar`** — overlay persistente no layout para sessões de player externo (conforme ADR-03 do Blueprint), substituindo a página `/watching` como rota dedicada.
- **Progresso real para player externo** — integração com a interface HTTP do VLC (`/requests/status.json`) como opt-in para usuários que o têm instalado, eliminando a necessidade do estimador de wall-clock.
- **Suporte a `libmpv` embutido** — considerado para 2.1; eliminaria a dependência de FFmpeg instalado para a transcodificação de áudio.
- **Seleção de legenda embutida no modal inicial** — hoje legendas sidecar são injetadas via `<Track>` no Vidstack após o player montar; unificar a escolha de idioma de áudio e legenda no mesmo modal pré-playback.
