import { create } from "zustand";
import { ipc } from "../lib/ipc";
import type {
  AiModel,
  ProviderCredential,
  Conversation,
  PromptTemplate,
  ModelSettings,
  StreamChunk,
  ChatRequest,
} from "@zentrail/ai";
import {
  createConversation,
  createMessage,
  appendMessage,
  autoTitle,
  defaultPromptTemplates,
  defaultModelSettings,
} from "@zentrail/ai";

interface AiState {
  models: AiModel[];
  credentials: ProviderCredential[];
  conversations: Conversation[];
  activeConversationId: string | null;
  templates: PromptTemplate[];
  modelSettings: ModelSettings[];
  activeModelId: string | null;
  loading: boolean;
  streaming: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  loadModels: () => Promise<void>;
  loadCredentials: () => Promise<void>;
  loadConversations: () => Promise<void>;
  loadTemplates: () => Promise<void>;

  setActiveModel: (modelId: string) => void;
  toggleModel: (modelId: string) => Promise<void>;
  saveCredential: (cred: ProviderCredential) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;

  createConversation: (title?: string) => Promise<Conversation>;
  setActiveConversation: (id: string | null) => void;
  deleteConversation: (id: string) => Promise<void>;

  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;

  saveTemplate: (template: PromptTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  getModelSettings: (modelId: string) => ModelSettings;
  saveModelSettings: (settings: ModelSettings) => void;
}

export const useAi = create<AiState>((set, get) => ({
  models: [],
  credentials: [],
  conversations: [],
  activeConversationId: null,
  templates: defaultPromptTemplates(),
  modelSettings: [],
  activeModelId: null,
  loading: false,
  streaming: false,
  error: null,

  async loadAll() {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().loadModels(),
        get().loadCredentials(),
        get().loadConversations(),
        get().loadTemplates(),
      ]);
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
    }
  },

  async loadModels() {
    const models = await ipc.aiListModels();
    set({ models });
    if (!get().activeModelId && models.length > 0) {
      const enabled = models.filter((m) => m.enabled);
      if (enabled.length > 0) set({ activeModelId: enabled[0].id });
    }
  },

  async loadCredentials() {
    const credentials = await ipc.aiListCredentials();
    set({ credentials });
  },

  async loadConversations() {
    const conversations = await ipc.aiListConversations();
    set({ conversations });
  },

  async loadTemplates() {
    const custom = await ipc.aiListTemplates();
    set({ templates: [...defaultPromptTemplates(), ...custom] });
  },

  setActiveModel(modelId: string) {
    set({ activeModelId: modelId });
  },

  async toggleModel(modelId: string) {
    const models = get().models.map((m) =>
      m.id === modelId ? { ...m, enabled: !m.enabled } : m,
    );
    set({ models });
    const model = models.find((m) => m.id === modelId);
    if (model) await ipc.aiSaveModel(model);
  },

  async saveCredential(cred: ProviderCredential) {
    await ipc.aiSaveCredential(cred);
    await get().loadCredentials();
  },

  async deleteCredential(id: string) {
    await ipc.aiDeleteCredential(id);
    await get().loadCredentials();
  },

  async createConversation(title?: string) {
    const modelId = get().activeModelId ?? get().models[0]?.id ?? "";
    const conv = createConversation(title ?? "New Chat", modelId);
    await ipc.aiSaveConversation(conv);
    set({
      conversations: [conv, ...get().conversations],
      activeConversationId: conv.id,
    });
    return conv;
  },

  setActiveConversation(id: string | null) {
    set({ activeConversationId: id });
  },

  async deleteConversation(id: string) {
    await ipc.aiDeleteConversation(id);
    const conversations = get().conversations.filter((c) => c.id !== id);
    const activeConversationId =
      get().activeConversationId === id
        ? (conversations[0]?.id ?? null)
        : get().activeConversationId;
    set({ conversations, activeConversationId });
  },

  async sendMessage(content: string) {
    const state = get();
    let convId = state.activeConversationId;
    let conv = state.conversations.find((c) => c.id === convId);

    if (!conv) {
      conv = await get().createConversation();
      convId = conv.id;
    }

    const modelId = conv.modelId || state.activeModelId || "";
    const userMsg = createMessage("user", content);
    const assistantMsg = createMessage("assistant", "", modelId);
    assistantMsg.streaming = true;

    const updatedConv = appendMessage(appendMessage(conv, userMsg), assistantMsg);
    const conversations = state.conversations.map((c) =>
      c.id === updatedConv.id ? updatedConv : c,
    );
    set({
      conversations,
      activeConversationId: updatedConv.id,
      streaming: true,
      error: null,
    });

    try {
      const allMessages = updatedConv.messages
        .filter((m) => !m.streaming)
        .map((m) => ({ role: m.role, content: m.content }));

      const req: ChatRequest = {
        modelId,
        messages: allMessages,
        stream: true,
      };

      const result = await ipc.aiChatStream(req);

      // Handle both async generator (demo) and array (Tauri) responses
      const chunks: StreamChunk[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const asyncIter = result as any;
      if (asyncIter && typeof asyncIter[Symbol.asyncIterator] === "function") {
        for await (const chunk of asyncIter as AsyncIterable<StreamChunk>) {
          chunks.push(chunk);
        }
      } else {
        chunks.push(...(result as StreamChunk[]));
      }

      let accumulated = "";
      for (const chunk of chunks) {
        accumulated += chunk.delta;
        const currentConvs = get().conversations;
        set({
          conversations: currentConvs.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: accumulated, streaming: !chunk.done }
                  : m,
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        });

        if (chunk.done) {
          set({ streaming: false });
          const finalConv = get().conversations.find((c) => c.id === convId);
          if (finalConv) {
            const title =
              finalConv.messages.length <= 2
                ? autoTitle(finalConv.messages)
                : finalConv.title;
            await ipc.aiSaveConversation({ ...finalConv, title });
          }
        }
      }
    } catch (e) {
      set({
        streaming: false,
        error: String(e),
        conversations: get().conversations.map((c) => {
          if (c.id !== convId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: `Error: ${e}`, streaming: false } : m,
            ),
          };
        }),
      });
    }
  },

  stopStreaming() {
    set({
      streaming: false,
      conversations: get().conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.streaming ? { ...m, streaming: false } : m,
        ),
      })),
    });
  },

  async saveTemplate(template: PromptTemplate) {
    await ipc.aiSaveTemplate(template);
    await get().loadTemplates();
  },

  async deleteTemplate(id: string) {
    await ipc.aiDeleteTemplate(id);
    await get().loadTemplates();
  },

  getModelSettings(modelId: string): ModelSettings {
    return (
      get().modelSettings.find((s) => s.modelId === modelId) ??
      defaultModelSettings(modelId)
    );
  },

  saveModelSettings(settings: ModelSettings) {
    set({
      modelSettings: [
        ...get().modelSettings.filter((s) => s.modelId !== settings.modelId),
        settings,
      ],
    });
  },
}));
