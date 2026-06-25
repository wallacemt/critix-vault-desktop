"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  useMediaState,
  useMediaRemote,
} from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Volume2, Languages } from "lucide-react";
import { FfmpegInstallModal } from "./FfmpegInstallModal";
import { PlayerContextMenu } from "./PlayerContextMenu";

import type { PlayableItem } from "@/stores/playerStore";
import { usePlayerStore } from "@/stores/playerStore";
import {
  buildStreamUrl,
  buildSubtitleUrl,
  buildEmbeddedSubtitleUrl,
  getMimeType,
  getResume,
  listSidecarSubtitles,
  saveProgress,
  probeAudio,
  startHlsSession,
  stopHlsSession,
} from "@/services/playerService";
import type { SubtitleEntry, SubtitleStreamInfo, AudioStreamInfo } from "@/types/player";

const AUTOSAVE_INTERVAL_MS = 10_000;
const COMPLETION_THRESHOLD = 0.9;

function audioLabel(stream: AudioStreamInfo): string {
  if (stream.title) return stream.title;
  if (stream.language) return stream.language.toUpperCase();
  return `Faixa ${stream.relativeIndex + 1}`;
}

// ── Inner headless logic component (needs MediaPlayer context for hooks) ──────

interface PlayerLogicProps {
  item: PlayableItem;
  onEnded: () => void;
  onUnsupported: () => void;
  resumeTime: number;
  /** One-shot seek override applied after a source switch (transcode ready). */
  seekOnReadyRef: React.MutableRefObject<number | null>;
}

function PlayerLogic({ item, onEnded, onUnsupported, resumeTime, seekOnReadyRef }: PlayerLogicProps) {
  const currentTime = useMediaState("currentTime");
  const duration = useMediaState("duration");
  const paused = useMediaState("paused");
  const canPlay = useMediaState("canPlay");
  const ended = useMediaState("ended");
  const error = useMediaState("error");
  const mediaPlaybackRate = useMediaState("playbackRate");
  const remote = useMediaRemote();

  const { setPosition, setDuration, setPlaybackRate } = usePlayerStore();

  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const resumeAppliedRef = useRef(false);
  const prevPausedRef = useRef(true);
  const onEndedRef = useRef(onEnded);
  const onUnsupportedRef = useRef(onUnsupported);

  onEndedRef.current = onEnded;
  onUnsupportedRef.current = onUnsupported;
  positionRef.current = currentTime;
  durationRef.current = duration;

  useEffect(() => { setPosition(currentTime); }, [currentTime, setPosition]);
  useEffect(() => { setDuration(duration); }, [duration, setDuration]);
  useEffect(() => { setPlaybackRate(mediaPlaybackRate); }, [mediaPlaybackRate, setPlaybackRate]);

  // Hard decode error → fall back to external player
  useEffect(() => {
    if (error) onUnsupportedRef.current();
  }, [error]);

  // Apply resume offset (or source-switch seek) the first time the player is ready.
  useEffect(() => {
    if (!canPlay) return;

    // One-shot: seek to the saved position after the transcoded source is loaded.
    if (seekOnReadyRef.current !== null) {
      remote.seek(seekOnReadyRef.current);
      seekOnReadyRef.current = null;
      resumeAppliedRef.current = true;
      return;
    }

    if (resumeAppliedRef.current) return;
    resumeAppliedRef.current = true;
    if (resumeTime > 5) remote.seek(resumeTime);
  }, [canPlay, resumeTime, remote, seekOnReadyRef]);

  useEffect(() => {
    resumeAppliedRef.current = false;
  }, [item.mediaId, item.episodeId]);

  const buildSaveOpts = useCallback(
    () => ({
      mediaId: item.mediaId,
      episodeId: item.episodeId,
      mediaType: item.mediaType,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
      positionSeconds: positionRef.current,
      durationSeconds: durationRef.current,
      completed:
        durationRef.current > 0 &&
        positionRef.current / durationRef.current >= COMPLETION_THRESHOLD,
    }),
    [item.mediaId, item.episodeId, item.mediaType, item.seasonNumber, item.episodeNumber],
  );

  useEffect(() => {
    if (!ended) return;
    saveProgress({ ...buildSaveOpts(), completed: true }).catch(console.error);
    onEndedRef.current();
  }, [ended, buildSaveOpts]);

  useEffect(() => {
    const timer = setInterval(
      () => saveProgress(buildSaveOpts()).catch(console.error),
      AUTOSAVE_INTERVAL_MS,
    );
    return () => {
      clearInterval(timer);
      saveProgress(buildSaveOpts()).catch(console.error);
    };
  }, [buildSaveOpts]);

  useEffect(() => {
    if (paused && !prevPausedRef.current) {
      saveProgress(buildSaveOpts()).catch(console.error);
    }
    prevPausedRef.current = paused;
  }, [paused, buildSaveOpts]);

  return null;
}

// ── Main VideoSurface component ───────────────────────────────────────────────

type TranscodeState =
  | { status: "idle" }
  | { status: "probing" }
  // User must pick which audio track to transcode (shown before FFmpeg starts).
  | { status: "selecting-audio"; streams: AudioStreamInfo[]; codec: string }
  // FFmpeg running in background; player shows raw stream so the user sees video immediately.
  | { status: "transcoding"; codec: string }
  | { status: "ready"; videoUrl: string; sessionId: string; codec: string }
  | { status: "error"; audioCodec: string };

interface VideoSurfaceProps {
  item: PlayableItem;
  onEnded: () => void;
  onClose: () => void;
  onUnsupported: () => void;
}

export function VideoSurface({ item, onEnded, onClose: _onClose, onUnsupported }: VideoSurfaceProps) {
  const [sidecars, setSidecars] = useState<SubtitleEntry[]>([]);
  const [embeddedSubs, setEmbeddedSubs] = useState<SubtitleStreamInfo[]>([]);
  const [resumeTime, setResumeTime] = useState(0);
  // Start in "probing" so the player never mounts before we know the source.
  // Starting in "idle" would cause MediaPlayer to render with the direct stream
  // before the probe runs (useEffect fires after the render), producing silent
  // playback on files with unsupported audio codecs.
  const [transcode, setTranscode] = useState<TranscodeState>({ status: "probing" });
  const { playbackRate } = usePlayerStore();

  // One-shot seek after a transcoded source is loaded mid-playback.
  const seekOnReadyRef = useRef<number | null>(null);

  // Track the active HLS session so we can stop it on unmount / item change.
  const activeSessionRef = useRef<string | null>(null);

  // Context-menu state: cursor position or null when hidden.
  const [ctxMenuPos, setCtxMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Resolver for the audio-selection promise; called when the user picks a track.
  const audioSelectCallbackRef = useRef<((index: number | null) => void) | null>(null);

  // Counter that re-triggers the probe+audio-select+transcode flow when incremented.
  // Used by the "Trocar Idioma" button so the user can change audio mid-playback.
  const [rePickCounter, setRePickCounter] = useState(0);

  // Whether the last probe found multiple audio streams (decides if button is shown).
  const hasMultipleAudioRef = useRef(false);

  // The audio stream that is currently loaded (shown as a badge on "Trocar idioma").
  const [activeAudioStream, setActiveAudioStream] = useState<AudioStreamInfo | null>(null);

  const stopActiveSession = useCallback(async () => {
    if (activeSessionRef.current) {
      await stopHlsSession(activeSessionRef.current);
      activeSessionRef.current = null;
    }
  }, []);

  // When item changes: stop previous HLS session, reset state, re-probe.
  useEffect(() => {
    let cancelled = false;
    // Aborting this controller kills the in-flight startHlsSession fetch, which triggers
    // the server-side request.signal listener to SIGTERM FFmpeg immediately.
    const abortCtrl = new AbortController();

    // Containers that can embed unsupported codecs (AC3/DTS/EAC3).
    // Everything else (MP4, WebM) is safe and skips the probe.
    const AT_RISK = new Set([".mkv", ".avi", ".mov", ".ts", ".m2ts"]);

    const init = async () => {
      await stopActiveSession();
      if (cancelled) return;

      const ext = item.filePath.slice(item.filePath.lastIndexOf(".")).toLowerCase();

      // Fast-path: safe containers never need transcoding.
      if (!AT_RISK.has(ext)) {
        setEmbeddedSubs([]);
        setTranscode({ status: "idle" });
        return;
      }

      setTranscode({ status: "probing" });

      const probe = await probeAudio(item.filePath);
      if (cancelled) return;

      setEmbeddedSubs(probe.subtitleStreams ?? []);
      const audioStreams = probe.audioStreams ?? [];
      hasMultipleAudioRef.current = audioStreams.length > 1;

      // No unsupported codecs and only one track → play raw stream directly.
      if (!probe.needsTranscode && audioStreams.length <= 1) {
        setActiveAudioStream(audioStreams[0] ?? null);
        setTranscode({ status: "idle" });
        return;
      }

      // ── Determine which audio stream to transcode ─────────────────────────
      let selectedAudioIndex = 0;

      if (audioStreams.length > 1) {
        // Multiple audio tracks: always ask which language the user wants,
        // even when the first stream's codec is supported — another stream may not be.
        const selected = await new Promise<number | null>((resolve) => {
          audioSelectCallbackRef.current = resolve;
          setTranscode({
            status: "selecting-audio",
            streams: audioStreams,
            codec: probe.audioCodec ?? "unknown",
          });
          // Resolve with null if the page unmounts while the modal is open.
          abortCtrl.signal.addEventListener("abort", () => resolve(null), { once: true });
        });
        audioSelectCallbackRef.current = null;
        if (selected === null || cancelled) return;
        selectedAudioIndex = selected;

        // Only skip transcode when the user chose the default track (index 0) and
        // no stream needs re-encoding. Choosing any non-default track requires
        // a transcode so FFmpeg outputs only that audio track — Vidstack/WebView2
        // cannot reliably switch audio tracks in raw MKV containers.
        const selectedStream = audioStreams.find((s) => s.relativeIndex === selectedAudioIndex);
        if (selectedStream && !selectedStream.needsTranscode && !probe.needsTranscode && selectedAudioIndex === 0) {
          setActiveAudioStream(selectedStream);
          setTranscode({ status: "idle" });
          return;
        }
      }

      // ── Start FFmpeg; player shows raw stream (muted) while FFmpeg runs ───
      const selectedStream = audioStreams.find((s) => s.relativeIndex === selectedAudioIndex) ?? null;
      const selectedCodec = selectedStream?.codec ?? probe.audioCodec ?? "unknown";
      setActiveAudioStream(selectedStream);
      setTranscode({ status: "transcoding", codec: selectedCodec });

      const session = await startHlsSession(item.filePath, selectedAudioIndex, abortCtrl.signal);
      if (cancelled) return;

      if (!session) {
        setTranscode({ status: "error", audioCodec: probe.audioCodec ?? "desconhecido" });
        return;
      }

      // Read the current position imperatively so we capture the position at the
      // moment FFmpeg finishes (30-60 s after the effect fired), not at mount time.
      const pos = usePlayerStore.getState().positionSeconds;
      seekOnReadyRef.current = pos > 1 ? pos : 0;

      activeSessionRef.current = session.sessionId;
      setTranscode({
        status: "ready",
        videoUrl: session.hlsUrl,
        sessionId: session.sessionId,
        codec: selectedCodec,
      });
    };

    init().catch(console.error);
    return () => {
      cancelled = true;
      audioSelectCallbackRef.current?.(null); // dismiss audio picker if open
      abortCtrl.abort();                       // kills in-flight startHlsSession → server kills FFmpeg
    };
  // rePickCounter is intentionally included: incrementing it re-runs the full
  // probe → audio selection → transcode flow so the user can change audio language.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.filePath, item.mediaId, item.episodeId, stopActiveSession, rePickCounter]);

  // Stop the HLS session when the component unmounts.
  useEffect(() => () => { stopActiveSession(); }, [stopActiveSession]);

  // Load sidecar subtitle files alongside the video.
  useEffect(() => {
    listSidecarSubtitles(item.filePath)
      .then(setSidecars)
      .catch(() => setSidecars([]));
  }, [item.filePath]);

  // Fetch last saved position for resume logic.
  useEffect(() => {
    getResume(item.mediaId, item.episodeId)
      .then((r) => setResumeTime(r?.positionSeconds ?? 0))
      .catch(() => setResumeTime(0));
  }, [item.mediaId, item.episodeId]);

  // Stable source object — new reference on every render causes Vidstack to
  // tear down and remount the <video> element (black screen).
  const playerSrc = useMemo(() => {
    if (transcode.status === "ready") {
      return { src: transcode.videoUrl, type: "video/mp4" };
    }
    return { src: buildStreamUrl(item.filePath), type: getMimeType(item.filePath) };
  }, [item.filePath, transcode]);

  const isProbing = transcode.status === "probing";
  const isSelectingAudio = transcode.status === "selecting-audio";
  const isTranscoding = transcode.status === "transcoding";

  // Player mounts as soon as probe+selection are done (even while FFmpeg is still running).
  const playerReady = !isProbing && !isSelectingAudio;

  // While FFmpeg is running, the raw stream (with unsupported audio codec) is expected to
  // fail in WebView2. Suppress the external-player fallback so the transcode can finish.
  const handleUnsupported = useCallback(() => {
    if (isTranscoding) return;
    onUnsupported();
  }, [isTranscoding, onUnsupported]);

  // Re-run audio selection and re-transcode with the new chosen track.
  function handleRePick() {
    seekOnReadyRef.current = usePlayerStore.getState().positionSeconds;
    setRePickCounter((c) => c + 1);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setCtxMenuPos({ x: e.clientX, y: e.clientY });
  }

  return (
    <div
      className="relative flex-1 min-h-0"
      onContextMenu={handleContextMenu}
    >
      {/* Probe loading overlay — only shown during the fast ffprobe step (1-3 s) */}
      <AnimatePresence>
        {isProbing && (
          <motion.div
            key="probe-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black"
          >
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-sm text-white/70">Verificando codec de áudio...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio track selection modal — shown when the file has multiple audio languages */}
      <AnimatePresence>
        {isSelectingAudio && transcode.status === "selecting-audio" && (
          <motion.div
            key="audio-select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className="w-80 rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl
                         shadow-2xl p-5"
            >
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="text-sm font-semibold text-white">Idioma de Áudio</h2>
              </div>
              <p className="text-xs text-zinc-500 mb-4 ml-9">
                Codec {transcode.codec.toUpperCase()} — escolha a faixa antes de iniciar.
              </p>

              <div className="flex flex-col gap-1.5">
                {transcode.streams.map((stream, i) => {
                  const label =
                    stream.title ||
                    (stream.language ? stream.language.toUpperCase() : null) ||
                    `Faixa ${i + 1}`;
                  const detail = `${stream.codec.toUpperCase()} · ${stream.channels}ch`;
                  return (
                    <button
                      key={stream.relativeIndex}
                      onClick={() => audioSelectCallbackRef.current?.(stream.relativeIndex)}
                      className="flex items-center justify-between w-full rounded-xl px-3 py-2.5
                                 border border-white/8 bg-white/4 hover:bg-amber-500/10
                                 hover:border-amber-500/30 transition-all text-left group"
                    >
                      <span className="text-sm font-medium text-white/80 group-hover:text-amber-300 transition-colors">
                        {label}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">{detail}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FFmpeg not found — show installation guide modal */}
      <AnimatePresence>
        {transcode.status === "error" && (
          <FfmpegInstallModal
            audioCodec={transcode.audioCodec}
            onOpenExternal={onUnsupported}
            onDismiss={() => setTranscode({ status: "idle" })}
          />
        )}
      </AnimatePresence>

      {/* Non-blocking transcoding badge — video is already visible while FFmpeg runs */}
      <AnimatePresence>
        {isTranscoding && (
          <motion.div
            key="transcoding-badge"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2
                       rounded-full px-3 py-1.5 text-xs font-medium
                       bg-black/70 border border-amber-500/30 text-amber-300 backdrop-blur-sm"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            Preparando áudio ({(transcode as { codec: string }).codec.toUpperCase()} → AAC) — sem som até finalizar...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-left info bar: transcode badge + "Trocar idioma" button.
          The button is always visible while the player is ready and the file has
          multiple audio tracks (idle, transcoding, or ready state), so the user
          can re-open the language picker at any time. */}
      {playerReady && (transcode.status === "ready" || hasMultipleAudioRef.current) && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
          {transcode.status === "ready" && (
            <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium
                            bg-amber-500/15 border border-amber-500/30 text-amber-300 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Áudio recodificado ({transcode.codec.toUpperCase()} → AAC)
            </div>
          )}
          {hasMultipleAudioRef.current && (
            <button
              onClick={handleRePick}
              title="Trocar idioma de áudio"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium
                         bg-zinc-800/80 border border-white/15 text-white/70
                         hover:text-white hover:bg-zinc-700/80 hover:border-white/30
                         backdrop-blur-sm transition-all"
            >
              <Languages className="w-3.5 h-3.5" />
              Trocar idioma
              {activeAudioStream && (
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/50
                                 text-[10px] font-mono leading-none tracking-wide">
                  {audioLabel(activeAudioStream)}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {playerReady && (
        <MediaPlayer
          src={playerSrc.src}
          title={item.title}
          playbackRate={playbackRate}
          muted={isTranscoding}
          className="h-full w-full"
        >
          <MediaProvider>
            {/* Sidecar subtitle files (.srt / .vtt) */}
            {sidecars.map((sub) => (
              <Track
                key={`sidecar:${sub.path}`}
                src={buildSubtitleUrl(sub.path)}
                kind="subtitles"
                type="vtt"
                label={sub.label}
                language={sub.lang}
              />
            ))}

            {/* Embedded subtitle streams extracted on-demand via ffmpeg */}
            {embeddedSubs.map((sub) => (
              <Track
                key={`embedded:${sub.relativeIndex}`}
                src={buildEmbeddedSubtitleUrl(item.filePath, sub.relativeIndex)}
                kind="subtitles"
                type="vtt"
                label={sub.title ?? sub.language ?? `Legenda ${sub.relativeIndex + 1}`}
                language={sub.language ?? "und"}
              />
            ))}
          </MediaProvider>

          {/* Full controls: timeline, seek, time display, speed, CC, audio tracks */}
          <DefaultVideoLayout icons={defaultLayoutIcons} />

          {/* Headless logic — inside MediaPlayer for hook access */}
          <PlayerLogic
            item={item}
            onEnded={onEnded}
            onUnsupported={handleUnsupported}
            resumeTime={resumeTime}
            seekOnReadyRef={seekOnReadyRef}
          />

          {/* Custom right-click context menu */}
          {ctxMenuPos && (
            <PlayerContextMenu
              x={ctxMenuPos.x}
              y={ctxMenuPos.y}
              onClose={() => setCtxMenuPos(null)}
              onOpenExternal={onUnsupported}
            />
          )}
        </MediaPlayer>
      )}
    </div>
  );
}
