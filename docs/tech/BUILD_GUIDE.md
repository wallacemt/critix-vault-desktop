# Guia de Build — Critix Vault Desktop

## Diagnóstico: Por que o `.exe` não consegue acessar as APIs

### O problema atual

O projeto tem uma **incompatibilidade de configuração** entre dois arquivos:

| Arquivo | Configuração | Gera em |
|---|---|---|
| `next.config.mjs` | `output: "standalone"` | `.next/standalone/server.js` (servidor Node.js) |
| `tauri.conf.json` | `frontendDist: "../out"` | Espera arquivos **estáticos** em `out/` |

A pasta `out/` do projeto é uma **versão antiga** de uma build estática.
Quando o `.exe` é executado, o Tauri carrega esses arquivos estáticos desatualizados — e **nenhuma API Route do Next.js existe** numa build estática.

Resultado: todas as chamadas para `/api/movies`, `/api/series`, `/api/folders`, etc. retornam **404** ou falham silenciosamente.

### Por que `output: "export"` (estático puro) NÃO funciona neste projeto

O projeto usa **Prisma + better-sqlite3** dentro das API Routes do Next.js.
Essas bibliotecas exigem o runtime Node.js — não funcionam em arquivos HTML/JS estáticos.
Uma build estática simplesmente ignora todas as pastas `src/app/api/`.

### Por que a API Docker (porta 8080) não é acessada

Além do problema das API Routes internas, o acesso à porta 8080 pode falhar por:

1. **CSP (Content Security Policy)** restritiva no `tauri.conf.json`
2. **Variável de ambiente** `NEXT_PUBLIC_CRITIX_API_URL` não definida no build de produção
3. **Firewall do Windows** bloqueando conexões do processo Tauri para `localhost:8080`

---

## Arquitetura correta para este projeto

```
┌─────────────────────────────────────┐
│  critix-vault.exe (Tauri shell)     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Webview (janela do app)    │    │
│  │  → http://localhost:1422    │    │
│  └──────────┬──────────────────┘    │
│             │ HTTP                  │
│  ┌──────────▼──────────────────┐    │
│  │  Next.js server (node.exe)  │    │  → /api/movies, /api/series (SQLite)
│  │  rodando na porta 1422      │    │  → http://localhost:8080     (Docker)
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘

                ↕ Docker na porta 8080
┌─────────────────────────────────────┐
│  critix-backend (container Docker)  │
└─────────────────────────────────────┘
```

O Tauri inicia o servidor Next.js como um **processo filho** (sidecar) e aponta a janela para ele.

---

## Passo a passo: Configurando o build corretamente

### Pré-requisitos

- Node.js 20+ instalado na máquina onde o app vai rodar  
  (apenas enquanto não usarmos um sidecar com Node.js embutido)
- Docker rodando com o backend na porta 8080
- Rust + Tauri CLI instalados na máquina de desenvolvimento

---

### Passo 1 — Corrigir `next.config.mjs`

O `output` deve ser `"standalone"` (já correto). Confirme que está assim:

```js
// next.config.mjs
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",          // ✅ NÃO mude para "export"
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};
```

---

### Passo 2 — Criar arquivo `.env.production`

Crie (ou confirme) o arquivo `.env.production` na raiz do projeto:

```env
# .env.production
NEXT_PUBLIC_CRITIX_API_URL=http://localhost:8080
```

> ⚠️ Variáveis `NEXT_PUBLIC_*` são **embutidas no bundle no momento do build**.
> Se o endereço da API mudar (ex: IP fixo do contêiner Docker), você deve rebuildar.

---

### Passo 3 — Corrigir `tauri.conf.json`

Troque `frontendDist` (arquivos estáticos) por `devUrl` apontando para o servidor local,
e adicione `http://localhost:1422` à CSP.

```json
{
  "build": {
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [
      {
        "title": "Critix Vault",
        "url": "http://localhost:1422"
      }
    ],
    "security": {
      "csp": "default-src 'self' http://localhost:*; connect-src 'self' http://localhost:* https://*; img-src 'self' https://image.tmdb.org data: blob: http://localhost:*; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    }
  }
}
```

> A porta `1422` é usada pelo servidor Next.js em produção (você vai definir no Passo 5).
> Em dev, continua usando a porta `3000`.

---

### Passo 4 — Adicionar `tauri-plugin-shell` ao projeto Rust

No arquivo `src-tauri/Cargo.toml`, adicione:

```toml
[dependencies]
# ... dependências existentes ...
tauri-plugin-shell = "2"
```

---

### Passo 5 — Criar o comando Rust que inicia o servidor Next.js

Crie o arquivo `src-tauri/src/commands/server.rs`:

```rust
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::AppHandle;

static SERVER_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

pub const SERVER_PORT: u16 = 1422;

#[tauri::command]
pub fn start_nextjs_server(app: AppHandle) -> Result<(), String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;

    // O servidor standalone do Next.js está em resources/server/
    let server_path = resource_dir.join("server").join("server.js");

    if !server_path.exists() {
        return Err(format!("Servidor não encontrado: {}", server_path.display()));
    }

    let child = Command::new("node")
        .arg(&server_path)
        .env("PORT", SERVER_PORT.to_string())
        .env("NODE_ENV", "production")
        .env("NEXT_PUBLIC_CRITIX_API_URL", "http://localhost:8080")
        .spawn()
        .map_err(|e| format!("Falha ao iniciar servidor Node.js: {}. Node.js está instalado?", e))?;

    let mut lock = SERVER_PROCESS.lock().unwrap();
    *lock = Some(child);

    Ok(())
}

pub fn stop_server() {
    let mut lock = SERVER_PROCESS.lock().unwrap();
    if let Some(mut child) = lock.take() {
        let _ = child.kill();
    }
}
```

---

### Passo 6 — Atualizar `src-tauri/src/commands/mod.rs`

Adicione o módulo `server`:

```rust
pub mod server;
// ... outros módulos existentes ...
```

Se `commands/mod.rs` não existir, adicione em `lib.rs`:

```rust
mod commands;
// já deve existir — adicione o submódulo server lá
```

---

### Passo 7 — Atualizar `lib.rs` para iniciar o servidor ao abrir o app

```rust
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())      // <-- adicionar
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Inicia o servidor Next.js assim que o app abre
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                if let Err(e) = commands::server::start_nextjs_server(app_handle) {
                    eprintln!("Erro ao iniciar servidor: {e}");
                }
            });
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                commands::server::stop_server();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // ... handlers existentes ...
            commands::server::start_nextjs_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### Passo 8 — Copiar os arquivos do servidor para `resources/`

Após o `next build`, os arquivos do servidor ficam em `.next/standalone/`.
Precisamos copiá-los para onde o Tauri vai embutir como recursos.

Crie o script `scripts/prepare-build.mjs`:

```js
// scripts/prepare-build.mjs
import { cp, rm, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const STANDALONE = path.join(ROOT, ".next", "standalone");
const STATIC = path.join(ROOT, ".next", "static");
const PUBLIC = path.join(ROOT, "public");
const DEST = path.join(ROOT, "src-tauri", "resources", "server");

async function main() {
  if (!existsSync(STANDALONE)) {
    throw new Error(".next/standalone não encontrado. Rode `bun run build` primeiro.");
  }

  // Limpa destino anterior
  if (existsSync(DEST)) {
    await rm(DEST, { recursive: true });
  }
  await mkdir(DEST, { recursive: true });

  // Copia servidor standalone
  await cp(STANDALONE, DEST, { recursive: true });

  // Copia assets estáticos para dentro do servidor
  await cp(STATIC, path.join(DEST, ".next", "static"), { recursive: true });

  // Copia pasta public
  if (existsSync(PUBLIC)) {
    await cp(PUBLIC, path.join(DEST, "public"), { recursive: true });
  }

  // Copia o banco de dados SQLite e pasta prisma
  const prismaSrc = path.join(ROOT, "prisma");
  const prismaDest = path.join(DEST, "prisma");
  if (existsSync(prismaSrc)) {
    await cp(prismaSrc, prismaDest, { recursive: true });
  }

  console.log("✅ Servidor preparado em src-tauri/resources/server/");
}

main().catch((e) => {
  console.error("❌ Erro:", e.message);
  process.exit(1);
});
```

---

### Passo 9 — Registrar `resources/` no `tauri.conf.json`

```json
{
  "bundle": {
    "active": true,
    "resources": {
      "resources/server/**": "server/"
    }
  }
}
```

---

### Passo 10 — Atualizar scripts no `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "build:app": "prisma generate && next build && node scripts/prepare-build.mjs && tauri build"
  }
}
```

---

### Passo 11 — Tela de loading enquanto o servidor inicia

Como o servidor Node.js leva ~2-3 segundos para iniciar, adicione uma tela de splash.
No `layout.tsx` ou na janela principal, detecte quando o servidor está pronto:

```tsx
// src/app/layout.tsx  (ou um componente LoadingScreen)
"use client";
import { useEffect, useState } from "react";

export default function RootLayout({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Aguarda o servidor Next.js ficar disponível
    const poll = setInterval(async () => {
      try {
        await fetch("/api/movies?limit=1");
        setReady(true);
        clearInterval(poll);
      } catch {
        // ainda iniciando...
      }
    }, 500);
    return () => clearInterval(poll);
  }, []);

  if (!ready) {
    return (
      <html>
        <body style={{ background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
          <p style={{ color: "white", fontFamily: "sans-serif" }}>Iniciando Critix Vault...</p>
        </body>
      </html>
    );
  }

  return <html>{children}</html>;
}
```

---

## Sequência completa de build

```bash
# 1. Garanta que o Docker está rodando com a API na porta 8080
docker ps  # deve mostrar o container critix-backend rodando

# 2. Na raiz do projeto desktop
cd critix_vault_desktop

# 3. Gere o cliente Prisma
bunx prisma generate

# 4. Build do Next.js
bun run build
# → Gera .next/standalone/ com o servidor Node.js completo

# 5. Prepare os recursos para o Tauri
node scripts/prepare-build.mjs
# → Copia tudo para src-tauri/resources/server/

# 6. Build do Tauri (gera o .exe)
bun run tauri build
# → Gera src-tauri/target/release/critix-vault.exe  (e o instalador)
```

Ou com o script combinado:

```bash
bun run build:app
```

---

## Verificando o resultado

Após o build, o instalador estará em:

```
src-tauri/target/release/bundle/nsis/critix-vault_0.1.0_x64-setup.exe
```

O `.exe` diretamente (sem instalador, útil para testes):

```
src-tauri/target/release/critix-vault.exe
```

> **Nota**: Ao usar o `.exe` direto (sem o instalador), certifique-se de que a pasta `resources/server/` está na raiz do projeto e que o `.exe` é executado a partir do diretório correto. O instalador NSIS empacota tudo automaticamente.

---

## Solução de problemas

### "Node.js está instalado?" ao abrir o app

O app usa `node` como comando para iniciar o servidor. O Node.js precisa estar instalado  
na máquina do usuário (ou incluído no bundle do instalador).

Para embutir o Node.js no instalador (distribuição zero-dependência), use o  
[Sidecar com Node.js compilado](https://tauri.app/v1/guides/building/sidecar) — adiciona ~50MB ao instalador.

### API Docker não acessível (`ECONNREFUSED 127.0.0.1:8080`)

1. Confirme que o container está rodando: `docker ps`
2. Confirme que a porta está exposta no `docker-compose.yml`: `ports: ["8080:8080"]`
3. Se o Docker usa WSL2 no Windows, tente `http://host.docker.internal:8080` em vez de `localhost:8080`

```env
# .env.production
NEXT_PUBLIC_CRITIX_API_URL=http://host.docker.internal:8080
```

### Banco SQLite não encontrado no app instalado

O banco `prisma/critix.db` precisa estar nos `resources/` e o `databaseService.ts`  
deve usar um caminho relativo ao executável, não ao diretório do projeto.

Em `src/lib/prisma.ts`, certifique-se de que o `datasource url` aponta para um caminho  
gravável pelo usuário (ex: `AppData/Roaming/critix-vault/critix.db` no Windows).

### CSP bloqueando requisições

Se as fetch calls para a API Docker falharem silenciosamente, verifique o `tauri.conf.json`:

```json
"csp": "connect-src 'self' http://localhost:* http://host.docker.internal:* https://*;"
```

---

## Resumo das mudanças necessárias

| Arquivo | O que muda |
|---|---|
| `next.config.mjs` | Manter `output: "standalone"` ✅ (já correto) |
| `.env.production` | Criar com `NEXT_PUBLIC_CRITIX_API_URL=http://localhost:8080` |
| `tauri.conf.json` | Adicionar `url: "http://localhost:1422"` na janela, fixar CSP, adicionar `resources` |
| `src-tauri/src/server.rs` | Criar — inicia o servidor Node.js |
| `src-tauri/src/lib.rs` | Registrar módulo server, chamar `start_nextjs_server_internal` no setup |
| `resources/server/server.js` | Placeholder já criado — substituído pelo prepare-build |
| `scripts/prepare-build.mjs` | Criar — copia `.next/standalone/` para `resources/server/` |
| `package.json` | Atualizar `build:app` para incluir o script prepare |
