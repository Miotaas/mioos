import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { UnifiedDraft, DraftType } from "@/types";

function truncate(s: string | null | undefined, max = 160): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filterType   = searchParams.get("type");    // email|campaign|content|product|proposal|development
    const filterStatus = searchParams.get("status");  // draft|review_needed|approved|rejected|archived
    const search       = searchParams.get("q")?.toLowerCase();
    const limit        = Math.min(Number(searchParams.get("limit") ?? "100"), 200);

    // Fetch all 6 draft types in parallel
    const [emails, campaigns, contents, products, proposals, developments] = await Promise.all([
      (!filterType || filterType === "email")
        ? prisma.emailDraft.findMany({ orderBy: { createdAt: "desc" }, take: limit })
        : [],
      (!filterType || filterType === "campaign")
        ? prisma.campaignDraft.findMany({ orderBy: { createdAt: "desc" }, take: limit })
        : [],
      (!filterType || filterType === "content")
        ? prisma.contentDraft.findMany({ orderBy: { createdAt: "desc" }, take: limit })
        : [],
      (!filterType || filterType === "product")
        ? prisma.productDraft.findMany({ orderBy: { createdAt: "desc" }, take: limit })
        : [],
      (!filterType || filterType === "proposal")
        ? prisma.proposalDraft.findMany({ orderBy: { createdAt: "desc" }, take: limit })
        : [],
      (!filterType || filterType === "development")
        ? prisma.developmentDraft.findMany({ orderBy: { createdAt: "desc" }, take: limit })
        : [],
    ]);

    // Collect all unique opportunity / project IDs for enrichment
    const allDrafts = [
      ...emails.map(d => ({ ...d, draftType: "email" as const })),
      ...campaigns.map(d => ({ ...d, draftType: "campaign" as const, title: d.name })),
      ...contents.map(d => ({ ...d, draftType: "content" as const })),
      ...products.map(d => ({ ...d, draftType: "product" as const })),
      ...proposals.map(d => ({ ...d, draftType: "proposal" as const })),
      ...developments.map(d => ({ ...d, draftType: "development" as const })),
    ];

    const oppIds = [...new Set(allDrafts.map(d => d.opportunityId).filter(Boolean))] as string[];
    const projIds = [...new Set(allDrafts.map(d => d.projectId).filter(Boolean))] as string[];
    const approvalIds = [...new Set(allDrafts.map(d => (d as { sourceApprovalId?: string | null }).sourceApprovalId).filter(Boolean))] as string[];

    const [opportunities, projects, approvals] = await Promise.all([
      oppIds.length > 0
        ? prisma.opportunity.findMany({ where: { id: { in: oppIds } }, select: { id: true, title: true } })
        : [],
      projIds.length > 0
        ? prisma.project.findMany({ where: { id: { in: projIds } }, select: { id: true, name: true } })
        : [],
      approvalIds.length > 0
        ? prisma.approval.findMany({
            where: { id: { in: approvalIds } },
            select: { id: true, title: true, sourceTeamId: true, sourceTeam: { select: { name: true } } },
          })
        : [],
    ]);

    const oppMap   = new Map(opportunities.map(o => [o.id, o.title]));
    const projMap  = new Map(projects.map(p => [p.id, p.name]));
    const apprMap  = new Map(approvals.map(a => [a.id, a.sourceTeam?.name ?? null]));

    // Normalize to UnifiedDraft
    const normalized: UnifiedDraft[] = allDrafts.map(d => {
      const base = d as {
        id: string; title: string; draftType: DraftType; status: string;
        opportunityId?: string | null; projectId?: string | null;
        sourceApprovalId?: string | null; sourceOutputId?: string | null;
        createdAt: Date; updatedAt: Date;
        body?: string | null; content?: string | null; adCopy?: string | null;
        outreachMessage?: string | null; readmeContent?: string | null;
        description?: string | null; solution?: string | null;
        subject?: string | null; recipientName?: string | null; recipientEmail?: string | null;
        platform?: string | null; priceSuggestion?: number | null;
        customer?: string | null; repoNameSuggestion?: string | null;
      };

      const rawContent = base.body ?? base.adCopy ?? base.outreachMessage
        ?? base.readmeContent ?? base.solution ?? base.description ?? base.content ?? null;

      return {
        id:                base.id,
        draftType:         base.draftType,
        title:             base.title,
        preview:           truncate(rawContent),
        editableContent:   rawContent,
        status:            base.status,
        sourceApprovalId:  base.sourceApprovalId ?? null,
        sourceOutputId:    base.sourceOutputId ?? null,
        projectId:         base.projectId ?? null,
        opportunityId:     base.opportunityId ?? null,
        createdAt:         base.createdAt.toISOString(),
        updatedAt:         base.updatedAt.toISOString(),
        opportunityTitle:  base.opportunityId ? (oppMap.get(base.opportunityId) ?? null) : null,
        projectName:       base.projectId ? (projMap.get(base.projectId) ?? null) : null,
        sourceTeamName:    base.sourceApprovalId ? (apprMap.get(base.sourceApprovalId) ?? null) : null,
        subject:           base.subject ?? null,
        recipientName:     base.recipientName ?? null,
        recipientEmail:    base.recipientEmail ?? null,
        platform:          base.platform ?? null,
        priceSuggestion:   base.priceSuggestion ?? null,
        customer:          base.customer ?? null,
        repoNameSuggestion: base.repoNameSuggestion ?? null,
      };
    });

    // Apply status filter and search filter
    let result = normalized;
    if (filterStatus) {
      result = result.filter(d => d.status === filterStatus);
    }
    if (search) {
      result = result.filter(d =>
        d.title.toLowerCase().includes(search) ||
        (d.editableContent ?? "").toLowerCase().includes(search)
      );
    }

    // Sort by createdAt desc
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(result.slice(0, limit));
  } catch (error) {
    console.error("[drafts GET]", error);
    return NextResponse.json({ error: "Failed to fetch drafts" }, { status: 500 });
  }
}
