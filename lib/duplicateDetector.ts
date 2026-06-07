import { prisma } from "@/lib/db";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "and", "but", "or", "nor", "for", "yet",
  "so", "at", "by", "in", "of", "on", "to", "up", "as", "it", "its",
  "this", "that", "with", "from", "not", "no", "we", "they", "our",
]);

const DUPLICATE_THRESHOLD = 0.55;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingId: string | null;
  similarity: number;
}

export async function checkForDuplicate(
  agentId: string,
  title: string,
  content: string,
): Promise<DuplicateCheckResult> {
  const candidateTokens = tokenize(`${title} ${content}`);

  const existing = await prisma.agentMemory.findMany({
    where: { agentId },
    select: { id: true, title: true, content: true },
    take: 200,
  });

  let best: { id: string; similarity: number } | null = null;

  for (const mem of existing) {
    const memTokens = tokenize(`${mem.title} ${mem.content}`);
    const sim = jaccardSimilarity(candidateTokens, memTokens);
    if (sim >= DUPLICATE_THRESHOLD && (!best || sim > best.similarity)) {
      best = { id: mem.id, similarity: sim };
    }
  }

  if (best) {
    await prisma.agentMemory.update({
      where: { id: best.id },
      data: {
        occurrenceCount: { increment: 1 },
        lastSeenAt: new Date(),
      },
    });
    return { isDuplicate: true, existingId: best.id, similarity: best.similarity };
  }

  return { isDuplicate: false, existingId: null, similarity: 0 };
}
