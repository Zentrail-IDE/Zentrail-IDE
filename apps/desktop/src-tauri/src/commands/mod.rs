use serde::Serialize;

/// Typed payload returned by `get_app_version`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppVersion {
    pub version: String,
    pub go_core: String,
    pub python_rt: String,
}

/// Health-check command used by the frontend to prove the IPC bridge works.
#[tauri::command]
pub fn ping(message: String) -> String {
    format!("pong from Zentrail core: {message}")
}

/// Reports the versions of the desktop shell and the companion runtimes.
///
/// The `goCore` / `pythonRt` fields are placeholders during Phase 1; they will
/// be populated once the Go core and Python runtime are launched as sidecars.
#[tauri::command]
pub fn get_app_version() -> AppVersion {
    AppVersion {
        version: env!("CARGO_PKG_VERSION").to_string(),
        go_core: "pending".to_string(),
        python_rt: "pending".to_string(),
    }
}
