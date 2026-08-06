use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// Supported AI provider backends.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ProviderKind {
    #[serde(rename = "openai")]
    OpenAi,
    #[serde(rename = "anthropic")]
    Anthropic,
    #[serde(rename = "ollama")]
    Ollama,
    #[serde(rename = "lmstudio")]
    LmStudio,
    #[serde(rename = "custom")]
    Custom,
}

/// Whether a model runs locally or in the cloud.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ModelOrigin {
    #[serde(rename = "local")]
    Local,
    #[serde(rename = "cloud")]
    Cloud,
}

/// Capability flags a model may advertise.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ModelCapability {
    #[serde(rename = "chat")]
    Chat,
    #[serde(rename = "completion")]
    Completion,
    #[serde(rename = "code")]
    Code,
    #[serde(rename = "vision")]
    Vision,
    #[serde(rename = "function-calling")]
    FunctionCalling,
    #[serde(rename = "streaming")]
    Streaming,
}

/// A single model entry in the registry.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AiModel {
    pub id: String,
    pub name: String,
    pub provider: ProviderKind,
    pub origin: ModelOrigin,
    pub model_id: String,
    pub context_window: i64,
    pub capabilities: Vec<ModelCapability>,
    pub enabled: bool,
    pub created_at: String,
}

/// A stored credential for a single AI provider.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProviderCredential {
    pub id: String,
    pub provider: ProviderKind,
    pub label: String,
    pub api_key: String,
    pub base_url: Option<String>,
    pub created_at: String,
}

/// A reusable prompt template.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PromptTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub body: String,
    pub category: String,
    pub built_in: bool,
}

/// A single message inside a conversation.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub model_id: Option<String>,
    pub timestamp: String,
    pub streaming: Option<bool>,
    pub usage: Option<TokenUsage>,
}

/// Token usage stats from a single request.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TokenUsage {
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_tokens: i64,
}

/// A full conversation thread.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub messages: Vec<ChatMessage>,
    pub model_id: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Options for sending a chat completion request.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    pub model_id: String,
    pub messages: Vec<ChatMessagePart>,
    pub stream: bool,
    pub temperature: Option<f64>,
    pub max_tokens: Option<i64>,
    pub system_prompt: Option<String>,
}

/// A single message part in a chat request (role + content only).
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessagePart {
    pub role: String,
    pub content: String,
}

/// The full, serialised AI registry persisted to disk.
#[derive(Serialize, Deserialize, Default, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AiRegistry {
    pub models: Vec<AiModel>,
    pub credentials: Vec<ProviderCredential>,
    pub conversations: Vec<Conversation>,
    pub templates: Vec<PromptTemplate>,
}

impl AiRegistry {
    /// Load the registry from disk, seeding defaults on first run.
    fn load(app: &AppHandle) -> AiRegistry {
        let path = registry_path(app);
        let mut registry: AiRegistry = match std::fs::read_to_string(&path) {
            Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
            Err(_) => AiRegistry::default(),
        };
        if registry.models.is_empty() {
            registry.models = default_models();
        }
        registry
    }

    /// Persist the registry to disk, creating the directory if needed.
    fn save(&self, app: &AppHandle) -> Result<(), String> {
        let path = registry_path(app);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())
    }
}

/// Resolve the on-disk registry path in the app config directory.
fn registry_path(app: &AppHandle) -> std::path::PathBuf {
    let dir = app
        .path()
        .app_config_dir()
        .expect("failed to resolve app config dir");
    dir.join("ai-registry.json")
}

/// Current time as an RFC-3339 / ISO-8601 string.
fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}Z")
}

/// Generate a random id without an external crate.
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

/// Default models seeded on first launch.
fn default_models() -> Vec<AiModel> {
    vec![
        AiModel {
            id: "gpt-4o".into(),
            name: "GPT-4o".into(),
            provider: ProviderKind::OpenAi,
            origin: ModelOrigin::Cloud,
            model_id: "gpt-4o".into(),
            context_window: 128000,
            capabilities: vec![
                ModelCapability::Chat,
                ModelCapability::Code,
                ModelCapability::Vision,
                ModelCapability::FunctionCalling,
                ModelCapability::Streaming,
            ],
            enabled: true,
            created_at: now_iso(),
        },
        AiModel {
            id: "claude-sonnet-4-20250514".into(),
            name: "Claude Sonnet 4".into(),
            provider: ProviderKind::Anthropic,
            origin: ModelOrigin::Cloud,
            model_id: "claude-sonnet-4-20250514".into(),
            context_window: 200000,
            capabilities: vec![
                ModelCapability::Chat,
                ModelCapability::Code,
                ModelCapability::Vision,
                ModelCapability::FunctionCalling,
                ModelCapability::Streaming,
            ],
            enabled: true,
            created_at: now_iso(),
        },
        AiModel {
            id: "llama3.1".into(),
            name: "Llama 3.1 8B".into(),
            provider: ProviderKind::Ollama,
            origin: ModelOrigin::Local,
            model_id: "llama3.1:8b".into(),
            context_window: 128000,
            capabilities: vec![
                ModelCapability::Chat,
                ModelCapability::Code,
                ModelCapability::Streaming,
            ],
            enabled: true,
            created_at: now_iso(),
        },
    ]
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// List every registered AI model.
#[tauri::command]
pub fn ai_list_models(app: AppHandle) -> Vec<AiModel> {
    AiRegistry::load(&app).models
}

/// Create or update a model.
#[tauri::command]
pub fn ai_save_model(app: AppHandle, mut model: AiModel) -> Result<AiModel, String> {
    let mut registry = AiRegistry::load(&app);
    if model.id.is_empty() {
        model.id = uuid();
    }
    if model.created_at.is_empty() {
        model.created_at = now_iso();
    }
    registry.models.retain(|m| m.id != model.id);
    registry.models.push(model.clone());
    registry.save(&app)?;
    Ok(model)
}

/// Delete a model by id.
#[tauri::command]
pub fn ai_delete_model(app: AppHandle, id: String) -> Result<(), String> {
    let mut registry = AiRegistry::load(&app);
    registry.models.retain(|m| m.id != id);
    registry.save(&app)
}

/// List all stored provider credentials.
#[tauri::command]
pub fn ai_list_credentials(app: AppHandle) -> Vec<ProviderCredential> {
    AiRegistry::load(&app).credentials
}

/// Create or update a credential.
#[tauri::command]
pub fn ai_save_credential(
    app: AppHandle,
    mut cred: ProviderCredential,
) -> Result<ProviderCredential, String> {
    let mut registry = AiRegistry::load(&app);
    if cred.id.is_empty() {
        cred.id = uuid();
    }
    if cred.created_at.is_empty() {
        cred.created_at = now_iso();
    }
    registry.credentials.retain(|c| c.id != cred.id);
    registry.credentials.push(cred.clone());
    registry.save(&app)?;
    Ok(cred)
}

/// Delete a credential by id.
#[tauri::command]
pub fn ai_delete_credential(app: AppHandle, id: String) -> Result<(), String> {
    let mut registry = AiRegistry::load(&app);
    registry.credentials.retain(|c| c.id != id);
    registry.save(&app)
}

/// List all conversations.
#[tauri::command]
pub fn ai_list_conversations(app: AppHandle) -> Vec<Conversation> {
    let mut convs = AiRegistry::load(&app).conversations;
    convs.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    convs
}

/// Create or update a conversation.
#[tauri::command]
pub fn ai_save_conversation(
    app: AppHandle,
    mut conv: Conversation,
) -> Result<Conversation, String> {
    let mut registry = AiRegistry::load(&app);
    if conv.id.is_empty() {
        conv.id = uuid();
    }
    registry.conversations.retain(|c| c.id != conv.id);
    registry.conversations.push(conv.clone());
    registry.save(&app)?;
    Ok(conv)
}

/// Delete a conversation by id.
#[tauri::command]
pub fn ai_delete_conversation(app: AppHandle, id: String) -> Result<(), String> {
    let mut registry = AiRegistry::load(&app);
    registry.conversations.retain(|c| c.id != id);
    registry.save(&app)
}

/// Stream a chat completion response.
///
/// In production this would call the configured provider's API. For now it
/// returns a placeholder chunk sequence that the frontend can iterate over.
#[tauri::command]
pub async fn ai_chat_stream(
    _app: AppHandle,
    request: ChatRequest,
) -> Result<Vec<HashMap<String, serde_json::Value>>, String> {
    let model_id = request.model_id.clone();
    let user_msg = request
        .messages
        .last()
        .map(|m| m.content.as_str())
        .unwrap_or("");

    let response_text = format!(
        "Demo response from {model_id}. You said: \"{}\". \
         In production this would be a real API call.",
        &user_msg[..user_msg.len().min(100)]
    );

    let words: Vec<&str> = response_text.split(' ').collect();
    let mut chunks = Vec::new();
    for (i, word) in words.iter().enumerate() {
        let mut chunk = HashMap::new();
        chunk.insert("conversationId".into(), serde_json::Value::String("demo".into()));
        chunk.insert("messageId".into(), serde_json::Value::String("demo".into()));
        chunk.insert(
            "delta".into(),
            serde_json::Value::String(if i == 0 {
                word.to_string()
            } else {
                format!(" {word}")
            }),
        );
        chunk.insert(
            "done".into(),
            serde_json::Value::Bool(i == words.len() - 1),
        );
        chunks.push(chunk);
    }

    Ok(chunks)
}

/// List all custom prompt templates.
#[tauri::command]
pub fn ai_list_templates(app: AppHandle) -> Vec<PromptTemplate> {
    AiRegistry::load(&app).templates
}

/// Create or update a prompt template.
#[tauri::command]
pub fn ai_save_template(
    app: AppHandle,
    mut template: PromptTemplate,
) -> Result<PromptTemplate, String> {
    let mut registry = AiRegistry::load(&app);
    if template.id.is_empty() {
        template.id = uuid();
    }
    registry.templates.retain(|t| t.id != template.id);
    registry.templates.push(template.clone());
    registry.save(&app)?;
    Ok(template)
}

/// Delete a prompt template by id.
#[tauri::command]
pub fn ai_delete_template(app: AppHandle, id: String) -> Result<(), String> {
    let mut registry = AiRegistry::load(&app);
    registry.templates.retain(|t| t.id != id);
    registry.save(&app)
}
