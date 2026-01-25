mod manager;
mod cache;

pub use manager::*;

use std::sync::Mutex;

static STORAGE: Mutex<Option<StorageManager>> = Mutex::new(None);

pub fn get_storage() -> Result<std::sync::MutexGuard<'static, Option<StorageManager>>, String> {
    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
    if storage.is_none() {
        *storage = Some(StorageManager::new()?);
    }
    Ok(storage)
}
