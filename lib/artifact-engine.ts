import { prisma } from "@/lib/db";

export type ArtifactType =
  | "prospect_list"
  | "market_analysis"
  | "validation_report"
  | "outreach_sequence"
  | "campaign"
  | "ad_angles"
  | "landing_page"
  | "product_page"
  | "proposal"
  | "demo_spec"
  | "automation_blueprint"
  | "technical_plan"
  | "deployment_plan"
  | "faq"
  | "knowledge_base"
  | "executive_review";

const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  prospect_list:       "Prospect List",
  market_analysis:     "Market Analysis",
  validation_report:   "Validation Report",
  outreach_sequence:   "Outreach Sequence",
  campaign:            "Campaign Brief",
  ad_angles:           "Ad Angles",
  landing_page:        "Landing Page",
  product_page:        "Product Page",
  proposal:            "Proposal",
  demo_spec:           "Demo Specification",
  automation_blueprint:"Automation Blueprint",
  technical_plan:      "Technical Plan",
  deployment_plan:     "Deployment Plan",
  faq:                 "FAQ & Knowledge Base",
  knowledge_base:      "Knowledge Base",
  executive_review:    "Executive Review",
};

export function getArtifactLabel(type: ArtifactType): string {
  return ARTIFACT_LABELS[type] ?? type;
}

export function resolveArtifactType(departmentType: string, assignmentTitle: string): ArtifactType {
  const title = assignmentTitle.toLowerCase();
  const dept  = departmentType.toLowerCase();

  switch (dept) {
    case "research":
      if (title.includes("validate") || title.includes("validation") || title.includes("saas market")) return "validation_report";
      return "market_analysis";

    case "sales":
      if (title.includes("proposal") || title.includes("pitch"))            return "proposal";
      if (title.includes("outreach") || title.includes("sequence"))         return "outreach_sequence";
      return "prospect_list"; // default: qualify prospects

    case "marketing":
      if (title.includes("ad") || title.includes("angle"))                  return "ad_angles";
      if (title.includes("landing") || title.includes("page"))              return "landing_page";
      return "campaign";

    case "content":
      if (title.includes("product") || title.includes("copy"))              return "product_page";
      if (title.includes("landing"))                                         return "landing_page";
      return "knowledge_base";

    case "development":
      if (title.includes("demo") || title.includes("concept"))              return "demo_spec";
      if (title.includes("automation") || title.includes("blueprint"))      return "automation_blueprint";
      if (title.includes("mvp") || title.includes("scope"))                 return "technical_plan";
      if (title.includes("deploy") || title.includes("checklist"))          return "deployment_plan";
      if (title.includes("landing") || title.includes("product page"))      return "landing_page";
      return "technical_plan";

    case "commerce":
      return "validation_report";

    case "operations":
      return "deployment_plan";

    case "support":
      return "faq";

    case "executive":
      return "executive_review";

    default:
      return "market_analysis";
  }
}

export async function createArtifactFromOutput(params: {
  outputId:     string;
  assignmentId: string;
  teamId:       string;
  departmentType: string;
  title:        string;
  content:      string;
  opportunityId?: string | null;
  projectId?:    string | null;
  goalId?:       string | null;
}): Promise<string | null> {
  try {
    const artifactType = resolveArtifactType(params.departmentType, params.title);

    const artifact = await prisma.artifact.create({
      data: {
        title:         params.title.slice(0, 180),
        content:       params.content,
        artifactType,
        status:        "draft",
        sourceTeamId:  params.teamId,
        assignmentId:  params.assignmentId,
        outputId:      params.outputId,
        opportunityId: params.opportunityId ?? null,
        projectId:     params.projectId ?? null,
        goalId:        params.goalId ?? null,
      },
    });

    return artifact.id;
  } catch (err) {
    console.error("[artifact-engine] Failed to create artifact:", err);
    return null;
  }
}

export async function promoteArtifact(artifactId: string): Promise<void> {
  await prisma.artifact.update({
    where: { id: artifactId },
    data: { status: "ready" },
  });
}

export async function getArtifactsForOpportunity(opportunityId: string) {
  return prisma.artifact.findMany({
    where:   { opportunityId, status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getArtifactSummary(): Promise<{
  total:    number;
  thisWeek: number;
  byType:   Record<string, number>;
}> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [total, thisWeek, byTypeRaw] = await Promise.all([
    prisma.artifact.count({ where: { status: { not: "archived" } } }),
    prisma.artifact.count({ where: { createdAt: { gte: weekAgo }, status: { not: "archived" } } }),
    prisma.artifact.groupBy({
      by: ["artifactType"],
      _count: { id: true },
      where: { status: { not: "archived" } },
    }),
  ]);

  const byType: Record<string, number> = {};
  for (const row of byTypeRaw) byType[row.artifactType] = row._count.id;

  return { total, thisWeek, byType };
}
