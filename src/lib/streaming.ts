// This module is server-only — it accesses Prisma and the filesystem.
import "server-only";

import { promises as fsPromises } from "fs";
import { prisma } from "@/lib/prisma";

/**
 * Normalizes path separators to forward slashes and optionally lowercases
 * for case-insensitive comparison on Windows.
 */
function normalizeSep(p: string): string {
  const forward = p.replace(/\\/g, "/");
  return process.platform === "win32" ? forward.toLowerCase() : forward;
}

/**
 * Resolves a raw path from a query param and checks it against the set of
 * known library roots stored in the Folder table.
 *
 * Uses `realpath()` (not `path.resolve()`) so that symlinks pointing outside
 * a registered folder are dereferenced before the guard check — preventing
 * symlink traversal attacks (LSF-2026-001).
 *
 * The trailing-slash normalisation on `root` prevents a folder path like
 * `/media/movies` from matching `/media/movies2`.
 *
 * Returns `{ resolved }` on success, or `{ error, status }` on failure.
 */
export async function resolveAndGuardPath(
  rawPath: string | null | undefined,
): Promise<{ resolved: string } | { error: string; status: number }> {
  if (!rawPath) {
    return { error: "Missing path", status: 400 };
  }

  let resolved: string;
  try {
    // realpath() resolves BOTH `..` components AND symlinks at the OS level.
    // If the file does not exist or a symlink is broken, it throws — treated as 404.
    resolved = await fsPromises.realpath(rawPath);
  } catch {
    return { error: "File not found", status: 404 };
  }

  const db = await prisma();
  // take: 1000 — sanity cap; no legitimate user has >1000 library folders (LSF-2026-006)
  const folders = await db.folder.findMany({ select: { path: true }, take: 1000 });

  // Normalize the resolved path once for comparison. On Windows the separator
  // is `\` but the guard check must be consistent regardless of which side
  // produced the path, so we convert everything to `/` and lowercase on
  // Windows (case-insensitive filesystem).
  const normalizedResolved = normalizeSep(resolved);

  const allowed = folders.some((f) => {
    const normalizedFolder = normalizeSep(f.path);
    // Ensure the root always ends with `/` so `/media/movies` does not
    // accidentally match `/media/movies2`.
    const root = normalizedFolder.endsWith("/") ? normalizedFolder : normalizedFolder + "/";
    return normalizedResolved.startsWith(root) || normalizedResolved === normalizedFolder;
  });

  if (!allowed) {
    return { error: "Forbidden", status: 403 };
  }

  return { resolved };
}
