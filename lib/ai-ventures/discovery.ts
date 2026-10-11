/**
 * Autonomous lead discovery (top of the Acquire loop) — 🟢 Autonomous.
 *
 * Removes the founder's recurring "source every lead" work: web-searches the ICP,
 * creates Prospect rows, then analyzes the new ones (which harvests a contact
 * email from the site, enabling autonomous outreach). Reuses the existing web
 * search connector + prospect engine. Internal only — no external impact, so it
 * runs without approval; outreach sending stays founder-gated downstream.
 *
 * Interval-gated (DISCOVERY_INTERVAL_H) and capped so it can't burst.
 * ICP is founder strategy: edit SystemConfig "icp_queries" (JSON array of queries).
 */
import { prisma } from "@/lib/db";
import { executeWebSearch } from "@/lib/connectors/webSearch";
import { analyzeProspect } from "@/lib/ai-ventures/prospect-engine";

const KEY_LAST_DISCOVERY = "runtime:lastDiscovery";
const INTERVAL_H = Number(process.env.DISCOVERY_INTERVAL_H ?? "6");
const MAX_NEW_PER_RUN = Number(process.env.DISCOVERY_MAX_NEW ?? "5");
const MAX_ANALYZE_PER_RUN = Number(process.env.DISCOVERY_MAX_ANALYZE ?? "3");

// Founder-editable ICP (SystemConfig "icp_queries" overrides). Tuned to AI Ventures'
// services: local SMBs with weak sites / manual ops who need website or automation help.
const DEFAULT_ICP_QUERIES = [
  "small business outdated website needs redesign Netherlands",
  "local service company poor website contact",
  "SME manual quoting invoicing process automation Netherlands",
];

const SKIP_DOMAINS = /(^|\.)(google|facebook|instagram|linkedin|youtube|twitter|x|yelp|tripadvisor|wikipedia|amazon|indeed|glassdoor|reddit|pinterest|yellowpages|kvk|bing|maps|trustpilot|crunchbase)\./i;

async function getIcpQueries(): Promise<string[]> {
  const row = await prisma.systemConfig.findUnique({ where: { key: "icp_queries" } }).catch(() => null);
  if (row?.value) { try { const a = JSON.parse(row.value); if (Array.isArray(a) && a.length) return a.map(String); } catch { /* fall through */ } }
  return DEFAULT_ICP_QUERIES;
}

function cleanName(title: string): string {
  return title.split(/[|\-–—:]/)[0].trim().slice(0, 80) || title.slice(0, 80);
}
function domainOf(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}

export async function discoverProspects(): Promise<{ created: number; skipped: boolean }> {
  const last = await prisma.runtimeState.findUnique({ where: { key: KEY_LAST_DISCOVERY } }).catch(() => null);
  if (last?.value) {
    const hours = (Date.now() - new Date(last.value).getTime()) / 3_600_000;
    if (hours < INTERVAL_H) return { created: 0, skipped: true };
  }
  await prisma.runtimeState.upsert({ where: { key: KEY_LAST_DISCOVERY }, create: { key: KEY_LAST_DISCOVERY, value: new Date().toISOString() }, update: { value: new Date().toISOString() } }).catch(() => {});

  const queries = await getIcpQueries();
  const query = queries[Math.floor(Date.now() / 86_400_000) % queries.length];

  const recordId = await executeWebSearch(query);
  const record = await prisma.searchResearch.findUnique({ where: { id: recordId } });
  if (!record?.sources) return { created: 0, skipped: false };
  let sources: Array<{ url: string; title: string; snippet?: string }> = [];
  try { sources = JSON.parse(record.sources); } catch { return { created: 0, skipped: false }; }

  // Existing domains to dedupe against.
  const existing = await prisma.prospect.findMany({ where: { website: { not: null } }, select: { website: true } });
  const known = new Set(existing.map((e) => domainOf(e.website ?? "")).filter(Boolean) as string[]);

  let created = 0;
  for (const src of sources) {
    if (created >= MAX_NEW_PER_RUN) break;
    const domain = domainOf(src.url);
    if (!domain || SKIP_DOMAINS.test("." + domain) || known.has(domain)) continue;
    known.add(domain);
    await prisma.prospect.create({
      data: { companyName: cleanName(src.title), website: `https://${domain}`, source: "discovery", status: "discovered", painPointHypothesis: src.snippet?.slice(0, 200) ?? null },
    });
    created++;
  }
  return { created, skipped: false };
}

/** Analyze freshly-discovered prospects (harvests contact email + builds audit/outreach/approval). */
export async function processNewProspects(): Promise<{ analyzed: number }> {
  const fresh = await prisma.prospect.findMany({
    where: { source: "discovery", status: "discovered", recommendedOffer: null },
    orderBy: { createdAt: "asc" },
    take: MAX_ANALYZE_PER_RUN,
  });
  let analyzed = 0;
  for (const p of fresh) {
    try { await analyzeProspect(p.id); analyzed++; } catch (e) { console.error(`[discovery] analyze failed ${p.id}:`, e); }
  }
  return { analyzed };
}
