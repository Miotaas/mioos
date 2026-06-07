import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_CONNECTORS = [
  { name: "LinkedIn", provider: "linkedin", notes: "Prospect research and outreach drafts. Requires LinkedIn API or Sales Navigator. Never sends messages automatically." },
  { name: "Gmail", provider: "gmail", notes: "Email outreach drafts and order confirmation delivery. Never sends emails without explicit approval." },
  { name: "Outlook", provider: "outlook", notes: "Alternative to Gmail for email outreach and notifications. Approval required for every send." },
  { name: "Stripe", provider: "stripe", notes: "Checkout link generation and order tracking. No live products created without approval." },
  { name: "Meta Ads", provider: "meta_ads", notes: "Facebook and Instagram ad campaign drafts. Never launches or spends budget without approval." },
  { name: "Google Ads", provider: "google_ads", notes: "Search and display ad campaign drafts. Never launches or spends budget without approval." },
  { name: "Shopify", provider: "shopify", notes: "Digital product listing drafts. Never publishes listings or processes orders without approval." },
  { name: "Gumroad", provider: "gumroad", notes: "Digital product publishing drafts. Supports PLR, bundles, affiliate programs." },
  { name: "Web Search", provider: "web_search", notes: "Research and market analysis. Read-only. No data is submitted or posted." },
  { name: "Browser Automation", provider: "browser", notes: "Form filling and data extraction drafts. All actions require explicit approval before execution." },
];

export async function GET() {
  try {
    const count = await prisma.connectorRegistry.count();
    if (count === 0) {
      await prisma.connectorRegistry.createMany({
        data: DEFAULT_CONNECTORS.map(c => ({
          name: c.name,
          provider: c.provider,
          status: "planned",
          requiresApproval: true,
          notes: c.notes,
        })),
      });
    }
    const items = await prisma.connectorRegistry.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch connectors" }, { status: 500 });
  }
}
