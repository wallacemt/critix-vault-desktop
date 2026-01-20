# 🎬 Critix Vault

**Critix Vault** é uma aplicação desktop construída com **Tauri**, criada para transformar bibliotecas locais de filmes, séries e animes em uma experiência visual semelhante a serviços de streaming (Netflix, Prime Video), integrada ao ecossistema **Critix**.

O app rastreia pastas do sistema, identifica mídias automaticamente, consulta metadados via **TMDB** (através da API Critix) e apresenta tudo em uma interface moderna, organizada e performática.

---

## 🎯 Objetivo do Projeto

* Melhorar drasticamente a visualização e organização de mídias locais
* Aprender e aplicar desenvolvimento desktop moderno com **Tauri**
* Criar uma extensão real do **Critix**, não apenas um player
* Explorar integração entre:

  * Frontend moderno
  * Backend local (Rust)
  * Backend remoto (Java + TMDB)

---

## 🧠 Conceito Principal

> “Seu catálogo local com experiência de streaming.”

Em vez de navegar por pastas e arquivos (`.mkv`, `.mp4`), o usuário navega por **capas**, **detalhes**, **temporadas**, **episódios** e **status de visualização**.

---

## 🧱 Arquitetura Geral

```
[Pastas do Usuário]
        ↓
[Watcher de Arquivos - Rust]
        ↓
[Normalização de Nome]
   ├─ Parser determinístico
   └─ IA (fallback)
        ↓
[API Critix (Java)]
        ↓
[TMDB]
        ↓
[Cache Local - SQLite]
        ↓
[UI (React + Tailwind)]
```

---

## 🛠️ Stack Tecnológica

### Desktop

* **Tauri**
* **Rust** (commands, filesystem, watcher)
* **SQLite** (cache local)

### Frontend

* **React**
* **TypeScript**
* **Tailwind CSS**
* **ShadCN UI**

### Backend

* **API Critix (Java)**
* Integração com **TMDB**

### IA (fallback)

* Uso exclusivo para normalização de nomes problemáticos

---

## 📦 Funcionalidades (MVP)

### Biblioteca

* Adicionar/remover pastas monitoradas
* Escanear arquivos de mídia (`.mkv`, `.mp4`, `.avi`)
* Atualização automática via watcher

### Normalização de Mídia

* Parser determinístico (regex + heurísticas)
* Fallback com IA quando necessário
* Cache agressivo de resultados

### Metadados

* Busca via API Critix
* Cache local
* Suporte a:

  * Filmes
  * Séries (temporadas/episódios)
  * Animes

### Interface

* Grid estilo streaming
* Página de detalhes da mídia
* Abertura da mídia no player externo (VLC / MPV)

---

## 🧩 Funcionalidades Futuras

* Integração com o player (VLC)
* Sincronização de status com Critix
* Avaliações e comentários
* Modo TV (teclado/controle)
* Multiusuário
* Plugins (player, metadata, scrapers)

---

## 📁 Estrutura de Pastas

### Frontend

```
src/
 ├─ app/
 ├─ features/
 │   ├─ library/
 │   ├─ media-details/
 │   ├─ player/
 │   └─ settings/
 ├─ services/
 │   ├─ api.ts
 │   ├─ media-parser.ts
 │   └─ media-mapper.ts
 ├─ hooks/
 ├─ types/
 └─ main.tsx
```

### Tauri / Rust

```
src-tauri/
 ├─ commands/
 │   ├─ scan_folders.rs
 │   ├─ watch_folders.rs
 │   └─ open_media.rs
 ├─ services/
 │   ├─ indexer.rs
 │   ├─ normalizer.rs
 │   ├─ cache.rs
 │   └─ tmdb_client.rs
 └─ main.rs
```

---

## 🚀 Como Começar

### 1. Criar o projeto

```bash
pnpm create tauri-app
```

### 2. Stack do frontend

* React
* TypeScript
* Tailwind
* ShadCN

### 3. Primeiras tarefas (ordem obrigatória)

1. Setup do Tauri
2. Adicionar pastas monitoradas
3. Listar arquivos de mídia
4. Parser determinístico de nomes
5. Cache local
6. Integração com API Critix
7. Grid de visualização

---

## 🧪 Boas Práticas

* IA **nunca** no caminho crítico
* Cache sempre antes de API
* Rust isolado por responsabilidade
* Frontend orientado a features
* Offline-first sempre que possível

---

## 📌 Status do Projeto

🚧 Em desenvolvimento — fase de setup e MVP

---

## 🧑‍💻 Autor

**Wallace**
Criador do **Critix**
Full Stack Developer

---
