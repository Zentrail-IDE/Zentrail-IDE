use std::collections::HashMap;
use std::sync::Mutex;

use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

/// A terminal profile sent from the frontend. Mirrors `TerminalProfile` in
/// `@zentrail/terminal` (camelCase on the wire).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalProfile {
    pub id: String,
    pub name: String,
    pub shell: String,
    pub cwd: Option<String>,
}

/// Live child processes keyed by session id. Managed as Tauri state.
#[derive(Default)]
pub struct TerminalSessions {
    children: Mutex<HashMap<String, CommandChild>>,
}

/// Resolve the executable + args for a shell kind. `system`/`git-bash` differ
/// per platform; the Git Bash path is Windows-only and falls back to `bash`.
fn shell_program(shell: &str) -> (String, Vec<String>) {
    match shell {
        "powershell" => ("pwsh".into(), vec![]),
        "cmd" => ("cmd".into(), vec!["/K".into()]),
        "git-bash" => {
            if cfg!(windows) {
                (
                    "C:\\Program Files\\Git\\bin\\bash.exe".into(),
                    vec!["--login".into(), "-i".into()],
                )
            } else {
                ("bash".into(), vec!["--login".into(), "-i".into()])
            }
        }
        _ => {
            if cfg!(windows) {
                ("cmd".into(), vec![])
            } else {
                ("bash".into(), vec![])
            }
        }
    }
}

/// The set of shells offered in the terminal picker.
#[tauri::command]
pub fn list_shells() -> Vec<String> {
    vec![
        "system".into(),
        "powershell".into(),
        "cmd".into(),
        "git-bash".into(),
    ]
}

/// Spawn a shell process and start streaming its output to the frontend.
#[tauri::command]
pub async fn spawn_terminal(app: AppHandle, profile: TerminalProfile) -> Result<String, String> {
    let sessions = app.state::<TerminalSessions>();
    let (program, args) = shell_program(&profile.shell);

    let mut command = app.shell().command(program);
    if !args.is_empty() {
        command = command.args(args);
    }
    if let Some(cwd) = &profile.cwd {
        command = command.current_dir(cwd.clone());
    }

    let (mut rx, child) = command.spawn().map_err(|e| e.to_string())?;
    let session_id = profile.id.clone();
    sessions.children.lock().unwrap().insert(session_id.clone(), child);

    let app2 = app.clone();
    let sid = session_id.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            let payload = match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(bytes) => Some((
                    String::from_utf8_lossy(&bytes).to_string(),
                    "out",
                )),
                tauri_plugin_shell::process::CommandEvent::Stderr(bytes) => Some((
                    String::from_utf8_lossy(&bytes).to_string(),
                    "err",
                )),
                tauri_plugin_shell::process::CommandEvent::Error(err) => {
                    Some((err, "system"))
                }
                tauri_plugin_shell::process::CommandEvent::Terminated(payload) => Some((
                    format!("[process exited, code {:?}]", payload.code),
                    "system",
                )),
            };
            if let Some((data, stream)) = payload {
                let _ = app2.emit(
                    "zentrail://terminal-output",
                    serde_json::json!({ "sessionId": sid, "data": data, "stream": stream }),
                );
            }
        }
    });

    Ok(session_id)
}

/// Write input bytes into a running terminal session.
#[tauri::command]
pub fn write_terminal(app: AppHandle, id: String, data: String) -> Result<(), String> {
    let sessions = app.state::<TerminalSessions>();
    let children = sessions.children.lock().unwrap();
    let child = children.get(&id).ok_or("terminal session not found")?;
    child.write(data.as_bytes()).map_err(|e| e.to_string())
}

/// Terminate a terminal session and drop its child handle.
#[tauri::command]
pub fn kill_terminal(app: AppHandle, id: String) -> Result<(), String> {
    let sessions = app.state::<TerminalSessions>();
    let mut children = sessions.children.lock().unwrap();
    if let Some(child) = children.remove(&id) {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
