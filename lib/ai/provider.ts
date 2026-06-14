// AI Provider abstraction — swap implementations without touching callers.
// Provider selection: set AI_PROVIDER=claude|openai|openrouter|ollama in .env.local
// Default (no key): TemplateProvider (no external calls, always works).

export interface AIProvider {
  generate(prompt: string, context?: string): Promise<string>;
  summarize(text: string): Promise<string>;
  research(query: string, constraints?: string): Promise<string>;
  classify(text: string, categories: string[]): Promise<string>;
  analyze(text: string, question: string): Promise<string>;
  plan(objective: string, constraints?: string): Promise<string>;
}

// ── Template Provider (always works, no external calls) ───────────────

class TemplateProvider implements AIProvider {
  async generate(prompt: string): Promise<string> {
    return `[Template output for: ${prompt.slice(0, 80)}]`;
  }
  async summarize(text: string): Promise<string> {
    return text.split(".").filter(Boolean).slice(0, 2).join(".").trim() + ".";
  }
  async research(query: string): Promise<string> {
    return `Research findings for "${query}" — configure AI_PROVIDER to enable live AI.`;
  }
  async classify(text: string, categories: string[]): Promise<string> {
    return categories[0] ?? "unknown";
  }
  async analyze(text: string, question: string): Promise<string> {
    return `Analysis of "${question}" pending AI provider configuration.`;
  }
  async plan(objective: string): Promise<string> {
    return `Plan for "${objective}" — configure AI_PROVIDER to enable live planning.`;
  }
}

// ── Base class for chat-style providers ──────────────────────────────

abstract class ChatProvider implements AIProvider {
  protected abstract callChat(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>): Promise<string>;

  async generate(prompt: string, context?: string): Promise<string> {
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
    if (context) messages.push({ role: "system", content: context });
    messages.push({ role: "user", content: prompt });

    // Hard timeout prevents a hung API connection from blocking the runtime worker forever.
    // output-generator.ts catches this and falls back to template output.
    const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? "90000");
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AI request timed out after ${AI_TIMEOUT_MS / 1000}s`)), AI_TIMEOUT_MS)
    );
    return Promise.race([this.callChat(messages), timeout]);
  }

  async summarize(text: string): Promise<string> {
    return this.generate(`Summarize this in 2–3 sentences:\n\n${text}`);
  }

  async research(query: string, constraints?: string): Promise<string> {
    const extra = constraints ? `\nConstraints: ${constraints}` : "";
    return this.generate(`Research task: ${query}${extra}\n\nProvide structured findings in markdown.`);
  }

  async classify(text: string, categories: string[]): Promise<string> {
    const result = await this.generate(
      `Classify this text into one of: ${categories.join(", ")}.\nText: "${text}"\nRespond with just the category name.`
    );
    return categories.find(c => result.toLowerCase().includes(c.toLowerCase())) ?? categories[0] ?? "unknown";
  }

  async analyze(text: string, question: string): Promise<string> {
    return this.generate(`Analyze the following content and answer: ${question}\n\nContent:\n${text}\n\nRespond in markdown.`);
  }

  async plan(objective: string, constraints?: string): Promise<string> {
    const extra = constraints ? `\nConstraints: ${constraints}` : "";
    return this.generate(`Create a detailed action plan for: ${objective}${extra}\n\nFormat as numbered steps with sub-tasks in markdown.`);
  }
}

// ── Claude Provider (requires ANTHROPIC_API_KEY) ──────────────────────

class ClaudeProvider extends ChatProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    super();
    this.apiKey = apiKey;
    this.model = model ?? "claude-haiku-4-5-20251001";
  }

  protected async callChat(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>): Promise<string> {
    const systemMsg = messages.find(m => m.role === "system");
    const userMsgs  = messages.filter(m => m.role !== "system");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: userMsgs,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error ${res.status}: ${err}`);
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    return data.content.find(b => b.type === "text")?.text ?? "";
  }
}

// ── OpenAI Provider (requires OPENAI_API_KEY) ────────────────────────

class OpenAIProvider extends ChatProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model?: string, baseUrl?: string) {
    super();
    this.apiKey  = apiKey;
    this.model   = model ?? "gpt-4o-mini";
    this.baseUrl = baseUrl ?? "https://api.openai.com/v1";
  }

  protected async callChat(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? "";
  }
}

// ── OpenRouter Provider (OpenAI-compatible, many models) ─────────────

class OpenRouterProvider extends OpenAIProvider {
  constructor(apiKey: string, model?: string) {
    super(apiKey, model ?? "meta-llama/llama-3.1-8b-instruct:free", "https://openrouter.ai/api/v1");
  }

  protected async callChat(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>): Promise<string> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${(this as unknown as { apiKey: string }).apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mioos.app",
        "X-Title": "MioOS",
      },
      body: JSON.stringify({
        model: (this as unknown as { model: string }).model,
        max_tokens: 4096,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${err}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? "";
  }
}

// ── Ollama Provider (local inference) ────────────────────────────────

class OllamaProvider extends ChatProvider {
  private host: string;
  private model: string;

  constructor(host?: string, model?: string) {
    super();
    this.host  = host ?? "http://localhost:11434";
    this.model = model ?? "llama3";
  }

  protected async callChat(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>): Promise<string> {
    const res = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama error ${res.status}: ${err}`);
    }

    const data = await res.json() as { message: { content: string } };
    return data.message?.content ?? "";
  }
}

// ── Factory ───────────────────────────────────────────────────────────

let _provider: AIProvider | null = null;
let _providerKey: string | null  = null;

export function getAIProvider(): AIProvider {
  const aiProvider = process.env.AI_PROVIDER ?? "claude";
  const cacheKey   = `${aiProvider}:${process.env.ANTHROPIC_API_KEY ?? ""}:${process.env.OPENAI_API_KEY ?? ""}:${process.env.OPENROUTER_API_KEY ?? ""}`;

  if (_provider && _providerKey === cacheKey) return _provider;

  const aiModel = process.env.AI_MODEL;

  switch (aiProvider) {
    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      if (key) { _provider = new OpenAIProvider(key, aiModel); break; }
      _provider = new TemplateProvider();
      break;
    }
    case "openrouter": {
      const key = process.env.OPENROUTER_API_KEY;
      if (key) { _provider = new OpenRouterProvider(key, aiModel); break; }
      _provider = new TemplateProvider();
      break;
    }
    case "ollama": {
      _provider = new OllamaProvider(process.env.OLLAMA_HOST, process.env.OLLAMA_MODEL ?? aiModel);
      break;
    }
    case "claude":
    default: {
      const key = process.env.ANTHROPIC_API_KEY;
      if (key) { _provider = new ClaudeProvider(key, aiModel); break; }
      _provider = new TemplateProvider();
      break;
    }
  }

  _providerKey = cacheKey;
  return _provider;
}

export function isAIEnabled(): boolean {
  const p = process.env.AI_PROVIDER ?? "claude";
  if (p === "ollama") return true;
  if (p === "openai")     return !!process.env.OPENAI_API_KEY;
  if (p === "openrouter") return !!process.env.OPENROUTER_API_KEY;
  return !!process.env.ANTHROPIC_API_KEY;
}

export function getAIConfig(): {
  provider: string;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
} {
  const provider = process.env.AI_PROVIDER ?? "claude";
  const enabled  = isAIEnabled();

  let model = process.env.AI_MODEL ?? "";
  let hasApiKey = false;

  switch (provider) {
    case "openai":
      hasApiKey = !!process.env.OPENAI_API_KEY;
      if (!model) model = "gpt-4o-mini";
      break;
    case "openrouter":
      hasApiKey = !!process.env.OPENROUTER_API_KEY;
      if (!model) model = "meta-llama/llama-3.1-8b-instruct:free";
      break;
    case "ollama":
      hasApiKey = true;
      if (!model) model = process.env.OLLAMA_MODEL ?? "llama3";
      break;
    default:
      hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      if (!model) model = "claude-haiku-4-5-20251001";
      break;
  }

  return { provider, model, enabled, hasApiKey };
}
