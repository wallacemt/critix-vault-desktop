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