use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// A project folder that belongs to a workspace (multi-project support).
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceProject {
    pub path: String,
    pub name: String,
}

/// A persisted, named workspace.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub projects: Vec<WorkspaceProject>,
    pub pinned: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// A most-recently-used workspace entry.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RecentWorkspace {
    pub id: String,
    pub path: String,
    pub name: String,
    pub last_opened_at: String,
}

/// A restorable editor session bound to a workspace.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSession {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub open_tabs: Vec<String>,
    pub active_tab: Option<String>,
    pub saved_at: String,
}

/// A single key/value memory entry.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MemoryEntry {
    pub id: String,
    pub key: String,
    pub value: String,
    pub updated_at: String,
}

/// The memory store for a workspace.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMemory {
    pub workspace_id: String,
    pub entries: Vec<MemoryEntry>,
}

/// Workspace-scoped settings that override the global defaults.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    pub workspace_id: String,
    pub preferred_terminal: String,
    pub default_skill_tab: String,
    pub ignore_patterns: Vec<String>,
}

/// A file emitted when scaffolding from a template.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceTemplateFile {
    pub path: String,
    pub contents: String,
}

/// A reusable preset that scaffolds a fresh workspace.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub projects: Vec<String>,
    pub files: Vec<WorkspaceTemplateFile>,
}

/// The full, serialised workspace registry persisted to disk.
#[derive(Serialize, Deserialize, Default, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRegistry {
    pub workspaces: HashMap<String, Workspace>,
    pub recents: Vec<RecentWorkspace>,
    pub sessions: Vec<WorkspaceSession>,
    pub memory: HashMap<String, WorkspaceMemory>,
    pub settings: HashMap<String, WorkspaceSettings>,
    pub templates: Vec<WorkspaceTemplate>,
}

impl WorkspaceRegistry {
    /// Load the registry from disk, seeding templates on first run.
    fn load(app: &AppHandle) -> WorkspaceRegistry {
        let path = registry_path(app);
        let mut registry: WorkspaceRegistry = match std::fs::read_to_string(&path) {
            Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
            Err(_) => WorkspaceRegistry::default(),
        };
        if registry.templates.is_empty() {
            registry.templates = default_templates();
        }
        registry
    }

    /// Persist the registry to disk, creating the directory if needed.
    fn save(&self, app: &AppHandle) -> Result<(), String> {
        let path = registry_path(app);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json =
            serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())
    }
}

/// Resolve the on-disk registry path in the app config directory.
fn registry_path(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_config_dir()
        .expect("failed to resolve app config dir");
    dir.join("workspaces.json")
}

/// Stable id derived from a path when no real workspace id is known yet.
fn path_id(path: &str) -> String {
    let mut hash: i64 = 0;
    for c in path.chars() {
        hash = (hash << 5) - hash + c as i64;
        hash |= 0;
    }
    format!("path-{:x}", hash.abs())
}

/// Derive a display name from a root path.
fn name_from_path(root: &str) -> String {
    let cleaned = root.trim_end_matches(['/', '\\']);
    let parts: Vec<&str> = cleaned.split(['/', '\\']).filter(|s| !s.is_empty()).collect();
    parts.last().map(|s| s.to_string()).unwrap_or_else(|| "Untitled".to_string())
}

/// Current time as an RFC-3339 / ISO-8601 string.
fn now_iso() -> String {
    chrono_now()
}

#[cfg(not(feature = "chrono"))]
fn chrono_now() -> String {
    // Fallback: system time since epoch formatted as ISO-8601 without chrono.
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}Z")
}

#[cfg(feature = "chrono")]
fn chrono_now() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// The built-in templates shipped with Zentrail IDE.
fn default_templates() -> Vec<WorkspaceTemplate> {
    vec![
        WorkspaceTemplate {
            id: "blank".into(),
            name: "Blank Workspace".into(),
            description: "An empty workspace with a README to get you started.".into(),
            projects: vec!["src".into()],
            files: vec![WorkspaceTemplateFile {
                path: "README.md".into(),
                contents: "# Workspace\n\nCreated from the Blank Workspace template.\n".into(),
            }],
        },
        WorkspaceTemplate {
            id: "node-ts".into(),
            name: "Node + TypeScript".into(),
            description: "A minimal Node.js + TypeScript project scaffold.".into(),
            projects: vec!["src".into()],
            files: vec![
                WorkspaceTemplateFile {
                    path: "package.json".into(),
                    contents: "{\n  \"name\": \"workspace\",\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"scripts\": { \"start\": \"node dist/index.js\" }\n}\n".into(),
                },
                WorkspaceTemplateFile {
                    path: "tsconfig.json".into(),
                    contents: "{ \"compilerOptions\": { \"target\": \"ES2022\", \"module\": \"ESNext\", \"strict\": true } }\n".into(),
                },
                WorkspaceTemplateFile {
                    path: "src/index.ts".into(),
                    contents: "console.log(\"Hello from Zentrail IDE\");\n".into(),
                },
            ],
        },
        WorkspaceTemplate {
            id: "python".into(),
            name: "Python".into(),
            description: "A Python project with a venv-ready layout.".into(),
            projects: vec!["src".into()],
            files: vec![
                WorkspaceTemplateFile {
                    path: "pyproject.toml".into(),
                    contents: "[project]\nname = \"workspace\"\nversion = \"0.1.0\"\nrequires-python = \">=3.10\"\n".into(),
                },
                WorkspaceTemplateFile {
                    path: "src/main.py".into(),
                    contents: "def main() -> None:\n    print(\"Hello from Zentrail IDE\")\n\n\nif __name__ == \"__main__\":\n    main()\n".into(),
                },
            ],
        },
        WorkspaceTemplate {
            id: "rust-cli".into(),
            name: "Rust CLI".into(),
            description: "A cargo-ready Rust command-line project.".into(),
            projects: vec!["src".into()],
            files: vec![
                WorkspaceTemplateFile {
                    path: "Cargo.toml".into(),
                    contents: "[package]\nname = \"workspace\"\nversion = \"0.1.0\"\nedition = \"2021\"\n".into(),
                },
                WorkspaceTemplateFile {
                    path: "src/main.rs".into(),
                    contents: "fn main() {\n    println!(\"Hello from Zentrail IDE\");\n}\n".into(),
                },
            ],
        },
    ]
}

// --- Commands --------------------------------------------------------------

/// List every saved workspace.
#[tauri::command]
pub fn list_workspaces(app: AppHandle) -> Vec<Workspace> {
    let mut list: Vec<Workspace> = WorkspaceRegistry::load(&app)
        .workspaces
        .into_values()
        .collect();
    list.sort_by(|a, b| {
        b.pinned
            .cmp(&a.pinned)
            .then_with(|| b.updated_at.cmp(&a.updated_at))
    });
    list
}

/// Create or update a workspace, returning the persisted record.
#[tauri::command]
pub fn save_workspace(app: AppHandle, mut workspace: Workspace) -> Result<Workspace, String> {
    let mut registry = WorkspaceRegistry::load(&app);
    if workspace.id.is_empty() {
        workspace.id = uuid();
    }
    if workspace.created_at.is_empty() {
        workspace.created_at = now_iso();
    }
    workspace.updated_at = now_iso();
    registry
        .workspaces
        .insert(workspace.id.clone(), workspace.clone());
    registry.save(&app)?;
    Ok(workspace)
}

/// Delete a workspace (and its sessions, memory, and settings) by id.
#[tauri::command]
pub fn delete_workspace(app: AppHandle, id: String) -> Result<(), String> {
    let mut registry = WorkspaceRegistry::load(&app);
    if let Some(ws) = registry.workspaces.remove(&id) {
        registry.recents.retain(|r| r.path != ws.root_path);
    }
    registry.sessions.retain(|s| s.workspace_id != id);
    registry.memory.remove(&id);
    registry.settings.remove(&id);
    registry.save(&app)
}

/// List the most-recently-used workspaces, newest first.
#[tauri::command]
pub fn recent_workspaces(app: AppHandle) -> Vec<RecentWorkspace> {
    let mut recents = WorkspaceRegistry::load(&app).recents;
    recents.sort_by(|a, b| b.last_opened_at.cmp(&a.last_opened_at));
    recents
}

/// Record (or refresh) a recent workspace entry.
#[tauri::command]
pub fn record_recent(app: AppHandle, path: String, name: Option<String>) -> Result<RecentWorkspace, String> {
    let mut registry = WorkspaceRegistry::load(&app);
    let id = path_id(&path);
    let entry = RecentWorkspace {
        id: id.clone(),
        path: path.clone(),
        name: name.unwrap_or_else(|| name_from_path(&path)),
        last_opened_at: now_iso(),
    };
    registry.recents.retain(|r| r.path != path);
    registry.recents.insert(0, entry.clone());
    registry.recents.truncate(20);
    registry.save(&app)?;
    Ok(entry)
}

/// Remove a path from the recent list.
#[tauri::command]
pub fn remove_recent(app: AppHandle, path: String) -> Result<(), String> {
    let mut registry = WorkspaceRegistry::load(&app);
    registry.recents.retain(|r| r.path != path);
    registry.save(&app)
}

/// List the saved sessions for a workspace.
#[tauri::command]
pub fn workspace_sessions(app: AppHandle, workspace_id: String) -> Vec<WorkspaceSession> {
    let mut sessions: Vec<WorkspaceSession> = WorkspaceRegistry::load(&app)
        .sessions
        .into_iter()
        .filter(|s| s.workspace_id == workspace_id)
        .collect();
    sessions.sort_by(|a, b| b.saved_at.cmp(&a.saved_at));
    sessions
}

/// Create or update a session.
#[tauri::command]
pub fn save_session(app: AppHandle, mut session: WorkspaceSession) -> Result<WorkspaceSession, String> {
    let mut registry = WorkspaceRegistry::load(&app);
    if session.id.is_empty() {
        session.id = uuid();
    }
    session.saved_at = now_iso();
    registry.sessions.retain(|s| s.id != session.id);
    registry.sessions.push(session.clone());
    registry.save(&app)?;
    Ok(session)
}

/// Delete a session by id.
#[tauri::command]
pub fn delete_session(app: AppHandle, id: String) -> Result<(), String> {
    let mut registry = WorkspaceRegistry::load(&app);
    registry.sessions.retain(|s| s.id != id);
    registry.save(&app)
}

/// Read the memory store for a workspace (empty store when absent).
#[tauri::command]
pub fn workspace_memory(app: AppHandle, workspace_id: String) -> WorkspaceMemory {
    WorkspaceRegistry::load(&app)
        .memory
        .get(&workspace_id)
        .cloned()
        .unwrap_or_else(|| WorkspaceMemory {
            workspace_id,
            entries: vec![],
        })
}

/// Create or update the memory store for a workspace.
#[tauri::command]
pub fn save_memory(app: AppHandle, memory: WorkspaceMemory) -> Result<WorkspaceMemory, String> {
    let mut registry = WorkspaceRegistry::load(&app);
    registry
        .memory
        .insert(memory.workspace_id.clone(), memory.clone());
    registry.save(&app)?;
    Ok(memory)
}

/// Read the workspace-scoped settings (defaults when absent).
#[tauri::command]
pub fn workspace_settings(app: AppHandle, workspace_id: String) -> WorkspaceSettings {
    WorkspaceRegistry::load(&app)
        .settings
        .get(&workspace_id)
        .cloned()
        .unwrap_or_else(|| default_settings(&workspace_id))
}

/// Merge a partial settings patch over the stored workspace settings.
#[tauri::command]
pub fn save_workspace_settings(
    app: AppHandle,
    workspace_id: String,
    patch: HashMap<String, serde_json::Value>,
) -> Result<WorkspaceSettings, String> {
    let mut registry = WorkspaceRegistry::load(&app);
    let mut current = registry
        .settings
        .get(&workspace_id)
        .cloned()
        .unwrap_or_else(|| default_settings(&workspace_id));

    if let Some(v) = patch.get("preferredTerminal").and_then(|v| v.as_str()) {
        current.preferred_terminal = v.to_string();
    }
    if let Some(v) = patch.get("defaultSkillTab").and_then(|v| v.as_str()) {
        current.default_skill_tab = v.to_string();
    }
    if let Some(v) = patch.get("ignorePatterns").and_then(|v| v.as_array()) {
        current.ignore_patterns = v
            .iter()
            .filter_map(|item| item.as_str().map(|s| s.to_string()))
            .collect();
    }

    registry
        .settings
        .insert(workspace_id.clone(), current.clone());
    registry.save(&app)?;
    Ok(current)
}

/// List the available workspace templates.
#[tauri::command]
pub fn workspace_templates(app: AppHandle) -> Vec<WorkspaceTemplate> {
    WorkspaceRegistry::load(&app).templates
}

/// Add a project folder to an existing workspace by id.
#[tauri::command]
pub fn add_project(app: AppHandle, workspace_id: String, path: String) -> Result<Workspace, String> {
    let mut registry = WorkspaceRegistry::load(&app);
    let ws = registry
        .workspaces
        .get_mut(&workspace_id)
        .ok_or_else(|| "workspace not found".to_string())?;
    if !ws.projects.iter().any(|p| p.path == path) {
        ws.projects.push(WorkspaceProject {
            path: path.clone(),
            name: name_from_path(&path),
        });
    }
    ws.updated_at = now_iso();
    let cloned = ws.clone();
    registry.save(&app)?;
    Ok(cloned)
}

/// Scaffold a fresh workspace from a template, writing its files to disk.
#[tauri::command]
pub fn create_from_template(
    app: AppHandle,
    template_id: String,
    root_path: String,
    name: Option<String>,
) -> Result<Workspace, String> {
    let registry = WorkspaceRegistry::load(&app);
    let template = registry
        .templates
        .iter()
        .find(|t| t.id == template_id)
        .ok_or_else(|| "template not found".to_string())?;

    let root = Path::new(&root_path);
    std::fs::create_dir_all(root).map_err(|e| e.to_string())?;

    for project in &template.projects {
        let dir = root.join(project);
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }

    for file in &template.files {
        let target = root.join(&file.path);
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&target, &file.contents).map_err(|e| e.to_string())?;
    }

    let mut ws = Workspace {
        id: uuid(),
        name: name.unwrap_or_else(|| template.name.clone()),
        root_path: root_path.clone(),
        projects: template
            .projects
            .iter()
            .map(|p| WorkspaceProject {
                path: root.join(p).to_string_lossy().to_string(),
                name: p.clone(),
            })
            .collect(),
        pinned: false,
        created_at: now_iso(),
        updated_at: now_iso(),
    };

    let mut registry = WorkspaceRegistry::load(&app);
    registry.workspaces.insert(ws.id.clone(), ws.clone());
    registry.save(&app)?;
    Ok(ws)
}

/// Default workspace settings for a workspace id.
fn default_settings(workspace_id: &str) -> WorkspaceSettings {
    WorkspaceSettings {
        workspace_id: workspace_id.to_string(),
        preferred_terminal: "system".into(),
        default_skill_tab: "files".into(),
        ignore_patterns: vec![
            "node_modules".into(),
            "target".into(),
            "dist".into(),
            ".git".into(),
        ],
    }
}

/// Generate a random id without an external crate (best-effort, non-crypto).
fn uuid() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};
    static COUNTER: AtomicU64 = AtomicU64::new(0x9E3779B97F4A7C15);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let c = COUNTER.fetch_add(0x9E3779B97F4A7C15, Ordering::Relaxed);
    format!("{nanos:016x}{c:016x}")
}
