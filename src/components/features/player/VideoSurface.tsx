"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MediaPlayer, MediaOutlet } from "@vidstack/react";
import "vidstack/styles/defaults.css";
import "vidstack/styles/community-skin/video.css";
import type { PlayableItem } from "@/stores/playerStore";
import { usePlayerStore } from "@/stores/playerStore";
import {
  buildStreamUrl,
  buildSubtitleUrl,
  getResume,
  listSidecarSubtitles,
  saveProgress,
} from "@/services/playerService";
import type { SubtitleEntry } from "@/types/player";
import { SpeedMenu } from "./SpeedMenu";
import { AudioTrackMenu } from "./AudioTrackMenu";
import { SubtitleMenu } from "./SubtitleMenu";

const AUTOSAVE_INTERVAL_MS = 10_000;
// Mark as completed when 90% of duration has been watched.
const COMPLETION_THRESHOLD = 0.9;

// Minimal shape of the properties we access on the player element at runtime.
// Vidstack v0.6.x exposes these through InferComponentMembers on the custom
// element but the TypeScript types are not reliably picked up in all tsconfig
// setups, so we narrow them explicitly here.
interface VidstackPlayerEl extends EventTarget {
  currentTime: number;
  audioTracks: Iterable<{ id: string; label: string; language: string; selected: boolean }>;
  textTracks: {
    add(init: { src: string; kind: string; label: string; language: string }): void;
    [Symbol.iterator](): Iterator<{
      kind: string;
      label: string;
      language: string;
      src?: string;
      mode: string;
    }>;
  };
}

interface VideoSurfaceProps {
  item: PlayableItem;
  onEnded: () => void;
  onClose: () => void;
  onUnsupported: () => void;
}

export function VideoSurface({ item, onEnded, onClose, onUnsupported }: VideoSurfaceProps) {
  // The ref type is `object` on the React level; we cast to our narrow interface
  // when we need to access player members at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [sidecars, setSidecars] = useState<SubtitleEntry[]>([]);
  const [audioTracks, setAudioTracks] = useState<
    Array<{ id: string; label: string; language?: string }>
  >([]);
  const [embeddedTextTracks, setEmbeddedTextTracks] = useState<
    Array<{ id: string; label: string; language?: string }>
  >([]);

  const {
    positionSeconds,
    durationSeconds,
    playbackRate,
    activeAudioTrackId,
    activeTextTrackId,
    setPosition,
    setDuration,
    setPlaybackRate,
    setAudioTrack,
    setTextTrack,
  } = usePlayerStore();

  // Keep stable refs for position/duration so the autosave closure
  // always sees current values without needing re-subscription.
  const positionRef = useRef(positionSeconds);
  const durationRef = useRef(durationSeconds);
  positionRef.current = positionSeconds;
  durationRef.current = durationSeconds;

  // Keep stable refs for the callbacks that change each render.
  const onEndedRef = useRef(onEnded);
  const onUnsupportedRef = useRef(onUnsupported);
  onEndedRef.current = onEnded;
  onUnsupportedRef.current = onUnsupported;

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

  const getPlayer = (): VidstackPlayerEl | null =>
    playerRef.current as VidstackPlayerEl | null;

  // Load sidecar subtitles on mount and register them with the player.
  useEffect(() => {
    let cancelled = false;
    listSidecarSubtitles(item.filePath)
      .then((subs) => {
        if (cancelled) return;
        setSidecars(subs);
        const player = getPlayer();
        if (!player) return;
        for (const sub of subs) {
          player.textTracks.add({
            src: buildSubtitleUrl(sub.path),
            kind: "subtitles",
            label: sub.label,
            language: sub.lang,
          });
        }
      })
      .catch(() => setSidecars([]));
    return () => { cancelled = true; };
  }, [item.filePath]);

  // Autosave interval — set up once per item, tear down on unmount.
  useEffect(() => {
    autosaveTimerRef.current = setInterval(() => {
      saveProgress(buildSaveOpts()).catch(console.error);
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      if (autosaveTimerRef.current !== null) clearInterval(autosaveTimerRef.current);
      // Final save on unmount (e.g. when the modal is closed).
      saveProgress(buildSaveOpts()).catch(console.error);
    };
  }, [buildSaveOpts]);

  // Attach DOM event listeners once the player element is in the DOM.
  useEffect(() => {
    const player = getPlayer();
    if (!player) return;

    const onCanPlay = async () => {
      const resume = await getResume(item.mediaId, item.episodeId).catch(() => null);
      if (resume && resume.positionSeconds > 5) {
        player.currentTime = resume.positionSeconds;
      }

      setAudioTracks(
        Array.from(player.audioTracks).map((t, i) => ({
          id: String(i),
          label: (t as { label: string }).label || `Audio ${i + 1}`,
          language: (t as { language?: string }).language || undefined,
        })),
      );

      setEmbeddedTextTracks(
        Array.from(player.textTracks)
          .filter((t) => t.kind === "subtitles" || t.kind === "captions")
          .map((t, i) => ({
            id: String(i),
            label: t.label || `Sub ${i + 1}`,
            language: t.language || undefined,
          })),
      );
    };

    const onTimeUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ currentTime: number }>).detail;
      if (detail) setPosition(detail.currentTime);
    };

    const onDurationChange = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      if (typeof detail === "number") setDuration(detail);
    };

    const onPause = () => {
      saveProgress(buildSaveOpts()).catch(console.error);
    };

    const onEndedHandler = () => {
      saveProgress({ ...buildSaveOpts(), completed: true }).catch(console.error);
      onEndedRef.current();
    };

    const onErrorHandler = () => {
      onUnsupportedRef.current();
    };

    player.addEventListener("can-play", onCanPlay);
    player.addEventListener("time-update", onTimeUpdate);
    player.addEventListener("duration-change", onDurationChange);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onEndedHandler);
    player.addEventListener("error", onErrorHandler);

    return () => {
      player.removeEventListener("can-play", onCanPlay);
      player.removeEventListener("time-update", onTimeUpdate);
      player.removeEventListener("duration-change", onDurationChange);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onEndedHandler);
      player.removeEventListener("error", onErrorHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.mediaId, item.episodeId, buildSaveOpts, setPosition, setDuration]);

  const handleSelectAudioTrack = (id: string) => {
    setAudioTrack(id);
    const player = getPlayer();
    if (!player) return;
    const tracks = Array.from(player.audioTracks) as Array<{
      selected: boolean;
    }>;
    const idx = Number(id);
    if (tracks[idx]) tracks[idx].selected = true;
  };

  const handleSelectEmbeddedSubtitle = (trackId: string | undefined) => {
    setTextTrack(trackId);
    const player = getPlayer();
    if (!player) return;
    Array.from(player.textTracks).forEach((t, i) => {
      if (t.kind === "subtitles" || t.kind === "captions") {
        t.mode = trackId !== undefined && String(i) === trackId ? "showing" : "disabled";
      }
    });
  };

  const handleSelectSidecarSubtitle = (path: string) => {
    setTextTrack(`sidecar:${path}`);
    const player = getPlayer();
    if (!player) return;
    const targetSrc = buildSubtitleUrl(path);
    Array.from(player.textTracks).forEach((t) => {
      if (t.kind === "subtitles" || t.kind === "captions") {
        t.mode = t.src === targetSrc ? "showing" : "disabled";
      }
    });
  };

  return (
    <div className="relative flex flex-col flex-1 bg-black">
      <MediaPlayer
        ref={playerRef}
        src={buildStreamUrl(item.filePath)}
        title={item.title}
        playbackRate={playbackRate}
        className="w-full h-full"
      >
        <MediaOutlet />
      </MediaPlayer>

      {/* Custom controls overlay — speed / audio / subtitle menus */}
      <div className="absolute bottom-14 right-4 z-10 flex items-center gap-1">
        <SpeedMenu currentRate={playbackRate} onSelect={setPlaybackRate} />
        <AudioTrackMenu
          tracks={audioTracks}
          activeId={activeAudioTrackId}
          onSelect={handleSelectAudioTrack}
        />
        <SubtitleMenu
          embedded={embeddedTextTracks}
          sidecars={sidecars}
          activeId={activeTextTrackId}
          onSelectEmbedded={handleSelectEmbeddedSubtitle}
          onSelectSidecar={handleSelectSidecarSubtitle}
        />
      </div>
    </div>
  );
}
