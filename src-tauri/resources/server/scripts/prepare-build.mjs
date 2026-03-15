// scripts/prepare-build.mjs
// Prepara os arquivos do servidor Next.js para serem embutidos no build do Tauri.
// Execute APÓS `next build` e ANTES de `tauri build`.

import { rm, mkdir, writeFile, copyFile, readFile, readdir, lstat, rename, realpath, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadingHtml } from "./util.js";
/**
 * Recursive copy that:
 *  - Dereferences symlinks (copies their real content, never creates symlinks)
 *  - Silently skips any entry that raises EPERM / ENOENT (broken symlink, locked file…)
 *  - Optionally skips directory names listed in `skipDirs`
 */
async function cpSafe(src, dest, { skipDirs = [], skipFiles = [], srcRoot = null } = {}) {
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

    // Detect Windows NTFS directory junctions: lstat.isSymbolicLink() returns false
    // for junctions, but realpath will resolve them to a path outside our source root.
    const effectiveRoot = srcRoot ?? path.resolve(src);
    try {
      const real = await realpath(src);
      if (!real.startsWith(effectiveRoot)) return; // junction pointing outside tree
    } catch {
      return; // can't resolve realpath — skip
    }

    await mkdir(dest, { recursive: true });
    let entries;
    try {
      entries = await readdir(src);
    } catch {
      return;
    }
    await Promise.all(
      entries.map((e) =>
        cpSafe(path.join(src, e), path.join(dest, e), { skipDirs, skipFiles, srcRoot: effectiveRoot }),
      ),
    );
  } else {
    // Skip files matching any extension in skipFiles
    if (skipFiles.length > 0) {
      const fileName = path.basename(src);
      if (skipFiles.some((ext) => fileName.endsWith(ext))) return;
    }

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

const SERVER_DEST = path.join(ROOT, "src-tauri", "resources", "server");
const OUT_DIR = path.join(ROOT, "out");

const SERVER_PORT = 1422;

/**
 * Renomeia diretórios e arquivos que começam com "." (dotfiles/dotdirs)
 * para versões sem ponto, para que o glob do Tauri consiga capturá-los.
 *
 * O Tauri usa a crate `glob` do Rust que, por padrão, ignora dotfiles.
 * Renomeando .next → _next e .prisma → _prisma resolvemos o problema.
 */
async function renameDotEntries(serverDir) {
  // 1. Renomear .next → _next_build
  const dotNext = path.join(serverDir, ".next");
  const underNext = path.join(serverDir, "_next_build");
  if (existsSync(dotNext)) {
    await rename(dotNext, underNext);
    console.log("  ✅ .next → _next_build");
  }

  // 2. Atualizar distDir no server.js (inlined nextConfig)
  const serverJs = path.join(serverDir, "server.js");
  if (existsSync(serverJs)) {
    let content = await readFile(serverJs, "utf8");
    // Substituir referências ao distDir ".next" por "_next_build"
    content = content.replaceAll('"./.next"', '"_next_build"');
    content = content.replaceAll('"distDir":".next"', '"distDir":"_next_build"');
    content = content.replaceAll('"distDir": ".next"', '"distDir": "_next_build"');
    content = content.replaceAll('"distDirRoot":".next"', '"distDirRoot":"_next_build"');
    content = content.replaceAll('"distDirRoot": ".next"', '"distDirRoot": "_next_build"');
    await writeFile(serverJs, content, "utf8");
    console.log("  ✅ server.js distDir atualizado para _next_build");
  }

  // 3. Atualizar referências em _next_build/required-server-files.json
  const reqFiles = path.join(underNext, "required-server-files.json");
  if (existsSync(reqFiles)) {
    let content = await readFile(reqFiles, "utf8");
    // Substituir caminhos de filesystem ".next" → "_next_build"
    // (não afeta URLs como /_next/ pois usam underscore, não ponto)
    content = content.replaceAll('".next', '"_next_build');
    content = content.replaceAll("\\.next", "\\_next_build");
    await writeFile(reqFiles, content, "utf8");
    console.log("  ✅ required-server-files.json atualizado");
  }

  // 4. Renomear node_modules/.prisma → node_modules/_prisma
  const dotPrisma = path.join(serverDir, "node_modules", ".prisma");
  const underPrisma = path.join(serverDir, "node_modules", "_prisma");
  if (existsSync(dotPrisma)) {
    await rename(dotPrisma, underPrisma);
    console.log("  ✅ node_modules/.prisma → node_modules/_prisma");

    // 5. Atualizar require('.prisma/...') → require('_prisma/...') em @prisma/client
    const prismaClientDefault = path.join(serverDir, "node_modules", "@prisma", "client", "default.js");
    if (existsSync(prismaClientDefault)) {
      let content = await readFile(prismaClientDefault, "utf8");
      content = content.replaceAll(".prisma/client", "_prisma/client");
      await writeFile(prismaClientDefault, content, "utf8");
      console.log("  ✅ @prisma/client/default.js atualizado para _prisma");
    }
  }

  // 6. Remover dotfiles desnecessários (envs são setados via Rust)
  for (const dotfile of [".env", ".env.production"]) {
    const fp = path.join(serverDir, dotfile);
    if (existsSync(fp)) {
      await rm(fp);
    }
  }
  console.log("  ✅ Dotfiles removidos (.env não é necessário em runtime)");
}

/**
 * Corrige módulos externos hasheados pelo Turbopack.
 *
 * O Turbopack cria referências como `@prisma/client-2c3a283f` ou
 * `better-sqlite3-90e2652d` nos chunks do servidor. Esses módulos não
 * existem no node_modules. Precisamos criar re-exports que apontem
 * para o módulo original.
 */
async function fixTurbopackHashedModules(serverDir) {
  const nextServerDir = path.join(serverDir, "_next_build", "server");
  if (!existsSync(nextServerDir)) return;

  const jsFiles = [];
  const walk = async (dir) => {
    if (!existsSync(dir)) return;
    const entries = await readdir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      let entryStat;
      try {
        entryStat = await stat(fullPath);
      } catch {
        continue;
      }

      if (entryStat.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entryStat.isFile() && entry.endsWith(".js")) {
        jsFiles.push(fullPath);
      }
    }
  };

  await walk(nextServerDir);

  const hashedRefs = new Set();

  for (const jsPath of jsFiles) {
    const content = await readFile(jsPath, "utf8");

    // Scoped packages (@scope/name-hash)
    for (const match of content.matchAll(/["'](@[\w.-]+\/[\w.-]+-[a-f0-9]{8,})["']/g)) {
      hashedRefs.add(match[1]);
    }
    // Known native/external packages (name-hash)
    for (const match of content.matchAll(/["']((?:better-sqlite3|sharp|detect-libc)-[a-f0-9]{8,})["']/g)) {
      hashedRefs.add(match[1]);
    }
  }

  if (hashedRefs.size === 0) return;

  const nodeModules = path.join(serverDir, "node_modules");
  for (const hashedName of hashedRefs) {
    // Extrair o nome original removendo o hash: "@prisma/client-abc123" → "@prisma/client"
    const baseName = hashedName.replace(/-[a-f0-9]{8,}$/, "");
    const modulePath = path.join(nodeModules, hashedName);

    if (existsSync(modulePath)) continue; // Já existe

    await mkdir(modulePath, { recursive: true });
    await writeFile(path.join(modulePath, "index.js"), `module.exports = require("${baseName}");\n`, "utf8");
    await writeFile(
      path.join(modulePath, "package.json"),
      JSON.stringify({ name: hashedName, version: "1.0.0", main: "index.js" }),
      "utf8",
    );
    console.log(`  ✅ Módulo Turbopack criado: ${hashedName} → ${baseName}`);
  }
}

async function ensurePrismaRuntimeEntries(serverDir) {
  const runtimePackages = [
    "@prisma/adapter-better-sqlite3",
    "@prisma/driver-adapter-utils",
    "@prisma/debug",
    "@prisma/client-runtime-utils",
  ];

  for (const packageName of runtimePackages) {
    const bundledIndexJs = path.join(serverDir, "node_modules", packageName, "dist", "index.js");
    if (existsSync(bundledIndexJs)) {
      continue;
    }

    const sourceIndexJs = path.join(ROOT, "node_modules", packageName, "dist", "index.js");
    if (!existsSync(sourceIndexJs)) {
      continue;
    }

    await mkdir(path.dirname(bundledIndexJs), { recursive: true });
    await copyFile(sourceIndexJs, bundledIndexJs);
    console.log(`  ✅ Runtime Prisma ajustado: ${packageName}/dist/index.js copiado`);
  }
}

async function validateServerBundle(serverDir) {
  const serverJs = path.join(serverDir, "server.js");
  if (!existsSync(serverJs)) {
    throw new Error(`Arquivo server.js não encontrado em ${serverJs}`);
  }

  const chunksDir = path.join(serverDir, "_next_build", "server", "chunks");
  if (!existsSync(chunksDir)) {
    throw new Error(`Diretório de chunks não encontrado em ${chunksDir}`);
  }

  const chunkEntries = await readdir(chunksDir);
  const chunkFiles = chunkEntries.filter((file) => file.endsWith(".js"));
  if (chunkFiles.length === 0) {
    throw new Error(`Nenhum chunk .js encontrado em ${chunksDir}`);
  }

  console.log(`  ✅ Bundle validado: ${chunkFiles.length} chunk(s) em _next_build/server/chunks`);
}

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

  // Servidor standalone (dereferences symlinks, skips junctions and blocked native files)
  // Skip 'src-tauri' to guard against Windows NTFS junction loops via node_modules
  await cpSafe(STANDALONE, SERVER_DEST, { skipDirs: ["src-tauri"] });

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
    await cpSafe(PRISMA_SRC, path.join(SERVER_DEST, "prisma"), { skipFiles: [".db", ".db-journal", ".db-wal"] });
    console.log("  ✅ Pasta prisma copiada (sem arquivo .db)");
  }

  // -------------------------------------------------------
  // 2b. Renomeia dotfiles/dotdirs para compatibilidade com o Tauri glob
  // -------------------------------------------------------
  console.log("🔧 Ajustando dotfiles para o bundler do Tauri...");
  await renameDotEntries(SERVER_DEST);

  // -------------------------------------------------------
  // 2c. Cria re-exports para módulos hasheados pelo Turbopack
  // -------------------------------------------------------
  console.log("🔗 Corrigindo módulos Turbopack hasheados...");
  await fixTurbopackHashedModules(SERVER_DEST);

  console.log("🧩 Ajustando runtime Prisma no bundle...");
  await ensurePrismaRuntimeEntries(SERVER_DEST);

  // -------------------------------------------------------
  // 2d. Valida o bundle final do servidor para falhar cedo
  // -------------------------------------------------------
  console.log("🧪 Validando bundle do servidor...");
  await validateServerBundle(SERVER_DEST);

  // -------------------------------------------------------
  // 3. Cria o out/ com a tela de loading/redirect para o Tauri
  // -------------------------------------------------------
  console.log("🌐 Gerando tela de loading em out/...");

  if (existsSync(OUT_DIR)) {
    await rm(OUT_DIR, { recursive: true });
  }
  await mkdir(OUT_DIR, { recursive: true });

  // Copia o logo real do projeto para out/images/
  const logoSrc = path.join(PUBLIC, "images", "logo-short.png");
  const logoDestDir = path.join(OUT_DIR, "images");
  if (existsSync(logoSrc)) {
    await mkdir(logoDestDir, { recursive: true });
    await copyFile(logoSrc, path.join(logoDestDir, "logo-short.png"));
    console.log("  ✅ Logo copiado para out/images/");
  }

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
