export type MemoryClass =
  | "fact"
  | "decision"
  | "preference"
  | "pattern"
  | "lesson"
  | "risk"
  | "opportunity"
  | "observation";

export interface ClassificationResult {
  classification: MemoryClass;
  isObservation: boolean;
  reason: string;
}

// Signals for transient state — these are NOT memories, they are observations.
const OBSERVATION_PATTERNS = [
  /\b(currently|right now|at the moment|as of (now|today))\b/i,
  /\b(active|open|pending|running|overdue|total)\s+\d+\b/i,
  /\b\d+\s+(active|open|pending|running|overdue|total)\b/i,
  /\bactive pipeline value/i,
  /\bthere (is|are|isn't|aren't)\s+\d+/i,
  /€\s*0\b/i,
  /\b0\s+(open|active|pending|running)\b/i,
  /\b\d+\s+(lead|task|deployment|issue|prospect)s?\b/i,
];

const RISK_PATTERNS = [
  /\b(risk|blocked|blocking|failed|failing|critical|overdue|missing|gap|threat|vulnerable|stalled)\b/i,
];

const OPPORTUNITY_PATTERNS = [
  /\b(opportunit|potential|growth|convert|revenue|expand|untapped|underserved|upsell|partnership)\b/i,
];

const PATTERN_PATTERNS = [
  /\b(repeatedly|consistently|always|tends to|recurring|every time|habit|pattern|common)\b/i,
];

const LESSON_PATTERNS = [
  /\b(learned|lesson|better (to|than)|avoid|next time|recommend|worked well|didn't work|should have)\b/i,
];

const DECISION_PATTERNS = [
  /\b(decided|agreed|will use|choosing|selected|going with|committed to|resolved to)\b/i,
];

const PREFERENCE_PATTERNS = [
  /\b(prefer|works better|best for|recommend using|always use|standard approach|default)\b/i,
];

export function classifyMemory(title: string, content: string): ClassificationResult {
  const combined = `${title} ${content}`;

  for (const pat of OBSERVATION_PATTERNS) {
    if (pat.test(combined)) {
      return {
        classification: "observation",
        isObservation: true,
        reason: "Contains transient state data — not stable enough to store as a memory",
      };
    }
  }

  if (RISK_PATTERNS.some(p => p.test(combined))) {
    return { classification: "risk", isObservation: false, reason: "Contains risk or blocking signal" };
  }
  if (OPPORTUNITY_PATTERNS.some(p => p.test(combined))) {
    return { classification: "opportunity", isObservation: false, reason: "Contains opportunity signal" };
  }
  if (PATTERN_PATTERNS.some(p => p.test(combined))) {
    return { classification: "pattern", isObservation: false, reason: "Contains recurrence pattern signal" };
  }
  if (LESSON_PATTERNS.some(p => p.test(combined))) {
    return { classification: "lesson", isObservation: false, reason: "Contains learning or lesson signal" };
  }
  if (DECISION_PATTERNS.some(p => p.test(combined))) {
    return { classification: "decision", isObservation: false, reason: "Contains decision signal" };
  }
  if (PREFERENCE_PATTERNS.some(p => p.test(combined))) {
    return { classification: "preference", isObservation: false, reason: "Contains preference signal" };
  }

  return { classification: "fact", isObservation: false, reason: "Stable business fact" };
}
