import { redirectToExternalLink } from "@/lib/external-link";

export const MYSTERY_LINK = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const STORAGE_KEY = "critix:easter-egg:v1";

type EasterClue = "help" | "home-no-folder" | "empty-scan";

interface EasterEggState {
  unlocked: EasterClue[];
  completedAt?: string;
}

const REQUIRED_CLUES: EasterClue[] = ["help", "home-no-folder", "empty-scan"];

function isClient() {
  return typeof window !== "undefined";
}

function readState(): EasterEggState {
  if (!isClient()) return { unlocked: [] };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: [] };
    const parsed = JSON.parse(raw) as EasterEggState;
    return {
      unlocked: Array.isArray(parsed.unlocked)
        ? parsed.unlocked.filter((value): value is EasterClue => REQUIRED_CLUES.includes(value as EasterClue))
        : [],
      completedAt: parsed.completedAt,
    };
  } catch {
    return { unlocked: [] };
  }
}

function writeState(state: EasterEggState) {
  if (!isClient()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isCompleted(unlocked: EasterClue[]) {
  return REQUIRED_CLUES.every((clue) => unlocked.includes(clue));
}

export function getEasterEggProgress() {
  const state = readState();
  return {
    unlocked: state.unlocked,
    completed: isCompleted(state.unlocked),
    totalRequired: REQUIRED_CLUES.length,
  };
}

export async function registerEasterEggClue(clue: EasterClue) {
  const state = readState();
  const alreadyUnlocked = state.unlocked.includes(clue);
  const wasCompleted = !!state.completedAt;

  if (!alreadyUnlocked) {
    state.unlocked.push(clue);
  }

  const completed = isCompleted(state.unlocked);
  if (completed && !state.completedAt) {
    state.completedAt = new Date().toISOString();
  }

  writeState(state);

  if (completed && !wasCompleted) {
    await redirectToExternalLink(MYSTERY_LINK);
  }

  return {
    unlocked: state.unlocked,
    completed,
    justUnlocked: !alreadyUnlocked,
  };
}
