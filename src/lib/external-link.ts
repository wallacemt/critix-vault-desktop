const isClient = () => typeof window !== "undefined";

export async function openExternalLink(url: string): Promise<void> {
  if (!isClient()) return;

  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  } catch (error) {
    console.warn("Falling back to window.open for external link:", error);
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function redirectToExternalLink(url: string): Promise<void> {
  if (!isClient()) return;

  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  } catch (error) {
    console.warn("Falling back to location.assign for external redirect:", error);
  }

  window.location.assign(url);
}
