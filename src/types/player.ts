export interface SubtitleEntry {
  label: string;
  lang: string;
  path: string;
}

export interface PlaybackTrack {
  id: string;
  label: string;
  language?: string;
}

export interface SubtitleStreamInfo {
  relativeIndex: number;
  codec: string;
  language: string | null;
  title: string | null;
}
