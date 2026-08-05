use std::path::{Component, Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Window};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

/// A single entry returned by `read_directory`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

/// Payload broadcast to the frontend whenever `notify` runs, so the UI can also
/// surface an in-app toast in addition to the OS-level notification.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPayload {
    pub title: String,
    pub body: String,
}

/// Resolve `rel` against `root`, rejecting any path that escapes the workspace
/// root (via `..`, absolute components, or symlink-free prefix checks). This is
/// the security boundary that keeps the predefined file commands safe.
fn resolve(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let mut out = root.to_path_buf();
    for comp in Path::new(rel).components() {
        match comp {
            Component::Normal(c) => out.push(c),
            Component::CurDir => {}
            Component::ParentDir => {
                out.pop();
                if !out.starts_with(root) {
                    return Err("path escapes workspace root".into());
                }
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err("absolute paths are not allowed".into());
            }
        }
    }
    if !out.starts_with(root) {
        return Err("path escapes workspace root".into());
    }
    Ok(out)
}

/// List a directory relative to the open workspace root.
#[tauri::command]
pub fn read_directory(root: String, rel: String) -> Result<Vec<FileEntry>, String> {
    let root = PathBuf::from(root);
    let dir = resolve(&root, &rel)?;
    let mut entries = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        entries.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: path.to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len(),
        });
    }
    entries.sort_by(|a, b| {
        (b.is_dir, a.name.to_lowercase()).cmp(&(a.is_dir, b.name.to_lowercase()))
    });
    Ok(entries)
}

/// Read a UTF-8 text file relative to the open workspace root.
#[tauri::command]
pub fn read_text_file(root: String, rel: String) -> Result<String, String> {
    let path = resolve(&PathBuf::from(root), &rel)?;
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Write a UTF-8 text file relative to the open workspace root, creating parent
/// directories as needed.
#[tauri::command]
pub fn write_text_file(root: String, rel: String, contents: String) -> Result<(), String> {
    let path = resolve(&PathBuf::from(root), &rel)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Open the native folder picker and return the chosen path (or `null`).
#[tauri::command]
pub async fn open_folder_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let folder = app.dialog().file().blocking_pick_folder();
    Ok(folder.map(|p| p.to_string()))
}

/// Update the main window title (e.g. to reflect the open workspace).
#[tauri::command]
pub fn set_window_title(window: Window, title: String) -> Result<(), String> {
    window.set_title(&title).map_err(|e| e.to_string())
}

/// Show an OS notification and broadcast it to the frontend for an in-app toast.
#[tauri::command]
pub fn notify(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;

    let payload = NotificationPayload {
        title,
        body,
    };
    app.emit("zentrail://notify", payload)
        .map_err(|e| e.to_string())
}
