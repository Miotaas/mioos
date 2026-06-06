import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { message, nodeId, conversationId, context } = await req.json();

    // Build system context
    let systemContext = `You are MioOS Assistant — a personal AI operating system assistant for Michiel.
You help manage projects, tasks, goals, and decisions. You are concise, actionable, and strategic.
Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

    if (context) {
      systemContext += `\n\nCurrent context:\n${JSON.stringify(context, null, 2)}`;
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.aIConversation.create({
        data: { nodeId, title: message.slice(0, 60) },
      });
      convId = conv.id;
    }

    // Save user message
    await prisma.aIMessage.create({
      data: { conversationId: convId, role: "user", content: message },
    });

    // Get conversation history
    const history = await prisma.aIMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    // Call AI
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    let assistantResponse = "";

    if (apiKey && process.env.ANTHROPIC_API_KEY) {
      // Use Anthropic API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1024,
          system: systemContext,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      assistantResponse = data.content?.[0]?.text || "I could not generate a response.";
    } else {
      // Mock response for demo
      assistantResponse = generateMockResponse(message, context);
    }

    // Save assistant message
    const savedMsg = await prisma.aIMessage.create({
      data: { conversationId: convId, role: "assistant", content: assistantResponse },
    });

    return NextResponse.json({
      conversationId: convId,
      message: savedMsg,
      response: assistantResponse,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}

function generateMockResponse(message: string, context?: Record<string, unknown>): string {
  const lower = message.toLowerCase();

  if (lower.includes("focus") || lower.includes("today") || lower.includes("what should")) {
    return `Based on your current projects, here's what I'd prioritize today:

**1. AION — agent orchestration layer** (urgent, in progress)
This is your highest-leverage task right now. Even 2 hours of focused work moves the needle significantly.

**2. AI Mail Copilot — Chrome extension** (high priority)
The Gmail API integration is blocking other features. Unblock it today.

**3. Sales — cold outreach template** (high priority)
A good template compounds. Once written, it works forever.

Skip Triply today — it's medium priority and the others are more time-sensitive.`;
  }

  if (lower.includes("summar") || lower.includes("overview")) {
    const nodeName = (context as { label?: string })?.label || "this project";
    return `## Summary: ${nodeName}

This project is currently **active** with high priority. Based on the linked tasks and goals, you're making steady progress but have a few blockers to address.

**Status:** In progress
**Next milestone:** Getting to a working demo state
**Key risks:** Timeline pressure, technical complexity in the core architecture
**Recommendation:** Focus on the smallest thing that proves the concept works end-to-end.`;
  }

  if (lower.includes("block") || lower.includes("stuck")) {
    return `Let me analyze the blockers:

**Identified blockers:**
1. Missing technical decisions that are delaying implementation
2. Context switching between too many projects simultaneously
3. Some tasks lack clear next actions

**Recommendations:**
- Time-box each project to specific days (e.g., Mon/Wed = AION, Tue/Thu = AI Mail)
- Write a one-pager for any decision that's been sitting >3 days
- Every task should have a concrete first step (verb + noun format)`;
  }

  if (lower.includes("next step") || lower.includes("what to do")) {
    return `Here are your suggested next steps:

1. **Define the MVP scope** — What's the smallest thing that works end-to-end?
2. **Unblock dependencies** — Identify and resolve anything blocking other tasks
3. **Set a 2-week milestone** — Concrete, measurable, and achievable
4. **Schedule deep work** — 2-3 hour blocks, no meetings, no context switching

Want me to break down any of these into specific tasks?`;
  }

  return `I understand you're asking about: "${message}"

Here's my analysis based on your current context:

Your projects are interconnected — decisions in one area affect others. I'd recommend:

1. **Clarify the immediate goal** — What does "done" look like this week?
2. **Identify the highest-leverage action** — What single thing would move things most?
3. **Remove friction** — What's making this harder than it needs to be?

I'm here to help you think through any aspect of your projects. What would be most useful to explore?`;
}
