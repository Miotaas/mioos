"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { Sparkles, Send, X, Zap, RotateCcw, ChevronDown } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const QUICK_PROMPTS = [
  "What should I focus on today?",
  "Summarize this project",
  "What is blocking me?",
  "Suggest next steps",
  "What are my top priorities?",
];

export function AIPanel() {
  const { aiPanelOpen, setAiPanelOpen, selectedNode } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (aiPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aiPanelOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!aiPanelOpen) return null;

  async function send(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: "user", content: msg, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const context = selectedNode ? {
        label: selectedNode.label,
        type: selectedNode.type,
        status: selectedNode.status,
        description: selectedNode.description,
        content: selectedNode.content,
        priority: selectedNode.priority,
      } : null;

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          nodeId: selectedNode?.id,
          conversationId,
          context,
        }),
      });

      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, id: (Date.now() + 1).toString() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect. Check your AI configuration.", id: (Date.now() + 1).toString() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function reset() {
    setMessages([]);
    setConversationId(null);
  }

  return (
    <div className="w-80 flex flex-col h-full border-l border-white/[0.06] bg-surface-1 animate-slide-in-right overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-surface-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="w-4 h-4 text-accent-violet" />
            <div className="absolute inset-0 blur-sm bg-accent-violet/40 rounded-full" />
          </div>
          <span className="text-sm font-semibold text-text-primary">AI Assistant</span>
          {selectedNode && (
            <span className="text-[10px] text-text-muted bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.06]">
              ctx: {selectedNode.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={reset} className="text-text-muted hover:text-text-primary p-1 rounded transition-colors" title="New conversation">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAiPanelOpen(false)} className="text-text-muted hover:text-text-primary p-1 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            {/* Welcome */}
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-violet flex items-center justify-center mx-auto mb-3 shadow-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-medium text-text-primary">What can I help with?</p>
              <p className="text-xs text-text-muted mt-1">
                {selectedNode
                  ? `Asking about: ${selectedNode.label}`
                  : "Select a node for focused context"}
              </p>
            </div>

            {/* Quick prompts */}
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-white/[0.06] bg-surface-2 text-text-secondary hover:text-text-primary hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-all group"
                >
                  <span className="text-accent-purple/60 group-hover:text-accent-purple mr-1.5 text-[10px]">→</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "animate-fade-up",
              msg.role === "user" ? "flex justify-end" : "flex justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex items-start gap-2 max-w-full">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent-purple to-accent-violet flex items-center justify-center flex-shrink-0 mt-0.5 shadow-glow">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="bg-surface-3 border border-white/[0.06] rounded-xl rounded-tl-sm px-3 py-2.5 max-w-[240px]">
                  <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            )}
            {msg.role === "user" && (
              <div className="bg-accent-purple/15 border border-accent-purple/20 rounded-xl rounded-tr-sm px-3 py-2 max-w-[200px]">
                <p className="text-xs text-text-primary">{msg.content}</p>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent-purple to-accent-violet flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="bg-surface-3 border border-white/[0.06] rounded-xl rounded-tl-sm px-3 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-accent-purple/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-accent-purple/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-accent-purple/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] bg-surface-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Enter to send)"
            rows={1}
            className="flex-1 text-xs bg-surface-3 border border-white/[0.06] rounded-xl px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/40 resize-none min-h-[36px] max-h-24 leading-relaxed"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-lg bg-accent-purple hover:bg-accent-purple/90 flex items-center justify-center shadow-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-text-ghost mt-1.5 text-center">
          {process.env.NEXT_PUBLIC_AI_ENABLED === "true" ? "Connected to Claude" : "Demo mode — add ANTHROPIC_API_KEY for live AI"}
        </p>
      </div>
    </div>
  );
}
