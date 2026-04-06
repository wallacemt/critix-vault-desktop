const isClient = () => typeof window !== "undefined";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function normalizeSafeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function tryOpenWithTauri(url: string): Promise<boolean> {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return true;
  } catch (error) {
    console.warn("Failed to open URL with Tauri opener plugin:", error);
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_external_url", { url });
    return true;
  } catch (error) {
    console.warn("Failed to open URL with native command fallback:", error);
  }

  return false;
}

export async function openExternalLink(url: string): Promise<void> {
  if (!isClient()) return;

  const safeUrl = normalizeSafeExternalUrl(url);
  if (!safeUrl) {
    console.warn("Blocked unsupported external URL:", url);
    return;
  }

  if (await tryOpenWithTauri(safeUrl)) {
    return;
  }

  const opened = window.open(safeUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.href = safeUrl;
  }
}

export async function redirectToExternalLink(url: string): Promise<void> {
  if (!isClient()) return;

  const safeUrl = normalizeSafeExternalUrl(url);
  if (!safeUrl) {
    console.warn("Blocked unsupported redirect URL:", url);
    return;
  }

  if (await tryOpenWithTauri(safeUrl)) {
    return;
  }

  window.location.assign(safeUrl);
}
