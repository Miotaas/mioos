import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/auditLog";
import type { ParsedProposedAction } from "@/types";

// Safety boundary — these action types are permitted for internal execution.
// Nothing here touches external systems.
const EXECUTABLE_ACTION_TYPES = new Set([
  "create_task",
  "create_note",
  "create_memory",
  "create_capture",
  "update_lead_status",
  "schedule_followup",
  "flag_issue",
  "archive_lead",
  "create_opportunity",
  "create_prospect",
  "create_campaign_draft",
  "create_fulfillment_flow",
  "convert_prospect_to_lead",
  "prepare_outreach",
  "prepare_ad_campaign",
  "prepare_stripe_offer",
  "prepare_delivery_email",
  "store_pattern",
]);

export async function executeApprovedAction(approvalId: string): Promise<void> {
  // Load approval with agent context
  const approval = await prisma.approvalQueue.findUnique({
    where: { id: approvalId },
    include: {
      agentRun: {
        select: { agentId: true },
      },
    },
  });

  if (!approval) return;
  if (approval.status !== "approved") return;

  const agentId = approval.agentRun?.agentId ?? "";
  let action: ParsedProposedAction;

  try {
    action = JSON.parse(approval.proposedAction) as ParsedProposedAction;
  } catch {
    await prisma.executionHistory.create({
      data: {
        approvalId,
        agentId,
        actionType: "unknown",
        actionPayload: approval.proposedAction,
        status: "failed",
        error: "Could not parse proposedAction JSON",
        executedAt: new Date(),
      },
    });
    return;
  }

  // Create pending execution record
  const execRecord = await prisma.executionHistory.create({
    data: {
      approvalId,
      agentId,
      actionType: action.actionType,
      actionPayload: approval.proposedAction,
      status: "pending",
    },
  });

  // Safety check
  if (!EXECUTABLE_ACTION_TYPES.has(action.actionType)) {
    await prisma.executionHistory.update({
      where: { id: execRecord.id },
      data: {
        status: "failed",
        error: `Action type '${action.actionType}' is not permitted for internal execution`,
        executedAt: new Date(),
      },
    });
    await auditLog("approval", approvalId, "execution_blocked", {
      actionType: action.actionType,
      reason: "action type not in permitted list",
    });
    return;
  }

  const payload = (action.payload ?? {}) as Record<string, unknown>;
  const targetId = action.targetId ?? null;

  try {
    await dispatch(action.actionType, agentId, payload, targetId);

    await prisma.executionHistory.update({
      where: { id: execRecord.id },
      data: { status: "executed", executedAt: new Date() },
    });

    await auditLog("approval", approvalId, "approval_executed", {
      actionType: action.actionType,
      agentId,
      targetId,
    });

    // Trigger approved_action workflows (fire and forget)
    if (agentId) {
      import("@/lib/workflowRunner")
        .then(({ triggerWorkflows }) => triggerWorkflows("approved_action", agentId, 0))
        .catch(() => {});
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    await prisma.executionHistory.update({
      where: { id: execRecord.id },
      data: { status: "failed", error, executedAt: new Date() },
    });
    await auditLog("approval", approvalId, "execution_failed", {
      actionType: action.actionType,
      error,
    });
  }
}

async function dispatch(
  actionType: string,
  agentId: string,
  payload: Record<string, unknown>,
  targetId: string | null,
): Promise<void> {
  switch (actionType) {
    case "create_task":
      await prisma.task.create({
        data: {
          title: String(payload.title ?? "Agent-created task"),
          description: payload.description ? String(payload.description) : null,
          priority: String(payload.priority ?? "medium"),
          status: "todo",
          dueDate: payload.dueDate ? new Date(String(payload.dueDate)) : null,
          nodeId: payload.nodeId ? String(payload.nodeId) : null,
        },
      });
      break;

    case "create_note":
      await prisma.note.create({
        data: {
          title: String(payload.title ?? "Agent Note"),
          content: String(payload.content ?? payload.description ?? ""),
          tags: payload.tags ? JSON.stringify(payload.tags) : null,
          nodeId: payload.nodeId ? String(payload.nodeId) : null,
        },
      });
      break;

    case "create_memory": {
      await prisma.agentMemory.create({
        data: {
          agentId: String(payload.agentId ?? agentId),
          memoryType: String(payload.memoryType ?? "fact"),
          title: String(payload.title ?? "Memory"),
          content: String(payload.content ?? ""),
          importance: Number(payload.importance ?? 5),
        },
      });
      // Mark any matching MemorySuggestion as approved
      if (payload.memorySuggestionId) {
        await prisma.memorySuggestion.updateMany({
          where: { id: String(payload.memorySuggestionId) },
          data: { status: "approved" },
        });
      }
      break;
    }

    case "create_capture":
      await prisma.capture.create({
        data: {
          title: String(payload.title ?? "Agent Capture"),
          content: String(payload.content ?? payload.description ?? ""),
          source: "other",
          type: String(payload.type ?? "note"),
          priority: String(payload.priority ?? "medium"),
          status: "inbox",
          tags: payload.tags ? JSON.stringify(payload.tags) : null,
        },
      });
      break;

    case "update_lead_status":
      if (!targetId) throw new Error("targetId required for update_lead_status");
      await prisma.lead.update({
        where: { id: targetId },
        data: { status: String(payload.status ?? "contacted") },
      });
      break;

    case "schedule_followup":
      if (!targetId) throw new Error("targetId required for schedule_followup");
      await prisma.lead.update({
        where: { id: targetId },
        data: {
          nextAction: payload.nextAction ? String(payload.nextAction) : "Follow up",
          nextActionDate: payload.nextActionDate
            ? new Date(String(payload.nextActionDate))
            : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });
      break;

    case "flag_issue":
      // Flag a task as urgent or create a support capture
      if (targetId) {
        await prisma.task.update({
          where: { id: targetId },
          data: { priority: "urgent" },
        }).catch(() => {});
      }
      await prisma.capture.create({
        data: {
          title: String(payload.title ?? "Flagged issue"),
          content: String(payload.description ?? payload.content ?? "Agent flagged this item"),
          source: "other",
          type: "bug",
          priority: "urgent",
          status: "inbox",
        },
      });
      break;

    case "archive_lead":
      if (!targetId) throw new Error("targetId required for archive_lead");
      await prisma.lead.update({
        where: { id: targetId },
        data: { status: "archived" },
      });
      break;

    case "create_opportunity":
      await prisma.commerceOpportunity.create({
        data: {
          title: String(payload.title ?? "Agent Opportunity"),
          opportunityType: String(payload.opportunityType ?? "digital_product"),
          targetCustomer: payload.targetCustomer ? String(payload.targetCustomer) : null,
          painPoint: payload.painPoint ? String(payload.painPoint) : null,
          offer: payload.offer ? String(payload.offer) : null,
          estimatedRevenue: payload.estimatedRevenue ? Number(payload.estimatedRevenue) : null,
          estimatedMargin: payload.estimatedMargin ? Number(payload.estimatedMargin) : null,
          buildEffort: String(payload.buildEffort ?? "medium"),
          salesDifficulty: String(payload.salesDifficulty ?? "medium"),
          fulfillmentDifficulty: String(payload.fulfillmentDifficulty ?? "medium"),
          riskLevel: String(payload.riskLevel ?? "medium"),
          status: "discovered",
          source: "agent",
          notes: payload.notes ? String(payload.notes) : null,
          createdByAgentId: agentId || null,
        },
      });
      break;

    case "create_prospect":
      await prisma.prospect.create({
        data: {
          companyName: String(payload.companyName ?? "Unknown Company"),
          contactName: payload.contactName ? String(payload.contactName) : null,
          role: payload.role ? String(payload.role) : null,
          email: payload.email ? String(payload.email) : null,
          linkedinUrl: payload.linkedinUrl ? String(payload.linkedinUrl) : null,
          website: payload.website ? String(payload.website) : null,
          industry: payload.industry ? String(payload.industry) : null,
          country: payload.country ? String(payload.country) : null,
          fitScore: payload.fitScore ? Number(payload.fitScore) : null,
          painPointHypothesis: payload.painPointHypothesis ? String(payload.painPointHypothesis) : null,
          suggestedOffer: payload.suggestedOffer ? String(payload.suggestedOffer) : null,
          source: "agent",
          status: "discovered",
          createdByAgentId: agentId || null,
        },
      });
      break;

    case "create_campaign_draft":
    case "prepare_ad_campaign":
      await prisma.campaignDraft.create({
        data: {
          name: String(payload.name ?? payload.title ?? "Agent Campaign Draft"),
          channel: String(payload.channel ?? "email"),
          goal: payload.goal ? String(payload.goal) : null,
          targetAudience: payload.targetAudience ? String(payload.targetAudience) : null,
          offer: payload.offer ? String(payload.offer) : null,
          hook: payload.hook ? String(payload.hook) : null,
          adCopy: payload.adCopy ? String(payload.adCopy) : null,
          outreachMessage: payload.outreachMessage ? String(payload.outreachMessage) : null,
          cta: payload.cta ? String(payload.cta) : null,
          suggestedBudget: payload.suggestedBudget ? Number(payload.suggestedBudget) : null,
          expectedObjection: payload.expectedObjection ? String(payload.expectedObjection) : null,
          successMetric: payload.successMetric ? String(payload.successMetric) : null,
          status: "draft",
          createdByAgentId: agentId || null,
        },
      });
      break;

    case "create_fulfillment_flow":
      await prisma.fulfillmentFlow.create({
        data: {
          name: String(payload.name ?? "Fulfillment Flow"),
          productName: String(payload.productName ?? "Product"),
          paymentProvider: String(payload.paymentProvider ?? "manual"),
          deliveryType: String(payload.deliveryType ?? "email_delivery"),
          confirmationEmailTemplate: payload.confirmationEmailTemplate ? String(payload.confirmationEmailTemplate) : null,
          deliveryEmailTemplate: payload.deliveryEmailTemplate ? String(payload.deliveryEmailTemplate) : null,
          followUpEmailTemplate: payload.followUpEmailTemplate ? String(payload.followUpEmailTemplate) : null,
          supportInstructions: payload.supportInstructions ? String(payload.supportInstructions) : null,
          invoiceRequired: Boolean(payload.invoiceRequired ?? false),
          status: "draft",
          createdByAgentId: agentId || null,
        },
      });
      break;

    case "convert_prospect_to_lead":
      if (!targetId) throw new Error("targetId required for convert_prospect_to_lead");
      {
        const prospect = await prisma.prospect.findUnique({ where: { id: targetId } });
        if (!prospect) throw new Error(`Prospect ${targetId} not found`);
        await prisma.lead.create({
          data: {
            companyName: prospect.companyName,
            contactName: prospect.contactName,
            email: prospect.email,
            website: prospect.website,
            linkedin: prospect.linkedinUrl,
            industry: prospect.industry,
            painPoint: prospect.painPointHypothesis,
            status: "new",
            leadSource: "agent",
            priority: "medium",
          },
        });
        await prisma.prospect.update({
          where: { id: targetId },
          data: { status: "converted_to_lead" },
        });
      }
      break;

    case "prepare_outreach":
      await prisma.capture.create({
        data: {
          title: String(payload.subject ?? payload.title ?? "Outreach Draft"),
          content: String(payload.message ?? payload.content ?? payload.description ?? ""),
          source: "other",
          type: "sales_note",
          priority: "high",
          status: "inbox",
          tags: JSON.stringify(["outreach-draft", String(payload.channel ?? "email")]),
        },
      });
      break;

    case "prepare_stripe_offer":
      await prisma.capture.create({
        data: {
          title: String(payload.productName ?? payload.title ?? "Stripe Offer Draft"),
          content: `Price: ${payload.price ?? "TBD"}\nDescription: ${payload.description ?? ""}\nNotes: ${payload.notes ?? ""}`,
          source: "other",
          type: "technical_note",
          priority: "medium",
          status: "inbox",
          tags: JSON.stringify(["stripe-offer-draft"]),
        },
      });
      break;

    case "prepare_delivery_email":
      await prisma.capture.create({
        data: {
          title: String(payload.subject ?? payload.title ?? "Delivery Email Draft"),
          content: String(payload.template ?? payload.body ?? payload.content ?? ""),
          source: "other",
          type: "technical_note",
          priority: "medium",
          status: "inbox",
          tags: JSON.stringify(["delivery-email-draft"]),
        },
      });
      break;

    case "store_pattern": {
      const patternId = payload.patternId ? String(payload.patternId) : null;
      if (patternId) {
        await prisma.patternRecord.update({
          where: { id: patternId },
          data: { status: "approved", updatedAt: new Date() },
        });
      }
      break;
    }

    default:
      throw new Error(`Unhandled action type: ${actionType}`);
  }
}
