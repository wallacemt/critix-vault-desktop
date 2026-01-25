Agora ficou **bem claro o nível do projeto** — isso aqui já é **Rust + Tauri de produção**, não exemplo básico 👏
Você está certíssimo: **tudo em um `lib.rs` vira um monstro difícil de manter**. Vamos organizar isso **sem brigar com o Rust nem com o Tauri**.

Vou te mostrar:

1. **Estrutura de pastas recomendada**
2. Como **migrar esse código gigante** pra módulos
3. Como **importar tudo corretamente**
4. Um **exemplo real** aplicado ao seu projeto

---

## 1️⃣ Princípios para organizar bem em Rust (especialmente com Tauri)

👉 Separe por **responsabilidade**, não por tipo de arquivo:

* **models** → structs de dados
* **storage** → persistência (StorageManager)
* **commands** → funções `#[tauri::command]`
* **services** → regras de negócio
* **utils** → helpers (hash, paths, etc)

Isso evita:

* dependências circulares
* `pub` desnecessário
* acoplamento entre UI ↔ storage

---

## 2️⃣ Estrutura de pastas recomendada (para o seu caso)

```text
src/
├── main.rs
├── lib.rs
│
├── models/
│   ├── mod.rs
│   ├── folder.rs
│   ├── movie.rs
│   ├── series.rs
│   ├── settings.rs
│   └── app_data.rs
│
├── storage/
│   ├── mod.rs
│   ├── manager.rs
│   └── cache.rs
│
├── commands/
│   ├── mod.rs
│   ├── folders.rs
│   ├── media.rs
│   ├── settings.rs
│   ├── cache.rs
│   └── files.rs
│
├── services/
│   ├── mod.rs
│   └── scanner.rs
│
└── utils/
    ├── mod.rs
    ├── paths.rs
    └── hashing.rs
```

💡 `lib.rs` vira só o **orquestrador**.

---

## 3️⃣ Como fica o `lib.rs` (bem limpo)

```rust
mod models;
mod storage;
mod commands;
mod services;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(commands::all())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

📌 Repare:
👉 **não tem lógica aqui**
👉 só composição

---

## 4️⃣ Centralizando os comandos Tauri

📁 `commands/mod.rs`

```rust
pub mod folders;
pub mod media;
pub mod settings;
pub mod cache;
pub mod files;

pub fn all() -> impl Fn(tauri::Invoke) {
    tauri::generate_handler![
        folders::select_folder_dialog,
        folders::add_folder,
        folders::remove_folder,
        folders::get_folders,
        folders::update_folder,

        media::save_movies,
        media::get_movies,
        media::save_series,
        media::get_series,
        media::update_movie,
        media::update_series,
        media::remove_movie,
        media::remove_series,

        settings::save_settings,
        settings::get_settings,
        settings::save_last_selected_folder,
        settings::get_last_selected_folder,

        cache::cache_image,
        cache::get_cached_image_path,
        cache::is_image_cached,

        files::scan_folder,
        files::open_media,
        files::get_file_metadata,
    ]
}
```

🔥 Isso **remove completamente** o caos do `lib.rs`.

---

## 5️⃣ Movendo os Models

📁 `models/folder.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub path: String,
    pub name: String,
    pub media_count: usize,
    pub added_at: String,
    pub last_scanned: Option<String>,
}
```

📁 `models/mod.rs`

```rust
pub mod folder;
pub mod movie;
pub mod series;
pub mod settings;
pub mod app_data;

pub use folder::Folder;
pub use movie::Movie;
pub use series::{Series, Season, Episode};
pub use settings::AppSettings;
pub use app_data::{AppData, CacheInfo};
```

💡 Assim você importa fácil:

```rust
use crate::models::{Folder, Movie};
```

---

## 6️⃣ Storage global (do jeito certo)

📁 `storage/manager.rs`

```rust
use std::sync::Mutex;
use crate::models::AppData;

pub struct StorageManager {
    // ...
}

static STORAGE: Mutex<Option<StorageManager>> = Mutex::new(None);

pub fn storage() -> Result<std::sync::MutexGuard<'static, Option<StorageManager>>, String> {
    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;

    if storage.is_none() {
        *storage = Some(StorageManager::new()?);
    }

    Ok(storage)
}
```

📁 `storage/mod.rs`

```rust
pub mod manager;
pub mod cache;

pub use manager::{storage, StorageManager};
```

📌 Agora **commands** não sabem como o storage funciona.

---

## 7️⃣ Commands chamam Services (boa prática)

📁 `commands/folders.rs`

```rust
use crate::models::Folder;
use crate::services::folders_service;

#[tauri::command]
pub fn add_folder(path: String) -> Result<Folder, String> {
    folders_service::add(path)
}
```

📁 `services/folders_service.rs`

```rust
use crate::models::Folder;
use crate::storage::storage;
use uuid::Uuid;

pub fn add(path: String) -> Result<Folder, String> {
    let storage = storage()?;
    let manager = storage.as_ref().ok_or("Storage not initialized")?;

    let mut data = manager.load_data()?;
    // lógica aqui
    Ok(folder)
}
```

🔥 Resultado:

* commands = interface
* services = regra de negócio
* storage = persistência

---

## 8️⃣ Benefícios imediatos dessa organização

✔ Código navegável
✔ Compila mais rápido
✔ Testável (`services` sem Tauri)
✔ Menos `pub` espalhado
✔ Muito mais fácil evoluir (ex: migrar JSON → SQLite)

---

