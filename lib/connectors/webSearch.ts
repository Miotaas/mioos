/**
 * Web Search Connector — READ ONLY
 *
 * Retrieves search results and stores them as SearchResearch records.
 *
 * Supported providers (configured via env vars — server-side only):
 *   SERPER_API_KEY  → Serper.dev (Google Search API)
 *   TAVILY_API_KEY  → Tavily.ai
 *
 * Safety invariants (hard-coded):
 *   - Never submits forms or posts data
 *   - Never interacts with pages
 *   - Only reads search result metadata
 */

import { prisma } from "@/lib/db";

export type WebSearchProvider = "serper" | "tavily" | "none";

function detectProvider(): WebSearchProvider {
  if (process.env.SERPER_API_KEY) return "serper";
  if (process.env.TAVILY_API_KEY) return "tavily";
  return "none";
}

interface SearchSource {
  url: string;
  title: string;
  snippet: string;
}

interface SearchResponse {
  results: SearchSource[];
  summary: string;
  count: number;
}

async function searchWithSerper(query: string): Promise<SearchResponse> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 10 }),
  });
  if (!res.ok) throw new Error(`Serper error: ${res.status}`);

  const data = await res.json() as {
    organic?: Array<{ link: string; title: string; snippet?: string }>;
  };
  const results: SearchSource[] = (data.organic ?? []).slice(0, 8).map(r => ({
    url: r.link,
    title: r.title,
    snippet: r.snippet ?? "",
  }));
  const summary = results.length > 0
    ? `Found ${results.length} results for "${query}". Top result: ${results[0].title}.`
    : `No results found for "${query}".`;
  return { results, summary, count: results.length };
}

async function searchWithTavily(query: string): Promise<SearchResponse> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 8,
    }),
  });
  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);

  const data = await res.json() as {
    results?: Array<{ url: string; title: string; content?: string }>;
  };
  const results: SearchSource[] = (data.results ?? []).map(r => ({
    url: r.url,
    title: r.title,
    snippet: (r.content ?? "").slice(0, 200),
  }));
  const summary = results.length > 0
    ? `Found ${results.length} results for "${query}". Top result: ${results[0].title}.`
    : `No results found for "${query}".`;
  return { results, summary, count: results.length };
}

export async function executeWebSearch(
  query: string,
  requestedByAgentId?: string,
  workspaceId?: string
): Promise<string> {
  const record = await prisma.searchResearch.create({
    data: { query, requestedByAgentId: requestedByAgentId ?? null, workspaceId: workspaceId ?? null, status: "pending" },
  });

  const provider = detectProvider();

  if (provider === "none") {
    await prisma.searchResearch.update({
      where: { id: record.id },
      data: {
        status: "failed",
        summary: "No search API configured. Set SERPER_API_KEY or TAVILY_API_KEY to enable web search.",
        completedAt: new Date(),
      },
    });
    return record.id;
  }

  try {
    const result = provider === "serper"
      ? await searchWithSerper(query)
      : await searchWithTavily(query);

    await prisma.searchResearch.update({
      where: { id: record.id },
      data: {
        status: "completed",
        summary: result.summary,
        sources: JSON.stringify(result.results),
        resultsCount: result.count,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    await prisma.searchResearch.update({
      where: { id: record.id },
      data: { status: "failed", summary: `Search failed: ${error}`, completedAt: new Date() },
    });
  }

  return record.id;
}

export function getWebSearchConnectorStatus(): {
  connected: boolean;
  provider: WebSearchProvider;
  message: string;
} {
  const provider = detectProvider();
  if (provider === "none") {
    return {
      connected: false,
      provider: "none",
      message: "No API key configured. Set SERPER_API_KEY or TAVILY_API_KEY.",
    };
  }
  return { connected: true, provider, message: `Connected via ${provider}` };
}
