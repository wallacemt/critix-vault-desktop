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
import { Loader2 } from "lucide-react";
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
import type { SubtitleEntry, SubtitleStreamInfo } from "@/types/player";

const AUTOSAVE_INTERVAL_MS = 10_000;
const COMPLETION_THRESHOLD = 0.9;

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
      positionSeconds: positionRef.current,
      durationSeconds: durationRef.current,
      completed:
        durationRef.current > 0 &&
        positionRef.current / durationRef.current >= COMPLETION_THRESHOLD,
    }),
    [item.mediaId, item.episodeId, item.mediaType],
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

  const stopActiveSession = useCallback(async () => {
    if (activeSessionRef.current) {
      await stopHlsSession(activeSessionRef.current);
      activeSessionRef.current = null;
    }
  }, []);

  // When item changes: stop previous HLS session, reset state, re-probe.
  useEffect(() => {
    let cancelled = false;

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

      // Expose embedded subtitle streams as Vidstack Track elements.
      setEmbeddedSubs(probe.subtitleStreams ?? []);

      if (!probe.needsTranscode) {
        setTranscode({ status: "idle" });
        return;
      }

      // Codec is unsupported — mount the player immediately with the raw stream so
      // the user sees video while FFmpeg transcodes audio in the background.
      setTranscode({ status: "transcoding", codec: probe.audioCodec ?? "unknown" });

      const session = await startHlsSession(item.filePath);
      if (cancelled) return;

      if (!session) {
        setTranscode({ status: "error", audioCodec: probe.audioCodec ?? "desconhecido" });
        return;
      }

      // Read the current position imperatively so we capture the position
      // at the moment FFmpeg finishes (30-60 s after the effect fired), not at mount time.
      const pos = usePlayerStore.getState().positionSeconds;
      seekOnReadyRef.current = pos > 1 ? pos : 0;

      activeSessionRef.current = session.sessionId;
      setTranscode({
        status: "ready",
        videoUrl: session.hlsUrl,
        sessionId: session.sessionId,
        codec: probe.audioCodec ?? "unknown",
      });
    };

    init().catch(console.error);
    return () => { cancelled = true; };
  }, [item.filePath, item.mediaId, item.episodeId, stopActiveSession]);

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
      // Transcoded MP4 served with Accept-Ranges — full seeking support.
      return { src: transcode.videoUrl, type: "video/mp4" };
    }
    return { src: buildStreamUrl(item.filePath), type: getMimeType(item.filePath) };
  }, [item.filePath, transcode]);

  const isProbing = transcode.status === "probing";
  const isTranscoding = transcode.status === "transcoding";

  // Player is mounted as soon as the probe finishes, even if FFmpeg is still running.
  const playerReady = !isProbing;

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setCtxMenuPos({ x: e.clientX, y: e.clientY });
  }

  return (
    <div
      className="relative flex-1 min-h-0"
      onContextMenu={handleContextMenu}
    >
      {/* Loading overlay — shown only during the fast probe (1-3 s), not during transcoding */}
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

      {/* Non-blocking transcoding badge — video is already visible while this runs */}
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
            Otimizando áudio ({(transcode as { codec: string }).codec.toUpperCase()} → AAC)...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active transcode badge — shown once FFmpeg is done */}
      {transcode.status === "ready" && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-md
                        px-2 py-1 text-xs font-medium bg-amber-500/15 border border-amber-500/30
                        text-amber-300 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Áudio recodificado ({transcode.codec.toUpperCase()} → AAC)
        </div>
      )}

      {playerReady && (
        <MediaPlayer
          src={playerSrc.src}
          title={item.title}
          playbackRate={playbackRate}
          className="h-full w-full"
        >
          <MediaProvider>
            {/* Sidecar subtitle files (.srt / .vtt) */}
            {sidecars.map((sub) => (
              <Track
                key={`sidecar:${sub.path}`}
                src={buildSubtitleUrl(sub.path)}
                kind="subtitles"
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
            onUnsupported={onUnsupported}
            resumeTime={resumeTime}
            seekOnReadyRef={seekOnReadyRef}
          />

          {/* Custom right-click context menu */}
          {ctxMenuPos && playerReady && (
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
