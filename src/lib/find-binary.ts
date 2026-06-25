import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const execAsync = promisify(exec);

// Resolved paths are cached for the lifetime of the process.
const cache = new Map<string, string | null>();

/**
 * Find the absolute path of a binary, with multiple fallback strategies.
 *
 * Problem: Node.js inherits the PATH that existed when the process started.
 * On Windows, this often misses user-installed tools (winget, scoop, choco)
 * when Tauri was launched from WSL or before the tool was installed.
 *
 * Strategy:
 *   1. Shell `where`/`which` — works in standard environments.
 *   2. PowerShell registry read — reads HKCU+HKLM PATH at call-time, bypassing
 *      the inherited environment. Works when launched from WSL.
 *   3. Hard-coded common paths — last resort for known install locations.
 */
export async function findBinary(name: string): Promise<string | null> {
  if (cache.has(name)) return cache.get(name) ?? null;

  let found: string | null = null;

  // ── Step 1: shell PATH (fast, works in standard environments) ────────────
  try {
    const cmd = process.platform === "win32" ? `where "${name}"` : `which "${name}"`;
    const { stdout } = await execAsync(cmd, { timeout: 5_000 });
    found = stdout.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? null;
  } catch { /* not in inherited PATH */ }

  // ── Step 2 (Windows only): read PATH from registry via PowerShell ─────────
  // This is the key fallback: PowerShell's [System.Environment]::GetEnvironmentVariable
  // reads from the Windows registry directly, not from the inherited environment.
  // It finds binaries installed after the process started, or in WSL contexts.
  if (!found && process.platform === "win32") {
    const exe = `${name}.exe`;
    // Build a single-line PowerShell command: read machine+user PATH from
    // registry, expand variables, search for the exe, return first match.
    const ps = [
      `$m=[System.Environment]::GetEnvironmentVariable('PATH','Machine');`,
      `$u=[System.Environment]::GetEnvironmentVariable('PATH','User');`,
      `($m+';'+$u).Split(';')`,
      `|%{[System.Environment]::ExpandEnvironmentVariables($_.Trim())}`,
      `|?{$_ -ne '' -and (Test-Path (Join-Path $_ '${exe}'))}`,
      `|%{Join-Path $_ '${exe}'}`,
      `|Select-Object -First 1`,
    ].join("");

    try {
      const { stdout } = await execAsync(
        `powershell.exe -NoProfile -NonInteractive -Command "${ps}"`,
        { timeout: 10_000 },
      );
      found = stdout.trim() || null;
    } catch { /* PowerShell unavailable or failed */ }
  }

  // ── Step 3 (Windows only): check well-known install directories ───────────
  if (!found && process.platform === "win32") {
    const home = homedir();
    const exe = `${name}.exe`;
    const candidates = [
      // winget (creates symlinks in the Links folder, which is on user PATH)
      join(home, "AppData", "Local", "Microsoft", "WinGet", "Links", exe),
      // scoop shims
      join(home, "scoop", "shims", exe),
      // chocolatey
      `C:\\ProgramData\\chocolatey\\bin\\${exe}`,
      // manual installations
      `C:\\ffmpeg\\bin\\${exe}`,
      `C:\\Program Files\\ffmpeg\\bin\\${exe}`,
      `C:\\Program Files (x86)\\ffmpeg\\bin\\${exe}`,
    ];
    found = candidates.find((p) => existsSync(p)) ?? null;
  }

  if (found) console.log(`[findBinary] ${name} → ${found}`);
  else console.error(`[findBinary] ${name} not found (PATH, registry, and common paths all failed)`);

  cache.set(name, found);
  return found;
}
