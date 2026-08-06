/**
 * AI Runtime domain models for the Phase 5 AI System.
 *
 * Pure, framework-agnostic types and helpers shared between the desktop UI and
 * the Tauri backend. No React, DOM, Tauri, or Node imports belong here — keep
 * this package portable so it can be unit-tested in isolation and reused by the
 * Rust layer after a serde round-trip.
 *
 * The Phase 5 feature set covered here:
 *  - AI Chat                (conversation interface)
 *  - Model Manager          (model registry & selection)
 *  - AI API Manager         (provider credentials & configuration)
 *  - Local Models           (on-device inference)
 *  - Cloud Models           (remote API providers)
 *  - Prompt Manager         (template library)
 *  - Conversation Memory    (persistent chat history)
 *  - Streaming Responses    (real-time token delivery)
 */

// ---------------------------------------------------------------------------
// Provider & Model
// ---------------------------------------------------------------------------

/** Supported AI provider backends. */
export type ProviderKind = "openai" | "anthropic" | "ollama" | "lmstudio" | "custom";

/** Whether a model runs locally or in the cloud. */
export type ModelOrigin = "local" | "cloud";

/** Capability flags a model may advertise. */
export type ModelCapability =
  | "chat"
  | "completion"
  | "code"
  | "vision"
  | "function-calling"
  | "streaming";

/** A single model entry in the registry. */
export interface AiModel {
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  provider: ProviderKind;
  origin: ModelOrigin;
  /** Provider-specific model id sent in API requests (e.g. "gpt-4o"). */
  modelId: string;
  /** Max context window in tokens. */
  contextWindow: number;
  capabilities: ModelCapability[];
  /** Whether the user has explicitly enabled this model. */
  enabled: boolean;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Provider Credentials (API Keys)
// ---------------------------------------------------------------------------

/** A stored credential for a single AI provider. */
export interface ProviderCredential {
  id: string;
  provider: ProviderKind;
  /** Display label (e.g. "Work OpenAI key"). */
  label: string;
  /** Encrypted or plaintext API key — the Rust layer stores this securely. */
  apiKey: string;
  /** Optional base URL override for proxied or self-hosted endpoints. */
  baseUrl?: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Prompt Templates
// ---------------------------------------------------------------------------

/** A reusable prompt template. */
export interface PromptTemplate {
  id: string;
  name: string;
  /** Short description shown in the picker. */
  description: string;
  /** The template body. Use {{variable}} placeholders. */
  body: string;
  /** Category tag for filtering (e.g. "code", "review", "docs"). */
  category: string;
  /** Whether the user created this (vs shipped default). */
  builtIn: boolean;
}

// ---------------------------------------------------------------------------
// Conversation & Messages
// ---------------------------------------------------------------------------

/** A single message inside a conversation. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  /** The model that produced an assistant message. */
  modelId?: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** True while the assistant is still streaming tokens. */
  streaming?: boolean;
  /** Token usage reported by the provider. */
  usage?: TokenUsage;
}

/** Token usage stats from a single request. */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** A full conversation thread. */
export interface Conversation {
  id: string;
  title: string;
  /** Ordered messages (oldest first). */
  messages: ChatMessage[];
  /** The model id used for this conversation. */
  modelId: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-updated timestamp. */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

/** A chunk of a streaming response. */
export interface StreamChunk {
  /** The conversation this chunk belongs to. */
  conversationId: string;
  /** The message id being built incrementally. */
  messageId: string;
  /** The new text delta. */
  delta: string;
  /** True if this is the final chunk. */
  done: boolean;
  /** Populated on the final chunk. */
  usage?: TokenUsage;
}

// ---------------------------------------------------------------------------
// API Request / Response shapes
// ---------------------------------------------------------------------------

/** Options for sending a chat completion request. */
export interface ChatRequest {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  /** If true, request a streaming response. */
  stream: boolean;
  /** Temperature (0-2). Omit for provider default. */
  temperature?: number;
  /** Max tokens to generate. Omit for provider default. */
  maxTokens?: number;
  /** System prompt override. */
  systemPrompt?: string;
}

/** A single model's settings stored in the API manager. */
export interface ModelSettings {
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Current time as an ISO-8601 string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Build a new AiModel with sensible defaults. */
export function createModel(
  name: string,
  provider: ProviderKind,
  origin: ModelOrigin,
  modelId: string,
  contextWindow = 128_000,
  capabilities: ModelCapability[] = ["chat", "code", "streaming"],
): AiModel {
  return {
    id: crypto.randomUUID(),
    name,
    provider,
    origin,
    modelId,
    contextWindow,
    capabilities,
    enabled: true,
    createdAt: nowIso(),
  };
}

/** Build a provider credential. */
export function createCredential(
  provider: ProviderKind,
  label: string,
  apiKey: string,
  baseUrl?: string,
): ProviderCredential {
  return {
    id: crypto.randomUUID(),
    provider,
    label,
    apiKey,
    baseUrl,
    createdAt: nowIso(),
  };
}

/** Build a prompt template. */
export function createPromptTemplate(
  name: string,
  description: string,
  body: string,
  category = "general",
  builtIn = false,
): PromptTemplate {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    body,
    category,
    builtIn,
  };
}

/** Build a new conversation. */
export function createConversation(
  title: string,
  modelId: string,
): Conversation {
  const ts = nowIso();
  return {
    id: crypto.randomUUID(),
    title,
    messages: [],
    modelId,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** Build a chat message. */
export function createMessage(
  role: "user" | "assistant" | "system",
  content: string,
  modelId?: string,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    modelId,
    timestamp: nowIso(),
  };
}

/** Build default model settings. */
export function defaultModelSettings(modelId: string): ModelSettings {
  return {
    modelId,
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  };
}

/** Return only enabled models from a list. */
export function enabledModels(models: AiModel[]): AiModel[] {
  return models.filter((m) => m.enabled);
}

/** Find a model by id. */
export function findModel(models: AiModel[], id: string): AiModel | undefined {
  return models.find((m) => m.id === id);
}

/** Filter models by provider. */
export function modelsForProvider(
  models: AiModel[],
  provider: ProviderKind,
): AiModel[] {
  return models.filter((m) => m.provider === provider);
}

/** Filter models by origin. */
export function modelsForOrigin(
  models: AiModel[],
  origin: ModelOrigin,
): AiModel[] {
  return models.filter((m) => m.origin === origin);
}

/** Check if a model supports a specific capability. */
export function modelSupports(
  model: AiModel,
  capability: ModelCapability,
): boolean {
  return model.capabilities.includes(capability);
}

/** Append a message to a conversation, returning a new object. */
export function appendMessage(
  conversation: Conversation,
  message: ChatMessage,
): Conversation {
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: nowIso(),
  };
}

/** Generate a conversation title from the first user message. */
export function autoTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New Chat";
  const text = first.content.slice(0, 60);
  return text.length < first.content.length ? `${text}...` : text;
}

/** Filter templates by category. */
export function templatesForCategory(
  templates: PromptTemplate[],
  category: string,
): PromptTemplate[] {
  if (category === "all") return templates;
  return templates.filter((t) => t.category === category);
}

/** Get unique categories from a template list. */
export function templateCategories(templates: PromptTemplate[]): string[] {
  const cats = new Set(templates.map((t) => t.category));
  return ["all", ...cats];
}

/** Default built-in prompt templates. */
export function defaultPromptTemplates(): PromptTemplate[] {
  return [
    {
      id: "explain",
      name: "Explain Code",
      description: "Explain how the selected code works step by step.",
      body: "Explain the following code in detail. Break it down step by step and describe what each part does:\n\n```{{language}}\n{{code}}\n```",
      category: "code",
      builtIn: true,
    },
    {
      id: "refactor",
      name: "Refactor Code",
      description: "Suggest refactoring improvements for cleaner code.",
      body: "Refactor the following code to improve readability, performance, and maintainability. Explain each change:\n\n```{{language}}\n{{code}}\n```",
      category: "code",
      builtIn: true,
    },
    {
      id: "review",
      name: "Code Review",
      description: "Review code for bugs, style issues, and improvements.",
      body: "Review the following code for bugs, security issues, style violations, and potential improvements. Be specific:\n\n```{{language}}\n{{code}}\n```",
      category: "review",
      builtIn: true,
    },
    {
      id: "test",
      name: "Generate Tests",
      description: "Write unit tests for the selected code.",
      body: "Write comprehensive unit tests for the following code. Include edge cases and error scenarios:\n\n```{{language}}\n{{code}}\n```",
      category: "code",
      builtIn: true,
    },
    {
      id: "docstring",
      name: "Generate Documentation",
      description: "Write docstrings and comments for the code.",
      body: "Add comprehensive documentation to the following code, including docstrings, inline comments, and a brief usage example:\n\n```{{language}}\n{{code}}\n```",
      category: "docs",
      builtIn: true,
    },
    {
      id: "fix",
      name: "Fix Error",
      description: "Diagnose and fix an error in the code.",
      body: "The following code has an error. Diagnose the issue and provide a fix:\n\n```\n{{error}}\n```\n\nRelevant code:\n```{{language}}\n{{code}}\n```",
      category: "code",
      builtIn: true,
    },
    {
      id: "commit",
      name: "Generate Commit Message",
      description: "Write a conventional commit message from a diff.",
      body: "Write a concise conventional commit message for the following changes. Use the format: type(scope): description\n\n```diff\n{{diff}}\n```",
      category: "git",
      builtIn: true,
    },
  ];
}
