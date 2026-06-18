import { prisma } from "@/lib/db";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

async function maybeCreateProject({ approval, output }: Ctx): Promise<string | null> {
  if (!output) return null;
  if (output.projectId) return output.projectId;
  const baseName = approval.title.replace(/^Review:\s*/i, "");
  const slug = slugify(baseName) + "-" + Date.now().toString(36).slice(-4);
  const project = await prisma.project.create({
    data: {
      name:        baseName,
      slug,
      description: output.description ?? null,
      status:      "active",
      priority:    approval.priority,
      nextAction:  `Follow through on approved decision: ${approval.decisionType.replace(/_/g, " ")}.`,
    },
  });
  await prisma.workforceOutput.update({
    where: { id: output.id },
    data:  { projectId: project.id },
  });
  return project.id;
}

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

async function handleOutreach(ctx: Ctx): Promise<ActionResultPayload> {
  const { approval, output, opportunity } = ctx;
  const projectId = await maybeCreateProject(ctx);
  const draft = await prisma.emailDraft.create({
    data: {
      title: approval.title,
      subject: output?.title ?? approval.title,
      body: output?.content ?? output?.description ?? null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: projectId ?? approval.projectId ?? output?.projectId ?? null,
      opportunityId: opportunity?.id ?? null,
    },
  });

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Outreach approved — email draft created",
      description: `Draft: "${draft.title}"${projectId ? " · Initiative created" : ""}`,
      targetType: "email_draft",
      targetId: draft.id,
    },
  });
}

async function handleCampaign(ctx: Ctx): Promise<ActionResultPayload> {
  const { approval, output, opportunity } = ctx;
  const projectId = await maybeCreateProject(ctx);
  const draft = await prisma.campaignDraft.create({
    data: {
      name: approval.title,
      channel: "email",
      adCopy: output?.content ?? null,
      goal: output?.description ?? null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: projectId ?? approval.projectId ?? output?.projectId ?? null,
      opportunityId: opportunity?.id ?? null,
    },
  });

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Campaign approved — draft created",
      description: `Draft: "${draft.name}"${projectId ? " · Initiative created" : ""}`,
      targetType: "campaign_draft",
      targetId: draft.id,
    },
  });
}

async function handleContent(ctx: Ctx): Promise<ActionResultPayload> {
  const { approval, output, opportunity } = ctx;
  const projectId = await maybeCreateProject(ctx);
  const draft = await prisma.contentDraft.create({
    data: {
      title: approval.title,
      body: output?.content ?? null,
      publishingNotes: output?.description ?? null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: projectId ?? approval.projectId ?? output?.projectId ?? null,
      opportunityId: opportunity?.id ?? null,
    },
  });

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Content approved — draft created",
      description: `Draft: "${draft.title}"${projectId ? " · Initiative created" : ""}`,
      targetType: "content_draft",
      targetId: draft.id,
    },
  });
}

async function handleProduct(ctx: Ctx): Promise<ActionResultPayload> {
  const { approval, output, opportunity } = ctx;
  const projectId = await maybeCreateProject(ctx);
  const draft = await prisma.productDraft.create({
    data: {
      title: approval.title,
      description: output?.description ?? null,
      supplierNotes: output?.content ? output.content.slice(0, 1000) : null,
      status: "draft",
      sourceApprovalId: approval.id,
      sourceOutputId: output?.id ?? null,
      projectId: projectId ?? approval.projectId ?? output?.projectId ?? null,
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
      title: "Product approved — draft created",
      description: `Draft: "${draft.title}"${projectId ? " · Initiative created" : ""}`,
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

async function handleResearch(ctx: Ctx): Promise<ActionResultPayload> {
  const { approval, output } = ctx;
  if (output) {
    await prisma.workforceOutput.update({
      where: { id: output.id },
      data: { status: "approved", approvedAt: new Date() },
    });
  }
  const projectId = await maybeCreateProject(ctx);

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: "Research approved — initiative created",
      description: output
        ? `Output "${output.title}" approved${projectId ? " · Initiative created to act on findings" : ""}`
        : "Research decision recorded",
      targetType: projectId ? "project" : (output ? "workforce_output" : null),
      targetId:   projectId ?? output?.id ?? null,
    },
  });
}

async function handleFounderDecision(ctx: Ctx): Promise<ActionResultPayload> {
  const { approval } = ctx;
  const projectId = await maybeCreateProject(ctx);

  return prisma.actionResult.create({
    data: {
      approvalId: approval.id,
      actionType: approval.decisionType,
      status: "dispatched",
      title: projectId ? "Decision approved — initiative created" : "Decision recorded",
      description: projectId
        ? `Initiative created from "${approval.title}"`
        : `Approval "${approval.title}" marked approved by founder`,
      targetType: projectId ? "project" : null,
      targetId:   projectId ?? null,
    },
  });
}
