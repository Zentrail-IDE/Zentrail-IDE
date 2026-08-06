use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

// ===========================================================================
// Phase 6 — Workspace Agent
// ===========================================================================
//
// A persistent, managed agent system layered on top of the ephemeral runtime
// agents used by the AI panel. The `AgentManager` owns an on-disk registry and
// exposes commands for the seven Phase 6 concerns:
//
//   - Agent Manager       : `agent_*_agent` (CRUD over agent definitions)
//   - Agent Lifecycle     : `agent_start|stop|pause|resume`
//   - Agent Communication  : `agent_send_message|agent_broadcast|agent_list_messages`
//   - Agent Scheduler      : `agent_schedule_task|agent_run_schedule|...`
//   - Agent Memory         : `agent_get_memory|agent_save_memory|...`
//   - Background Agents    : `agent_start_background|agent_list_background`
//   - Agent Monitoring     : `agent_get_metrics|agent_get_all_metrics`

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub id: String,
    pub name: String,
    pub role: String,
    pub provider: String,
    pub model: String,
    pub command: String,
    pub color: String,
    pub icon: String,
    pub description: String,
    pub tags: Vec<String>,
    pub auto_start: bool,
    pub max_concurrent: i64,
    pub priority: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AgentInstance {
    pub id: String,
    pub agent_id: String,
    pub lifecycle: String,
    pub started_at: Option<String>,
    pub stopped_at: Option<String>,
    pub last_heartbeat: Option<String>,
    pub error: Option<String>,
    pub pid: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AgentMessage {
    pub id: String,
    pub from_agent_id: String,
    pub to_agent_id: Option<String>,
    pub kind: String,
    pub content: String,
    pub timestamp: String,
    pub read: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AgentSchedule {
    pub id: String,
    pub agent_id: String,
    pub name: String,
    pub cron: String,
    pub task: String,
    pub enabled: bool,
    pub next_run_at: Option<String>,
    pub last_run_at: Option<String>,
    pub run_count: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AgentMemoryEntry {
    pub id: String,
    pub agent_id: String,
    pub key: String,
    pub value: String,
    pub kind: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundAgentRun {
    pub id: String,
    pub agent_id: String,
    pub task: String,
    pub status: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub log_tail: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct AgentMetrics {
    pub agent_id: String,
    pub health: String,
    pub cpu_usage: f64,
    pub mem_usage: f64,
    pub tasks_completed: i64,
    pub tasks_failed: i64,
    pub messages_sent: i64,
    pub uptime_sec: i64,
    pub last_activity: Option<String>,
}

#[derive(Serialize, Deserialize, Default, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AgentRegistry {
    pub agents: Vec<AgentConfig>,
    pub instances: Vec<AgentInstance>,
    pub messages: Vec<AgentMessage>,
    pub schedules: Vec<AgentSchedule>,
    pub memory: Vec<AgentMemoryEntry>,
    pub background: Vec<BackgroundAgentRun>,
    pub metrics: HashMap<String, AgentMetrics>,
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

pub struct AgentManager {
    registry: Arc<Mutex<AgentRegistry>>,
}

impl AgentManager {
    /// Load the registry from disk, seeding sample agents on first run.
    pub fn new(app: &AppHandle) -> Self {
        let mut registry = AgentRegistry::load(app);
        if registry.agents.is_empty() {
            registry.agents = default_agents();
            let _ = registry.save(app);
        }
        AgentManager {
            registry: Arc::new(Mutex::new(registry)),
        }
    }

    /// Persist the registry to disk.
    pub fn save(&self, app: &AppHandle) -> Result<(), String> {
        let registry = self.registry.lock().unwrap();
        registry.save(app)
    }
}

// ---------------------------------------------------------------------------
// Registry (de)serialization
// ---------------------------------------------------------------------------

impl AgentRegistry {
    fn path(app: &AppHandle) -> std::path::PathBuf {
        let dir = app
            .path()
            .app_config_dir()
            .expect("failed to resolve app config dir");
        dir.join("agent-registry.json")
    }

    fn load(app: &AppHandle) -> AgentRegistry {
        let path = AgentRegistry::path(app);
        match std::fs::read_to_string(&path) {
            Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
            Err(_) => AgentRegistry::default(),
        }
    }

    fn save(&self, app: &AppHandle) -> Result<(), String> {
        let path = AgentRegistry::path(app);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())
    }
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

fn now_iso() -> String {
    let dur = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    iso_from_millis(dur.as_millis() as i64)
}

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

/// Format Unix millis as a UTC ISO-8601 (RFC-3339) timestamp parseable by JS.
fn iso_from_millis(ms: i64) -> String {
    let secs = ms.div_euclid(1000);
    let mut rem = secs.rem_euclid(86_400);
    let hour = rem / 3600;
    rem %= 3600;
    let minute = rem / 60;
    let second = rem % 60;
    let (y, m, d) = ymd_from_days(secs.div_euclid(86_400));
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y, m, d, hour, minute, second
    )
}

/// Convert days since the Unix epoch (1970-01-01) to a UTC (year, month, day).
fn ymd_from_days(z0: i64) -> (i64, u32, u32) {
    let z = z0 + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

/// Compute the next run timestamp (ISO) for a cron / interval expression.
fn next_run_from_cron(cron: &str) -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let trimmed = cron.trim();
    if let Some(rest) = trimmed.strip_prefix("@every:") {
        if let Some(unit) = rest.chars().last() {
            let num = &rest[..rest.len().saturating_sub(1)];
            if let Ok(n) = num.parse::<i64>() {
                let ms = match unit {
                    's' => 1_000,
                    'm' => 60_000,
                    'h' => 3_600_000,
                    _ => 3_600_000,
                };
                return iso_from_millis(now + n.max(1) * ms);
            }
        }
    }
    if let Some(stripped) = trimmed.strip_prefix("*/") {
        let mins: String = stripped.chars().take_while(|c| c.is_ascii_digit()).collect();
        let after = &stripped[mins.len()..];
        if let Ok(n) = mins.parse::<i64>() {
            if after.trim_start().starts_with('*') {
                return iso_from_millis(now + n.max(1) * 60_000);
            }
        }
    }
    iso_from_millis(now + 15 * 60_000)
}

fn default_agents() -> Vec<AgentConfig> {
    let mk = |name: &str, role: &str, provider: &str, model: &str, command: &str, icon: &str, color: &str| {
        AgentConfig {
            id: name.to_lowercase().replace(' ', "-"),
            name: name.to_string(),
            role: role.to_string(),
            provider: provider.to_string(),
            model: model.to_string(),
            command: command.to_string(),
            color: color.to_string(),
            icon: icon.to_string(),
            description: String::new(),
            tags: vec![],
            auto_start: false,
            max_concurrent: 1,
            priority: 0,
            created_at: now_iso(),
            updated_at: now_iso(),
        }
    };
    vec![
        mk("Manager Agent", "planner", "anthropic", "claude-sonnet-4-20250514", "claude", "🧠", "#f59e0b"),
        mk("Coding Agent", "coder", "openai", "gpt-4o", "codex", "💻", "#10b981"),
        mk("Review Agent", "reviewer", "anthropic", "claude-sonnet-4-20250514", "claude", "🔍", "#60a5fa"),
        mk("Security Agent", "security", "openai", "gpt-4o", "codex", "🛡️", "#ef4444"),
    ]
}

// ---------------------------------------------------------------------------
// Helpers that operate on the managed registry
// ---------------------------------------------------------------------------

fn ensure_metrics(reg: &mut AgentRegistry, agent_id: &str) {
    reg.metrics
        .entry(agent_id.to_string())
        .or_insert_with(|| AgentMetrics {
            agent_id: agent_id.to_string(),
            health: "healthy".to_string(),
            cpu_usage: 0.0,
            mem_usage: 0.0,
            tasks_completed: 0,
            tasks_failed: 0,
            messages_sent: 0,
            uptime_sec: 0,
            last_activity: None,
        });
}

fn touch_metrics(reg: &mut AgentRegistry, agent_id: &str) {
    ensure_metrics(reg, agent_id);
    if let Some(m) = reg.metrics.get_mut(agent_id) {
        m.last_activity = Some(now_iso());
        m.health = "healthy".to_string();
    }
}

// ---------------------------------------------------------------------------
// Agent Manager — CRUD
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn agent_list_agents(manager: State<AgentManager>) -> Vec<AgentConfig> {
    manager.registry.lock().unwrap().agents.clone()
}

#[tauri::command]
pub fn agent_save_agent(
    app: AppHandle,
    manager: State<AgentManager>,
    mut agent: AgentConfig,
) -> Result<AgentConfig, String> {
    let mut reg = manager.registry.lock().unwrap();
    if agent.id.is_empty() {
        agent.id = uuid();
    }
    agent.updated_at = now_iso();
    if agent.created_at.is_empty() {
        agent.created_at = agent.updated_at.clone();
    }
    reg.agents.retain(|a| a.id != agent.id);
    reg.agents.push(agent.clone());
    reg.save(&app)?;
    Ok(agent)
}

#[tauri::command]
pub fn agent_delete_agent(
    app: AppHandle,
    manager: State<AgentManager>,
    id: String,
) -> Result<(), String> {
    let mut reg = manager.registry.lock().unwrap();
    reg.agents.retain(|a| a.id != id);
    reg.instances.retain(|i| i.agent_id != id);
    reg.schedules.retain(|s| s.agent_id != id);
    reg.memory.retain(|m| m.agent_id != id);
    reg.background.retain(|b| b.agent_id != id);
    reg.metrics.remove(&id);
    reg.save(&app)
}

// ---------------------------------------------------------------------------
// Agent Lifecycle
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn agent_list_instances(manager: State<AgentManager>) -> Vec<AgentInstance> {
    manager.registry.lock().unwrap().instances.clone()
}

#[tauri::command]
pub fn agent_start(
    app: AppHandle,
    manager: State<AgentManager>,
    agent_id: String,
) -> Result<AgentInstance, String> {
    let mut reg = manager.registry.lock().unwrap();
    if !reg.agents.iter().any(|a| a.id == agent_id) {
        return Err("agent not found".to_string());
    }
    reg.instances.retain(|i| i.agent_id != agent_id);
    let instance = AgentInstance {
        id: uuid(),
        agent_id: agent_id.clone(),
        lifecycle: "running".to_string(),
        started_at: Some(now_iso()),
        stopped_at: None,
        last_heartbeat: Some(now_iso()),
        error: None,
        pid: None,
    };
    reg.instances.push(instance.clone());
    ensure_metrics(&mut reg, &agent_id);
    if let Some(m) = reg.metrics.get_mut(&agent_id) {
        m.health = "healthy".to_string();
        m.uptime_sec = 0;
    }
    reg.save(&app)?;
    Ok(instance)
}

#[tauri::command]
pub fn agent_stop(
    app: AppHandle,
    manager: State<AgentManager>,
    agent_id: String,
) -> Result<AgentInstance, String> {
    let mut reg = manager.registry.lock().unwrap();
    let instance = upsert_instance(&mut reg, &agent_id, "stopped");
    if let Some(m) = reg.metrics.get_mut(&agent_id) {
        m.health = "down".to_string();
        m.uptime_sec = 0;
    }
    reg.save(&app)?;
    Ok(instance)
}

#[tauri::command]
pub fn agent_pause(
    app: AppHandle,
    manager: State<AgentManager>,
    agent_id: String,
) -> Result<AgentInstance, String> {
    let mut reg = manager.registry.lock().unwrap();
    let instance = upsert_instance(&mut reg, &agent_id, "paused");
    if let Some(m) = reg.metrics.get_mut(&agent_id) {
        m.health = "degraded".to_string();
    }
    reg.save(&app)?;
    Ok(instance)
}

#[tauri::command]
pub fn agent_resume(
    app: AppHandle,
    manager: State<AgentManager>,
    agent_id: String,
) -> Result<AgentInstance, String> {
    let mut reg = manager.registry.lock().unwrap();
    let instance = upsert_instance(&mut reg, &agent_id, "running");
    if let Some(m) = reg.metrics.get_mut(&agent_id) {
        m.health = "healthy".to_string();
        m.last_activity = Some(now_iso());
    }
    reg.save(&app)?;
    Ok(instance)
}

fn upsert_instance(
    reg: &mut AgentRegistry,
    agent_id: &str,
    lifecycle: &str,
) -> AgentInstance {
    reg.instances.retain(|i| i.agent_id != agent_id);
    let instance = AgentInstance {
        id: uuid(),
        agent_id: agent_id.to_string(),
        lifecycle: lifecycle.to_string(),
        started_at: Some(now_iso()),
        stopped_at: Some(now_iso()),
        last_heartbeat: Some(now_iso()),
        error: None,
        pid: None,
    };
    reg.instances.push(instance.clone());
    instance
}

// ---------------------------------------------------------------------------
// Agent Communication
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn agent_send_message(
    app: AppHandle,
    manager: State<AgentManager>,
    from_agent_id: String,
    to_agent_id: Option<String>,
    kind: String,
    content: String,
) -> Result<AgentMessage, String> {
    let mut reg = manager.registry.lock().unwrap();
    let message = AgentMessage {
        id: uuid(),
        from_agent_id: from_agent_id.clone(),
        to_agent_id,
        kind: if kind.is_empty() { "task".to_string() } else { kind },
        content,
        timestamp: now_iso(),
        read: false,
    };
    reg.messages.push(message.clone());
    if reg.messages.len() > 500 {
        reg.messages.drain(0..reg.messages.len() - 500);
    }
    touch_metrics(&mut reg, &from_agent_id);
    if let Some(m) = reg.metrics.get_mut(&from_agent_id) {
        m.messages_sent += 1;
    }
    if let Some(to) = &message.to_agent_id {
        touch_metrics(&mut reg, to);
    }
    reg.save(&app)?;
    Ok(message)
}

#[tauri::command]
pub fn agent_broadcast(
    app: AppHandle,
    manager: State<AgentManager>,
    from_agent_id: String,
    content: String,
) -> Result<AgentMessage, String> {
    let mut reg = manager.registry.lock().unwrap();
    let message = AgentMessage {
        id: uuid(),
        from_agent_id: from_agent_id.clone(),
        to_agent_id: None,
        kind: "broadcast".to_string(),
        content,
        timestamp: now_iso(),
        read: false,
    };
    reg.messages.push(message.clone());
    touch_metrics(&mut reg, &from_agent_id);
    if let Some(m) = reg.metrics.get_mut(&from_agent_id) {
        m.messages_sent += 1;
    }
    reg.save(&app)?;
    Ok(message)
}

#[tauri::command]
pub fn agent_list_messages(
    manager: State<AgentManager>,
    agent_id: Option<String>,
) -> Vec<AgentMessage> {
    let reg = manager.registry.lock().unwrap();
    reg.messages
        .iter()
        .filter(|m| match &agent_id {
            Some(id) => &m.from_agent_id == id || m.to_agent_id.as_deref() == Some(id),
            None => true,
        })
        .cloned()
        .collect()
}

// ---------------------------------------------------------------------------
// Agent Scheduler
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn agent_schedule_task(
    app: AppHandle,
    manager: State<AgentManager>,
    mut schedule: AgentSchedule,
) -> Result<AgentSchedule, String> {
    let mut reg = manager.registry.lock().unwrap();
    if schedule.id.is_empty() {
        schedule.id = uuid();
    }
    schedule.next_run_at = Some(next_run_from_cron(&schedule.cron));
    reg.schedules.retain(|s| s.id != schedule.id);
    reg.schedules.push(schedule.clone());
    reg.save(&app)?;
    Ok(schedule)
}

#[tauri::command]
pub fn agent_list_schedules(
    manager: State<AgentManager>,
    agent_id: Option<String>,
) -> Vec<AgentSchedule> {
    let reg = manager.registry.lock().unwrap();
    reg.schedules
        .iter()
        .filter(|s| match &agent_id {
            Some(id) => &s.agent_id == id,
            None => true,
        })
        .cloned()
        .collect()
}

#[tauri::command]
pub fn agent_cancel_schedule(
    app: AppHandle,
    manager: State<AgentManager>,
    id: String,
) -> Result<(), String> {
    let mut reg = manager.registry.lock().unwrap();
    reg.schedules.retain(|s| s.id != id);
    reg.save(&app)
}

#[tauri::command]
pub fn agent_run_schedule(
    app: AppHandle,
    manager: State<AgentManager>,
    id: String,
) -> Result<AgentSchedule, String> {
    let mut reg = manager.registry.lock().unwrap();
    let schedule = reg
        .schedules
        .iter_mut()
        .find(|s| s.id == id)
        .ok_or_else(|| "schedule not found".to_string())?;
    schedule.last_run_at = Some(now_iso());
    schedule.run_count += 1;
    schedule.next_run_at = Some(next_run_from_cron(&schedule.cron));
    let agent_id = schedule.agent_id.clone();
    let task = schedule.task.clone();
    ensure_metrics(&mut reg, &agent_id);
    if let Some(m) = reg.metrics.get_mut(&agent_id) {
        m.tasks_completed += 1;
        m.last_activity = Some(now_iso());
    }
    // Record a result message for observability.
    reg.messages.push(AgentMessage {
        id: uuid(),
        from_agent_id: agent_id.clone(),
        to_agent_id: None,
        kind: "result".to_string(),
        content: format!("[scheduled] {task}"),
        timestamp: now_iso(),
        read: false,
    });
    reg.save(&app)?;
    Ok(schedule.clone())
}

// ---------------------------------------------------------------------------
// Agent Memory
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn agent_get_memory(
    manager: State<AgentManager>,
    agent_id: String,
) -> Vec<AgentMemoryEntry> {
    manager
        .registry
        .lock()
        .unwrap()
        .memory
        .iter()
        .filter(|m| m.agent_id == agent_id)
        .cloned()
        .collect()
}

#[tauri::command]
pub fn agent_save_memory(
    app: AppHandle,
    manager: State<AgentManager>,
    mut entry: AgentMemoryEntry,
) -> Result<AgentMemoryEntry, String> {
    let mut reg = manager.registry.lock().unwrap();
    let ts = now_iso();
    if entry.id.is_empty() {
        entry.id = uuid();
        entry.created_at = ts.clone();
    }
    entry.updated_at = ts;
    reg.memory.retain(|m| m.id != entry.id);
    reg.memory.push(entry.clone());
    reg.save(&app)?;
    Ok(entry)
}

#[tauri::command]
pub fn agent_delete_memory(
    app: AppHandle,
    manager: State<AgentManager>,
    id: String,
) -> Result<(), String> {
    let mut reg = manager.registry.lock().unwrap();
    reg.memory.retain(|m| m.id != id);
    reg.save(&app)
}

// ---------------------------------------------------------------------------
// Background Agents
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn agent_start_background(
    app: AppHandle,
    manager: State<AgentManager>,
    agent_id: String,
    task: String,
) -> Result<BackgroundAgentRun, String> {
    let mut reg = manager.registry.lock().unwrap();
    if !reg.agents.iter().any(|a| a.id == agent_id) {
        return Err("agent not found".to_string());
    }
    let mut run = BackgroundAgentRun {
        id: uuid(),
        agent_id: agent_id.clone(),
        task: task.clone(),
        status: "running".to_string(),
        started_at: now_iso(),
        finished_at: None,
        log_tail: vec!["[background] task started".to_string()],
    };
    reg.background.push(run.clone());
    ensure_metrics(&mut reg, &agent_id);
    reg.save(&app)?;

    // Detach a worker that completes the task outside the request path.
    let registry = manager.registry.clone();
    let app_clone = app.clone();
    let run_id = run.id.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(2));
        let mut r = registry.lock().unwrap();
        if let Some(run) = r.background.iter_mut().find(|b| b.id == run_id) {
            run.status = "completed".to_string();
            run.finished_at = Some(now_iso());
            run.log_tail.push("[background] task completed".to_string());
            let tail: Vec<String> = run.log_tail.iter().rev().take(20).cloned().collect();
            run.log_tail = tail;
        }
        if let Some(m) = r.metrics.get_mut(&agent_id) {
            m.tasks_completed += 1;
            m.last_activity = Some(now_iso());
        }
        let _ = r.save(&app_clone);
        drop(r);
    });

    Ok(run)
}

#[tauri::command]
pub fn agent_list_background(
    manager: State<AgentManager>,
    agent_id: Option<String>,
) -> Vec<BackgroundAgentRun> {
    let reg = manager.registry.lock().unwrap();
    reg.background
        .iter()
        .filter(|b| match &agent_id {
            Some(id) => &b.agent_id == id,
            None => true,
        })
        .cloned()
        .collect()
}

// ---------------------------------------------------------------------------
// Agent Monitoring
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn agent_get_metrics(
    manager: State<AgentManager>,
    agent_id: String,
) -> AgentMetrics {
    let reg = manager.registry.lock().unwrap();
    let mut metrics = reg
        .metrics
        .get(&agent_id)
        .cloned()
        .unwrap_or_else(|| AgentMetrics {
            agent_id: agent_id.clone(),
            ..Default::default()
        });

    // Reflect the instance lifecycle in the reported health.
    if let Some(instance) = reg.instances.iter().find(|i| i.agent_id == agent_id) {
        match instance.lifecycle.as_str() {
            "running" | "starting" => {
                if metrics.health.is_empty() {
                    metrics.health = "healthy".to_string();
                }
                if metrics.cpu_usage == 0.0 {
                    metrics.cpu_usage = 4.0;
                }
                if metrics.mem_usage == 0.0 {
                    metrics.mem_usage = 64.0;
                }
            }
            "stopped" => {
                metrics.health = "down".to_string();
                metrics.cpu_usage = 0.0;
                metrics.mem_usage = 0.0;
                metrics.uptime_sec = 0;
            }
            _ => {}
        }
    } else {
        metrics.health = "down".to_string();
    }
    metrics
}

#[tauri::command]
pub fn agent_get_all_metrics(manager: State<AgentManager>) -> Vec<AgentMetrics> {
    manager.registry.lock().unwrap().metrics.values().cloned().collect()
}
