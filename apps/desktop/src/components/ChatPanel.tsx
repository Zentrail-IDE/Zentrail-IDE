import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Square,
  Sparkles,
  Bot,
  User,
} from "lucide-react";
import { cn } from "@zentrail/ui";
import { useAi } from "../state/aiStore";
import { useUi } from "../state/uiStore";
import type { ChatMessage } from "@zentrail/ai";

/** Bottom dock panel for real-time AI chat. */
export function ChatPanel() {
  const open = useUi((s) => s.chatOpen);
  const toggleChat = useUi((s) => s.toggleChat);

  if (!open) return null;

  return (
    <div className="chat">
      <ChatBar onToggle={toggleChat} />
      <ChatMessages />
      <ChatInput />
    </div>
  );
}

function ChatBar({ onToggle }: { onToggle: () => void }) {
  const activeModelId = useAi((s) => s.activeModelId);
  const models = useAi((s) => s.models);
  const activeModel = models.find((m) => m.id === activeModelId);
  const streaming = useAi((s) => s.streaming);

  return (
    <div className="chat__bar">
      <button type="button" className="chat__bar-title" onClick={onToggle}>
        <Sparkles size={13} className="accent" />
        <span>AI Chat</span>
        {streaming && <span className="chat__streaming-dot" />}
      </button>
      <div className="chat__bar-model">
        {activeModel ? (
          <>
            <Bot size={12} className="muted" />
            <span>{activeModel.name}</span>
          </>
        ) : (
          <span className="muted">No model selected</span>
        )}
      </div>
    </div>
  );
}

function ChatMessages() {
  const conversations = useAi((s) => s.conversations);
  const activeConversationId = useAi((s) => s.activeConversationId);
  const conv = conversations.find((c) => c.id === activeConversationId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages.length, conv?.messages.at(-1)?.content]);

  if (!conv || conv.messages.length === 0) {
    return (
      <div className="chat__empty">
        <Sparkles size={32} className="muted" />
        <p>Start a conversation with AI</p>
        <p className="muted chat__empty-hint">
          Messages appear here. Use the input below to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="chat__messages">
      {conv.messages.map((msg: ChatMessage) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "chat__msg",
        isUser && "chat__msg--user",
        isSystem && "chat__msg--system",
      )}
    >
      <div className="chat__msg-avatar">
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="chat__msg-body">
        <div className="chat__msg-meta">
          {isUser ? "You" : isSystem ? "System" : "AI"}
          {message.modelId && (
            <span className="muted chat__msg-model"> · {message.modelId}</span>
          )}
        </div>
        <div className="chat__msg-content">
          {message.content}
          {message.streaming && <span className="chat__cursor" />}
        </div>
      </div>
    </div>
  );
}

function ChatInput() {
  const [input, setInput] = useState("");
  const sendMessage = useAi((s) => s.sendMessage);
  const stopStreaming = useAi((s) => s.stopStreaming);
  const streaming = useAi((s) => s.streaming);
  const createConversation = useAi((s) => s.createConversation);
  const activeConversationId = useAi((s) => s.activeConversationId);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    setInput("");
    if (!activeConversationId) {
      void createConversation().then(() => {
        void sendMessage(trimmed);
      });
    } else {
      void sendMessage(trimmed);
    }
  }, [input, streaming, sendMessage, createConversation, activeConversationId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="chat__input-row">
      <textarea
        ref={inputRef}
        className="chat__input"
        placeholder="Ask AI anything..."
        value={input}
        rows={1}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {streaming ? (
        <button
          type="button"
          className="chat__send-btn chat__send-btn--stop"
          title="Stop generating"
          onClick={stopStreaming}
        >
          <Square size={14} />
        </button>
      ) : (
        <button
          type="button"
          className={cn("chat__send-btn", !input.trim() && "is-disabled")}
          title="Send message (Enter)"
          disabled={!input.trim()}
          onClick={handleSend}
        >
          <Send size={14} />
        </button>
      )}
    </div>
  );
}
