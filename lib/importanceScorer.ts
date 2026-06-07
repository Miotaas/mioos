import type { MemoryClass } from "@/lib/memoryClassifier";

const BASE_SCORES: Record<MemoryClass, number> = {
  observation: 1,
  fact: 4,
  preference: 5,
  decision: 6,
  risk: 7,
  lesson: 7,
  pattern: 8,
  opportunity: 8,
};

export interface ScoringResult {
  importance: number;
  reason: string;
}

export function scoreImportance(
  title: string,
  content: string,
  classification: MemoryClass,
): ScoringResult {
  const lower = `${title} ${content}`.toLowerCase();
  const raw = `${title} ${content}`;
  let score = BASE_SCORES[classification];
  const factors: string[] = [`base:${classification}(${score})`];

  // Revenue / business value
  if (/\b(revenue|€|eur|income|sales|conversion|pipeline|profit|mrr|arr)\b/.test(lower)) {
    score += 1;
    factors.push("revenue_mention(+1)");
  }

  // Urgency / severity
  if (/\b(critical|urgent|blocked|failed|risk|emergency|deadline|breaking|severe)\b/.test(lower)) {
    score += 1;
    factors.push("urgency(+1)");
  }

  // Recurrence
  if (/\b(repeatedly|consistently|always|every|recurring|pattern|habit)\b/.test(lower)) {
    score += 1;
    factors.push("recurrence(+1)");
  }

  // Specificity — proper nouns or multi-digit numbers indicate real, actionable data
  if (/\b[A-Z][a-zA-Z]{2,}\b|\b\d{2,}\b/.test(raw)) {
    score += 1;
    factors.push("specificity(+1)");
  }

  return {
    importance: Math.min(10, Math.max(1, score)),
    reason: factors.join(", "),
  };
}
