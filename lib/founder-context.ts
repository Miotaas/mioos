/**
 * Founder Context layer — the primary source of truth for all autonomous work.
 *
 * Stored in SystemConfig (key "founder_context") and injected into every
 * autonomous output. Encodes Mio's founder principle, ventures, effort priority,
 * revenue goals, the dormant-unit policy (Mio Capital Lab: no autonomous work), and
 * prohibited categories. Subordinate to docs/MIOOS_CONSTITUTION.md.
 */
import { prisma } from "@/lib/db";
import { buildInternalContextPack } from "@/lib/intelligence/internal-context";

export const FOUNDER_CONTEXT_KEY = "founder_context";

export interface FounderContext {
  founder?: { name?: string; role?: string; location?: string; workingStyle?: string };
  founderPrinciple?: { statement?: string; prefer?: string[]; avoid?: string[]; conflictRule?: string };
  revenueGoals?: { currency?: string; currentMRR?: number | null; target90d?: number | null; target12m?: number | null; note?: string };
  priorityOrder?: string[];
  units?: Array<{ slug: string; name: string; focus: string }>;
  products?: Array<{ name: string; unit: string; stage?: string | null; model?: string; note?: string }>;
  projects?: string[];
  bottlenecks?: string[];
  capitalPolicy?: { mode?: string; may?: string[]; mustNot?: string[] };
  doNotGenerate?: string[];
}

export async function getFounderContext(): Promise<FounderContext | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key: FOUNDER_CONTEXT_KEY } });
  if (!row?.value) return null;
  try { return JSON.parse(row.value) as FounderContext; } catch { return null; }
}

export async function setFounderContext(ctx: FounderContext): Promise<void> {
  const value = JSON.stringify(ctx);
  await prisma.systemConfig.upsert({
    where:  { key: FOUNDER_CONTEXT_KEY },
    update: { value },
    create: { key: FOUNDER_CONTEXT_KEY, value },
  });
}

/** Markdown block injected into autonomous generation prompts. */
export async function buildFounderContextPack(): Promise<string> {
  const ctx = await getFounderContext();
  const lines: string[] = [];

  if (ctx) {
    lines.push("## Founder Context — the ONLY priorities you may work on");
    if (ctx.founder) lines.push(`Founder: ${ctx.founder.name ?? "Mio"} — ${ctx.founder.role ?? ""}${ctx.founder.location ? " (" + ctx.founder.location + ")" : ""}`);

    if (ctx.founderPrinciple) {
      const fp = ctx.founderPrinciple;
      lines.push("", "## Founder Principle (governs ALL prioritization decisions)");
      if (fp.statement) lines.push(fp.statement);
      if (fp.prefer?.length) lines.push(`Prefer: ${fp.prefer.join(", ")}.`);
      if (fp.avoid?.length) lines.push(`Avoid prioritizing: ${fp.avoid.join(", ")}.`);
      if (fp.conflictRule) lines.push(`Conflict rule: ${fp.conflictRule}`);
    }

    if (ctx.priorityOrder?.length) {
      lines.push("", "Effort priority — allocate effort, opportunity generation, research and execution in THIS order:");
      ctx.priorityOrder.forEach((p, i) => lines.push(`  ${i + 1}. ${p}`));
    }

    if (ctx.units?.length) {
      lines.push("", "Business units:");
      for (const u of ctx.units) lines.push(`- ${u.name} (${u.slug}): ${u.focus}`);
    }
    if (ctx.products?.length) {
      lines.push("", "Products / ventures:");
      for (const p of ctx.products) lines.push(`- ${p.name} [${p.unit}]${p.stage ? ` — stage: ${p.stage}` : ""}${p.model ? ` — ${p.model}` : ""}${p.note ? ` — NOTE: ${p.note}` : ""}`);
    }
    if (ctx.revenueGoals) {
      const g = ctx.revenueGoals;
      lines.push("", `Revenue goals (${g.currency ?? "EUR"}): current MRR ${g.currentMRR ?? 0} · 90-day target ${g.target90d ?? "?"} · 12-month target ${g.target12m ?? "?"}`);
    }
    if (ctx.bottlenecks?.length) lines.push("", `Current bottlenecks: ${ctx.bottlenecks.join("; ")}`);

    if (ctx.capitalPolicy) {
      lines.push("", "## Mio Capital Lab — DORMANT: no autonomous work");
      if (ctx.capitalPolicy.mustNot?.length) { lines.push("The workforce MUST NOT:"); for (const m of ctx.capitalPolicy.mustNot) lines.push(`- ${m}`); }
      if (ctx.capitalPolicy.may?.length) { lines.push("The workforce MAY:"); for (const m of ctx.capitalPolicy.may) lines.push(`- ${m}`); }
    }

    if (ctx.doNotGenerate?.length) {
      lines.push("", "## PROHIBITED — do NOT generate, propose, research, or revisit any of these:");
      for (const d of ctx.doNotGenerate) lines.push(`- ${d}`);
      lines.push(
        "These are banned demo categories. If a candidate idea matches any of them, DISCARD it.",
        "Every opportunity, research item, output and recommendation MUST tie to a real venture above,",
        "respect the effort priority order, and serve the Founder Principle (long-term equity value).",
      );
    }
    lines.push("");
  }

  try {
    const live = await buildInternalContextPack();
    if (live) lines.push(live);
  } catch { /* live context is best-effort */ }

  return lines.join("\n");
}
