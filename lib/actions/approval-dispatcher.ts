import { prisma } from "@/lib/db";

export interface ActionResultPayload {
  id: string;
  approvalId: string;
  actionType: string;
  status: string;
  title: string;
  description: string | null;
  targetType: string | null;
  targetId: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function dispatchApprovalAction(approvalId: string): Promise<ActionResultPayload> {
  // Entire function is wrapped so we always return an ActionResult, never throw
  try {
    const approval = await prisma.approval.findUniqueOrThrow({ where: { id: approvalId } });

    const output = approval.relatedOutputId
      ? await prisma.workforceOutput.findUnique({ where: { id: approval.relatedOutputId } })
      : null;

    const opportunity = output?.opportunityId
      ? await prisma.opportunity.findUnique({ where: { id: output.opportunityId } })
      : null;

    const ctx = { approval, output, opportunity };

    switch (approval.decisionType) {
      case "approve_outreach":   return await handleOutreach(ctx);
      case "approve_campaign":   return await handleCampaign(ctx);
      case "approve_content":    return await handleContent(ctx);
      case "approve_product":    return await handleProduct(ctx);
      case "approve_deployment": return await handleDeployment(ctx);
      case "approve_proposal":   return await handleProposal(ctx);
      case "review_research":    return await handleResearch(ctx);
      default:                   return await handleFounderDecision(ctx);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return prisma.actionResult.create({
      data: {
        approvalId,
        actionType: "unknown",
        status: "failed",
        title: "Action dispatch failed",
        error: message,
      },
    });
  }
}

type Ctx = {
  approval: Awaited<ReturnType<typeof prisma.approval.findUniqueOrThrow>>;
  output: Awaited<ReturnType<typeof prisma.workforceOutput.findUnique>>;
  opportunity: Awaited<ReturnType<typeof prisma.opportunity.findUnique>>;
};

async function handleOutreach({ approval, output, opportunity }: Ctx): Promise<ActionResultPayload> {
  const draft = await prisma.emailDraft.create({
    data: {
      title: approval.title,
      subject: output?.title ?? approval.title,
      body: output?.content ?? output?.description ?? null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: approval.projectId ?? output?.projectId ?? null,
      opportunityId: opportunity?.id ?? null,
    },
  });

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Email draft created",
      description: `Draft: "${draft.title}"`,
      targetType: "email_draft",
      targetId: draft.id,
    },
  });
}

async function handleCampaign({ approval, output, opportunity }: Ctx): Promise<ActionResultPayload> {
  const draft = await prisma.campaignDraft.create({
    data: {
      name: approval.title,
      channel: "email",
      adCopy: output?.content ?? null,
      goal: output?.description ?? null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: approval.projectId ?? output?.projectId ?? null,
      opportunityId: opportunity?.id ?? null,
    },
  });

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Campaign draft created",
      description: `Draft: "${draft.name}"`,
      targetType: "campaign_draft",
      targetId: draft.id,
    },
  });
}

async function handleContent({ approval, output, opportunity }: Ctx): Promise<ActionResultPayload> {
  const draft = await prisma.contentDraft.create({
    data: {
      title: approval.title,
      body: output?.content ?? null,
      publishingNotes: output?.description ?? null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: approval.projectId ?? output?.projectId ?? null,
      opportunityId: opportunity?.id ?? null,
    },
  });

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Content draft created",
      description: `Draft: "${draft.title}"`,
      targetType: "content_draft",
      targetId: draft.id,
    },
  });
}

async function handleProduct({ approval, output, opportunity }: Ctx): Promise<ActionResultPayload> {
  const draft = await prisma.productDraft.create({
    data: {
      title: approval.title,
      description: output?.description ?? null,
      supplierNotes: output?.content ? output.content.slice(0, 1000) : null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: approval.projectId ?? output?.projectId ?? null,
      opportunityId: opportunity?.id ?? null,
      priceSuggestion: opportunity?.estimatedRevenue
        ? Math.round(opportunity.estimatedRevenue * 0.1)
        : null,
    },
  });

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Product draft created",
      description: `Draft: "${draft.title}"`,
      targetType: "product_draft",
      targetId: draft.id,
    },
  });
}

async function handleDeployment({ approval, output, opportunity }: Ctx): Promise<ActionResultPayload> {
  const draft = await prisma.developmentDraft.create({
    data: {
      title: approval.title,
      readmeContent: output?.content ?? null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: approval.projectId ?? output?.projectId ?? null,
      opportunityId: opportunity?.id ?? null,
    },
  });

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Development plan created",
      description: `Draft: "${draft.title}"`,
      targetType: "development_draft",
      targetId: draft.id,
    },
  });
}

async function handleProposal({ approval, output, opportunity }: Ctx): Promise<ActionResultPayload> {
  const draft = await prisma.proposalDraft.create({
    data: {
      title: approval.title,
      solution: output?.description ?? null,
      problem: opportunity?.description ?? null,
      pricing: opportunity?.estimatedRevenue != null
        ? `Estimated revenue: €${opportunity.estimatedRevenue.toLocaleString()}`
        : null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: approval.projectId ?? output?.projectId ?? null,
      opportunityId: opportunity?.id ?? null,
    },
  });

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Proposal draft created",
      description: `Draft: "${draft.title}"`,
      targetType: "proposal_draft",
      targetId: draft.id,
    },
  });
}

async function handleResearch({ approval, output }: Ctx): Promise<ActionResultPayload> {
  if (output) {
    await prisma.workforceOutput.update({
      where: { id: output.id },
      data: { status: "approved", approvedAt: new Date() },
    });
  }

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Research approved",
      description: output ? `Output "${output.title}" marked approved` : null,
      targetType: output ? "workforce_output" : null,
      targetId: output?.id ?? null,
    },
  });
}

async function handleFounderDecision({ approval }: Ctx): Promise<ActionResultPayload> {
  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Decision recorded",
      description: `Approval "${approval.title}" marked approved by founder`,
      targetType: null,
      targetId: null,
    },
  });
}
