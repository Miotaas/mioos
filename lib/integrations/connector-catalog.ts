/**
 * Static connector definitions.
 * The database (ConnectorConfig) stores runtime state: status, mode, maskedHint, timestamps.
 * This catalog stores static metadata: labels, env vars, safety notes, auth type.
 *
 * Secrets live ONLY in .env.local — never in the database or frontend.
 */

export type AuthType = "api_key" | "oauth" | "smtp" | "none";
export type ConnectorCategory = "ecommerce" | "automation_sales" | "youtube" | "crypto_stock";
export type ConnectorMode = "disabled" | "draft_only" | "approval_required" | "autonomous_limited";
export type ConnectorStatus = "not_connected" | "connected" | "error";

export interface ConnectorDef {
  slug: string;
  name: string;
  category: ConnectorCategory;
  categoryLabel: string;
  authType: AuthType;
  envKeys: string[];           // env vars this connector reads (names only — never values)
  description: string;
  safetyNote: string;
  defaultMode: ConnectorMode;
  isPlaceholder: boolean;      // true = not yet implemented, show as "Planned"
}

export const CONNECTOR_CATALOG: ConnectorDef[] = [
  // ── E-Commerce ─────────────────────────────────────────────────────
  {
    slug:          "shopify",
    name:          "Shopify",
    category:      "ecommerce",
    categoryLabel: "E-Commerce",
    authType:      "api_key",
    envKeys:       ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ACCESS_TOKEN"],
    description:   "Read products, orders, and inventory. Prepare product pages and launch plans for approval.",
    safetyNote:    "Default mode is Draft only — no orders, listings, or price changes without approval.",
    defaultMode:   "draft_only",
    isPlaceholder: false,
  },
  {
    slug:          "stripe",
    name:          "Stripe",
    category:      "ecommerce",
    categoryLabel: "E-Commerce",
    authType:      "api_key",
    envKeys:       ["STRIPE_SECRET_KEY"],
    description:   "Read revenue data, subscriptions, and customer records. No charges or refunds without approval.",
    safetyNote:    "Write operations (charges, refunds, subscriptions) always require Decide approval.",
    defaultMode:   "draft_only",
    isPlaceholder: false,
  },
  {
    slug:          "printful",
    name:          "Printful / Printify",
    category:      "ecommerce",
    categoryLabel: "E-Commerce",
    authType:      "api_key",
    envKeys:       ["PRINTFUL_API_KEY"],
    description:   "Research products and mockup designs. Prepare product drafts for store launches.",
    safetyNote:    "No product publishing or order fulfillment without approval.",
    defaultMode:   "draft_only",
    isPlaceholder: false,
  },
  {
    slug:          "meta-ads",
    name:          "Meta Ads",
    category:      "ecommerce",
    categoryLabel: "E-Commerce",
    authType:      "oauth",
    envKeys:       ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"],
    description:   "Read ad performance and audience data. Prepare campaign drafts and creative concepts.",
    safetyNote:    "No campaigns, ad sets, or budget changes without explicit founder approval in Decide.",
    defaultMode:   "disabled",
    isPlaceholder: false,
  },
  {
    slug:          "google-ads",
    name:          "Google Ads",
    category:      "ecommerce",
    categoryLabel: "E-Commerce",
    authType:      "oauth",
    envKeys:       ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"],
    description:   "Read campaign performance and keyword data. Prepare search ad drafts.",
    safetyNote:    "No spending or live campaign changes without approval. All budgets go through Decide.",
    defaultMode:   "disabled",
    isPlaceholder: false,
  },

  // ── Automation Sales ────────────────────────────────────────────────
  {
    slug:          "gmail",
    name:          "Gmail / Google Workspace",
    category:      "automation_sales",
    categoryLabel: "Automation Sales",
    authType:      "oauth",
    envKeys:       ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
    description:   "Read email context for lead qualification. Prepare outreach drafts for founder review.",
    safetyNote:    "No emails are sent without explicit approval in Decide. Drafts only by default.",
    defaultMode:   "draft_only",
    isPlaceholder: false,
  },
  {
    slug:          "smtp",
    name:          "SMTP (Email Sending)",
    category:      "automation_sales",
    categoryLabel: "Automation Sales",
    authType:      "smtp",
    envKeys:       ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"],
    description:   "Send approved outreach emails via SMTP. Only used after founder approves outreach in Decide.",
    safetyNote:    "Requires explicit approval for every outreach batch. No bulk sending in any mode.",
    defaultMode:   "disabled",
    isPlaceholder: false,
  },
  {
    slug:          "crm",
    name:          "CRM (HubSpot / Pipedrive)",
    category:      "automation_sales",
    categoryLabel: "Automation Sales",
    authType:      "api_key",
    envKeys:       ["CRM_API_KEY", "CRM_PROVIDER"],
    description:   "Sync leads and pipeline data. Create and update contacts after approval.",
    safetyNote:    "Contact creation and deal updates require approval. Read-only by default.",
    defaultMode:   "disabled",
    isPlaceholder: true,
  },

  // ── YouTube ─────────────────────────────────────────────────────────
  {
    slug:          "youtube-api",
    name:          "YouTube Data API",
    category:      "youtube",
    categoryLabel: "YouTube",
    authType:      "oauth",
    envKeys:       ["YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID"],
    description:   "Read channel analytics, video performance, and trending data. Prepare content strategy.",
    safetyNote:    "No video uploads or channel changes without approval. Analytics read is safe.",
    defaultMode:   "draft_only",
    isPlaceholder: false,
  },
  {
    slug:          "google-drive",
    name:          "Google Drive",
    category:      "youtube",
    categoryLabel: "YouTube",
    authType:      "oauth",
    envKeys:       ["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET"],
    description:   "Store scripts, assets, and content calendars. Read content files for processing.",
    safetyNote:    "Write access limited to designated MioOS folder. No sharing or deletion without approval.",
    defaultMode:   "draft_only",
    isPlaceholder: false,
  },
  {
    slug:          "video-tools",
    name:          "Video Production Tools",
    category:      "youtube",
    categoryLabel: "YouTube",
    authType:      "api_key",
    envKeys:       ["ELEVENLABS_API_KEY", "RUNWAY_API_KEY"],
    description:   "Generate voiceovers and video assets. Prepare production packages for approved content.",
    safetyNote:    "Asset generation requires approved script. No publishing without Decide approval.",
    defaultMode:   "disabled",
    isPlaceholder: true,
  },

  // ── Crypto / Stock ──────────────────────────────────────────────────
  {
    slug:          "paper-trading",
    name:          "Paper Trading (Internal)",
    category:      "crypto_stock",
    categoryLabel: "Crypto / Stock",
    authType:      "none",
    envKeys:       [],
    description:   "Simulated portfolio tracking with no real capital. Safe for research and backtesting.",
    safetyNote:    "No real capital involved. Always safe. Autonomous mode allowed for simulation only.",
    defaultMode:   "autonomous_limited",
    isPlaceholder: false,
  },
  {
    slug:          "broker-api",
    name:          "Broker API (IBKR / Alpaca)",
    category:      "crypto_stock",
    categoryLabel: "Crypto / Stock",
    authType:      "api_key",
    envKeys:       ["BROKER_API_KEY", "BROKER_API_SECRET"],
    description:   "Execute approved trades on a brokerage account. Requires explicit approval for every trade.",
    safetyNote:    "Real capital at risk. Disabled by default. Every trade requires Decide approval — no exceptions.",
    defaultMode:   "disabled",
    isPlaceholder: true,
  },
  {
    slug:          "exchange-api",
    name:          "Crypto Exchange API",
    category:      "crypto_stock",
    categoryLabel: "Crypto / Stock",
    authType:      "api_key",
    envKeys:       ["EXCHANGE_API_KEY", "EXCHANGE_API_SECRET"],
    description:   "Execute approved crypto trades on a connected exchange. Read-only market data for research.",
    safetyNote:    "Real capital at risk. Disabled by default. No autonomous trading — approval required for every trade.",
    defaultMode:   "disabled",
    isPlaceholder: true,
  },
];

export const CATEGORY_ORDER: ConnectorCategory[] = [
  "ecommerce",
  "automation_sales",
  "youtube",
  "crypto_stock",
];

export const CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  ecommerce:        "E-Commerce",
  automation_sales: "Automation Sales",
  youtube:          "YouTube",
  crypto_stock:     "Crypto / Stock",
};

export function getConnectorDef(slug: string): ConnectorDef | undefined {
  return CONNECTOR_CATALOG.find(c => c.slug === slug);
}

export const MODE_LABELS: Record<ConnectorMode, string> = {
  disabled:            "Disabled",
  draft_only:          "Draft only",
  approval_required:   "Approval required",
  autonomous_limited:  "Autonomous limited",
};

export const MODE_DESCRIPTIONS: Record<ConnectorMode, string> = {
  disabled:            "Connector is registered but inactive. No agent access.",
  draft_only:          "Agents can read and prepare drafts. No writes or sends.",
  approval_required:   "All actions require founder approval in Decide before execution.",
  autonomous_limited:  "Agents may perform safe read-only or simulation actions without approval.",
};
