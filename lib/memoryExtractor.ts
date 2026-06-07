import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import { classifyMemory } from "@/lib/memoryClassifier";
import { scoreImportance } from "@/lib/importanceScorer";
import { checkForDuplicate } from "@/lib/duplicateDetector";
import type { ParsedAgentOutput } from "@/types";

type MemorySuggestionType = "fact" | "decision" | "preference" | "pattern" | "lesson" | "risk" | "opportunity";

interface MemorySuggestionInput {
  memoryType: MemorySuggestionType;
  title: string;
  content: string;
}

// Extracts memory suggestions from a completed agent run output.
// Applies classification, importance scoring, and duplicate detection.
// Suggestions NEVER auto-save — every one requires human approval.
export async function extractAndQueueMemorySuggestions(
  agentId: string,
  runId: string,
  output: ParsedAgentOutput,
): Promise<void> {
  const candidates: MemorySuggestionInput[] = [];

  // 1. Explicit create_memory proposed actions
  for (const action of output.proposedActions ?? []) {
    if (action.actionType !== "create_memory") continue;
    const payload = (action.payload ?? {}) as Record<string, unknown>;
    candidates.push({
      memoryType: (String(payload.memoryType ?? "fact")) as MemorySuggestionType,
      title: String(payload.title ?? action.description ?? "Memory"),
      content: String(payload.content ?? action.reason ?? ""),
    });
  }

  // 2. Key insights (max 3, skip trivially short strings)
  for (const insight of (output.insights ?? []).filter(Boolean).slice(0, 3)) {
    if (insight.length < 20) continue;
    candidates.push({
      memoryType: "fact",
      title: insight.slice(0, 80),
      content: insight,
    });
  }

  if (candidates.length === 0) return;

  for (const c of candidates) {
    try {
      // Phase 2.0: classify first — reject observations
      const { classification, isObservation, reason: classReason } = classifyMemory(c.title, c.content);
      if (isObservation) {
        await auditLog("agent", agentId, "memory_observation_filtered", {
          runId, title: c.title, reason: classReason,
        });
        continue;
      }

      // Phase 2.0: score importance
      const { importance, reason: importanceReason } = scoreImportance(c.title, c.content, classification);

      // Phase 2.0: duplicate detection
      const { isDuplicate } = await checkForDuplicate(agentId, c.title, c.content);
      if (isDuplicate) {
        await auditLog("agent", agentId, "memory_duplicate_skipped", {
          runId, title: c.title,
        });
        continue;
      }

      const suggestion = await prisma.memorySuggestion.create({
        data: {
          agentId,
          runId,
          memoryType: classification === "observation" ? "fact" : classification,
          classification,
          title: c.title,
          content: c.content,
          importance,
          importanceReason,
          status: "pending",
        },
      });

      await prisma.approvalQueue.create({
        data: {
          agentRunId: runId,
          actionType: "create_memory",
          proposedAction: JSON.stringify({
            actionType: "create_memory",
            description: `Store memory: ${c.title}`,
            reason: `[${classification.toUpperCase()}] ${importanceReason}`,
            targetEntity: "memory",
            targetId: null,
            payload: {
              agentId,
              memoryType: classification,
              title: c.title,
              content: c.content,
              importance,
              memorySuggestionId: suggestion.id,
            },
          }),
          reason: `[${classification.toUpperCase()}] Importance ${importance}/10 — ${importanceReason}`,
          status: "pending",
        },
      });

      await auditLog("agent", agentId, "memory_suggestion_queued", {
        runId,
        classification,
        importance,
        title: c.title,
        suggestionId: suggestion.id,
      });
    } catch {
      // Individual failures must not abort the rest
    }
  }
}
