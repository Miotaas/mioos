/**
 * Real website analysis — fetches the prospect's homepage and measures actual
 * signals (not AI guesses). Turns "your site could be better" into "your site
 * has no contact form and no mobile viewport" — which is what earns replies.
 *
 * Dependency-free (fetch + regex). Runs server-side (runtime/API). Returns null
 * if the site can't be fetched, so the caller can fall back to AI/heuristic.
 */
export interface WebsiteSignals {
  reachable: boolean;
  https: boolean;
  hasViewport: boolean;      // mobile-friendly meta
  hasForm: boolean;          // contact/lead form present
  hasContactInfo: boolean;   // email or phone visible
  hasCta: boolean;           // action-oriented button/link
  hasTitle: boolean;
  bytes: number;
}

export interface WebsiteAnalysis {
  websiteScore: number; trustScore: number; conversionScore: number; mobileScore: number;
  speedEstimate: string; ctaQuality: string; painPoints: string[]; opportunities: string[];
  contactEmail?: string;
  measured: true;
}

function normalizeUrl(raw: string): string {
  const u = raw.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return "https://" + u.replace(/^\/+/, "");
}

const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

export async function analyzeWebsite(rawUrl: string): Promise<WebsiteAnalysis | null> {
  const url = normalizeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let html = ""; let finalUrl = url; let ok = false;
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "User-Agent": "MioOS-Audit/1.0 (+website audit)" } });
    finalUrl = res.url || url;
    ok = res.ok;
    html = (await res.text()).slice(0, 400_000);
  } catch {
    return null; // unreachable → caller falls back
  } finally {
    clearTimeout(timer);
  }
  if (!ok || html.length < 200) return null;

  const lower = html.toLowerCase();
  const signals: WebsiteSignals = {
    reachable: true,
    https: finalUrl.startsWith("https://"),
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    hasForm: /<form[\s>]/i.test(html),
    hasContactInfo: /mailto:|tel:|\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i.test(html),
    hasCta: /\b(contact us|get (a )?quote|book (a )?(call|demo)|request|sign ?up|get started|buy now|start (free|now))\b/i.test(lower),
    hasTitle: /<title>[^<]{2,}<\/title>/i.test(html),
    bytes: html.length,
  };

  // Harvest a usable contact email from the page (many SMBs list one) — enables autonomous outreach.
  const emails = (html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []).map((e) => e.toLowerCase());
  const contactEmail = emails.find((e) => !/(noreply|no-reply|@sentry|@example|@sentry\.io|wixpress|\.png|\.jpg|\.gif|@2x|@3x)/.test(e));

  const painPoints: string[] = [];
  if (!signals.hasForm) painPoints.push("No contact/lead-capture form on the homepage");
  if (!signals.hasViewport) painPoints.push("No mobile viewport — likely not mobile-friendly");
  if (!signals.hasCta) painPoints.push("No clear call-to-action");
  if (!signals.hasContactInfo) painPoints.push("No visible email/phone contact");
  if (!signals.https) painPoints.push("Site is not served over HTTPS (trust/SEO risk)");
  if (signals.bytes > 250_000) painPoints.push("Heavy homepage HTML — likely slow to load");
  if (painPoints.length === 0) painPoints.push("Site is functional but conversion elements can be sharpened");

  const opportunities: string[] = [];
  if (!signals.hasForm || !signals.hasCta) opportunities.push("Add lead capture + a single clear CTA to convert visitors");
  if (!signals.hasViewport) opportunities.push("Make the site mobile-responsive");
  opportunities.push("Modern redesign with AI-assisted build + optional maintenance plan");

  const mobileScore = clamp(signals.hasViewport ? 8 : 3);
  const conversionScore = clamp(2 + (signals.hasForm ? 3 : 0) + (signals.hasCta ? 3 : 0) + (signals.hasContactInfo ? 2 : 0));
  const trustScore = clamp(2 + (signals.https ? 4 : 0) + (signals.hasContactInfo ? 3 : 0) + (signals.hasTitle ? 1 : 0));
  const websiteScore = clamp((mobileScore + conversionScore + trustScore) / 3);
  const speedEstimate = signals.bytes > 400_000 ? "slow" : signals.bytes > 150_000 ? "average" : "fast";
  const ctaQuality = signals.hasCta ? "present" : "weak";

  return { websiteScore, trustScore, conversionScore, mobileScore, speedEstimate, ctaQuality, painPoints, opportunities, contactEmail, measured: true };
}
