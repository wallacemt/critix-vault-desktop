// scripts/prepare-build.mjs
// Prepara os arquivos do servidor Next.js para serem embutidos no build do Tauri.
// Execute APÓS `next build` e ANTES de `tauri build`.

import { rm, mkdir, writeFile, copyFile, readdir, lstat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Recursive copy that:
 *  - Dereferences symlinks (copies their real content, never creates symlinks)
 *  - Silently skips any entry that raises EPERM / ENOENT (broken symlink, locked file…)
 *  - Optionally skips directory names listed in `skipDirs`
 */
async function cpSafe(src, dest, { skipDirs = [] } = {}) {
  let stat;
  try {
    stat = await lstat(src);
  } catch {
    return; // source disappeared or no permission to stat
  }

  if (stat.isSymbolicLink()) {
    // Skip symlinks entirely — standalone already bundles real copies
    return;
  }

  if (stat.isDirectory()) {
    const dirName = path.basename(src);
    if (skipDirs.includes(dirName)) return;

    await mkdir(dest, { recursive: true });
    let entries;
    try {
      entries = await readdir(src);
    } catch {
      return;
    }
    await Promise.all(entries.map((e) => cpSafe(path.join(src, e), path.join(dest, e), { skipDirs })));
  } else {
    await mkdir(path.dirname(dest), { recursive: true });
    try {
      await copyFile(src, dest);
    } catch {
      // EPERM on locked / protected files — skip silently
    }
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const STANDALONE = path.join(ROOT, ".next", "standalone");
const STATIC = path.join(ROOT, ".next", "static");
const PUBLIC = path.join(ROOT, "public");
const PRISMA_SRC = path.join(ROOT, "prisma");

const SERVER_DEST = path.join(ROOT, "resources", "server");
const OUT_DIR = path.join(ROOT, "out");

const SERVER_PORT = 1422;

async function main() {
  // -------------------------------------------------------
  // 1. Valida que o next build foi executado
  // -------------------------------------------------------
  if (!existsSync(STANDALONE)) {
    console.error("❌ .next/standalone não encontrado.");
    console.error("   Execute primeiro: bun run build");
    process.exit(1);
  }

  // -------------------------------------------------------
  // 2. Copia o servidor standalone → src-tauri/resources/server/
  // -------------------------------------------------------
  console.log("📦 Copiando servidor Next.js standalone...");

  if (existsSync(SERVER_DEST)) {
    await rm(SERVER_DEST, { recursive: true });
  }
  await mkdir(SERVER_DEST, { recursive: true });

  // Servidor standalone (dereferences symlinks, skips blocked native files)
  await cpSafe(STANDALONE, SERVER_DEST);

  // Assets estáticos (JS/CSS bundles)
  const staticDest = path.join(SERVER_DEST, ".next", "static");
  await cpSafe(STATIC, staticDest);
  console.log("  ✅ Assets estáticos copiados");

  // Pasta public (imagens, fontes, etc.)
  if (existsSync(PUBLIC)) {
    await cpSafe(PUBLIC, path.join(SERVER_DEST, "public"));
    console.log("  ✅ Pasta public copiada");
  }

  // Schema Prisma e banco SQLite (se existir)
  if (existsSync(PRISMA_SRC)) {
    await cpSafe(PRISMA_SRC, path.join(SERVER_DEST, "prisma"));
    console.log("  ✅ Pasta prisma copiada");
  }

  // -------------------------------------------------------
  // 3. Cria o out/ com a tela de loading/redirect para o Tauri
  // -------------------------------------------------------
  console.log("🌐 Gerando tela de loading em out/...");

  if (existsSync(OUT_DIR)) {
    await rm(OUT_DIR, { recursive: true });
  }
  await mkdir(OUT_DIR, { recursive: true });

  const loadingHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Critix Vault</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #94a3b8;
    }
    .logo { font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 1rem; }
    .logo span { color: #6366f1; }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid #1e293b;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="logo">Critix <span>Vault</span></div>
  <div class="spinner"></div>
  <p>Iniciando...</p>
</body>
</html>`;

  await writeFile(path.join(OUT_DIR, "index.html"), loadingHtml, "utf8");
  console.log("  ✅ Loading page criada em out/index.html");

  // -------------------------------------------------------
  // 4. Resultado final
  // -------------------------------------------------------
  console.log("");
  console.log("✅ Build preparado com sucesso!");
  console.log("   Servidor Next.js: src-tauri/resources/server/");
  console.log(`   Porta em produção: ${SERVER_PORT}`);
  console.log("");
  console.log("Próximo passo: bun run tauri build");
}

main().catch((e) => {
  console.error("❌ Erro no prepare-build:", e.message);
  process.exit(1);
});
