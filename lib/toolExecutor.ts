import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";

// Supported internal tool slugs.
// These are the only tools that execute — no external integrations.
const INTERNAL_TOOLS = new Set([
  "internal_create_task",
  "internal_create_note",
  "internal_create_memory",
  "internal_create_capture",
  "internal_update_task",
  "internal_create_followup",
]);

export function isInternalTool(slug: string): boolean {
  return INTERNAL_TOOLS.has(slug);
}

interface ToolResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

export async function executeTool(
  toolSlug: string,
  agentId: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  // Resolve tool ID from slug
  const tool = await prisma.tool.findUnique({ where: { slug: toolSlug } });
  if (!tool) return { success: false, error: `Tool not found: ${toolSlug}` };
  if (!tool.enabled) return { success: false, error: `Tool disabled: ${toolSlug}` };
  if (!isInternalTool(toolSlug)) return { success: false, error: `External tools not permitted: ${toolSlug}` };

  const exec = await prisma.toolExecution.create({
    data: {
      toolId: tool.id,
      agentId,
      input: JSON.stringify(input),
      status: "pending",
    },
  });

  try {
    const output = await runInternalTool(toolSlug, agentId, input);

    await prisma.toolExecution.update({
      where: { id: exec.id },
      data: { status: "success", output: JSON.stringify(output), completedAt: new Date() },
    });

    await auditLog("tool", tool.id, "tool_executed", { toolSlug, agentId, output });

    return { success: true, output };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    await prisma.toolExecution.update({
      where: { id: exec.id },
      data: { status: "failed", error, completedAt: new Date() },
    });
    await auditLog("tool", tool.id, "tool_failed", { toolSlug, agentId, error });
    return { success: false, error };
  }
}

async function runInternalTool(
  slug: string,
  agentId: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (slug) {
    case "internal_create_task": {
      const task = await prisma.task.create({
        data: {
          title: String(input.title ?? "Untitled task"),
          description: input.description ? String(input.description) : null,
          priority: String(input.priority ?? "medium"),
          status: "todo",
          dueDate: input.dueDate ? new Date(String(input.dueDate)) : null,
          nodeId: input.nodeId ? String(input.nodeId) : null,
        },
      });
      return { id: task.id, title: task.title };
    }

    case "internal_create_note": {
      const note = await prisma.note.create({
        data: {
          title: String(input.title ?? "Agent Note"),
          content: String(input.content ?? ""),
          tags: input.tags ? JSON.stringify(input.tags) : null,
          nodeId: input.nodeId ? String(input.nodeId) : null,
        },
      });
      return { id: note.id, title: note.title };
    }

    case "internal_create_memory": {
      const memory = await prisma.agentMemory.create({
        data: {
          agentId,
          memoryType: String(input.memoryType ?? "fact"),
          title: String(input.title ?? "Untitled memory"),
          content: String(input.content ?? ""),
          importance: Number(input.importance ?? 5),
        },
      });
      return { id: memory.id, title: memory.title };
    }

    case "internal_create_capture": {
      const capture = await prisma.capture.create({
        data: {
          title: String(input.title ?? "Agent Capture"),
          content: String(input.content ?? ""),
          source: "other",
          type: String(input.type ?? "note"),
          priority: String(input.priority ?? "medium"),
          status: "inbox",
          tags: input.tags ? JSON.stringify(input.tags) : null,
        },
      });
      return { id: capture.id, title: capture.title };
    }

    case "internal_update_task": {
      if (!input.taskId) throw new Error("taskId required for internal_update_task");
      const task = await prisma.task.update({
        where: { id: String(input.taskId) },
        data: {
          ...(input.status ? { status: String(input.status) } : {}),
          ...(input.priority ? { priority: String(input.priority) } : {}),
          ...(input.dueDate ? { dueDate: new Date(String(input.dueDate)) } : {}),
        },
      });
      return { id: task.id, status: task.status };
    }

    case "internal_create_followup": {
      if (!input.leadId) throw new Error("leadId required for internal_create_followup");
      const lead = await prisma.lead.update({
        where: { id: String(input.leadId) },
        data: {
          nextAction: input.nextAction ? String(input.nextAction) : undefined,
          nextActionDate: input.nextActionDate ? new Date(String(input.nextActionDate)) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });
      return { id: lead.id, companyName: lead.companyName };
    }

    default:
      throw new Error(`Unhandled internal tool: ${slug}`);
  }
}
