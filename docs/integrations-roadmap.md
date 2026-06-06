# MioOS — Integrations Roadmap

## Current State (Phase 5/6)

MioOS supports **manual capture** via the Capture Inbox and **programmatic capture** via a REST API.

---

## Manual Capture Workflow

1. Open MioOS → **Capture** (sidebar)
2. Click **New Capture**
3. Paste content (ChatGPT excerpt, Claude summary, meeting notes, ideas, decisions, bugs)
4. Set source, type, priority, tags, and optionally link to a project node
5. **Save to Inbox**
6. Click a capture card to open the detail panel
7. Convert it to a **Note**, **Task**, **Goal**, or **Node**
8. Or use **Extract action items** to detect TODO-style lines and approve task creation

---

## Capture Conversion Workflow

Each capture can be converted to:

| Target | What gets mapped |
|--------|-----------------|
| **Note** | title, content, tags, nodeId |
| **Task** | title, content (→ description), priority, nodeId |
| **Goal** | title, content (→ description), nodeId |
| **Node** | title, content (→ description), priority |

After the first conversion, the capture is marked **Processed** and the conversion is recorded.
Clicking a convert button again will ask for confirmation before creating a duplicate.
Pass `force: true` in the API to skip the confirmation.

---

## API Capture Endpoint

`POST /api/capture` accepts external context from any tool.

### No auth (default, local dev only)

```bash
curl -X POST http://localhost:3000/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add Outlook sync to Mail Copilot",
    "content": "Need to add Outlook sync later for Mail Copilot. Should support read + send. Also consider OAuth flow.",
    "source": "chatgpt",
    "type": "task",
    "priority": "high",
    "tags": ["mail-copilot", "roadmap"]
  }'
```

### With token auth (when CAPTURE_API_TOKEN is set)

```bash
curl -X POST http://localhost:3000/api/capture \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Add Outlook sync to Mail Copilot",
    "content": "Need to add Outlook sync later for Mail Copilot.",
    "source": "chatgpt",
    "type": "task",
    "priority": "high"
  }'
```

### Enabling token auth

Set in `.env.local`:
```
CAPTURE_API_TOKEN=your-secret-token-here
```

When this env var is set, all `POST /api/capture` requests must include the `Authorization: Bearer <token>` header. Requests without the correct token are rejected with `401 Unauthorized`.

If the env var is **not set**, the endpoint is open — safe for local development only.

### Request body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `content` | string | **Yes** | Cannot be empty |
| `title` | string | No | Auto-generated from first 60 chars of content if missing |
| `source` | string | No | chatgpt / claude / manual / whatsapp / email / meeting / other |
| `type` | string | No | note / task / idea / decision / bug / roadmap / goal / project_update / sales_note / technical_note |
| `priority` | string | No | low / medium / high / urgent |
| `status` | string | No | inbox / processed / archived (default: inbox) |
| `tags` | array or string | No | Array of strings, JSON array string, or comma-separated string |
| `nodeId` | string | No | Link to an existing node/project |

### Error responses

| Status | Meaning |
|--------|---------|
| 400 | content is empty or missing |
| 401 | CAPTURE_API_TOKEN is set and token is missing/wrong |
| 500 | Server error |

---

## Extract Action Items

The **Extract action items** button uses deterministic local logic (no AI) to detect lines with:

**English keywords:** todo, next step, fix, build, add, improve, test, should, need to, must, implement, create, update, refactor, check, make sure, ensure, setup, set up

**Dutch keywords:** moet, moeten, volgende stap, oplossen, toevoegen, bouwen, verbeteren, testen, moet worden, nodig, afmaken

Detected items are shown as suggestions. You must approve each one before tasks are created.
No tasks are created automatically.

---

## Known Limitations

- No authentication on `GET /api/capture` or `PATCH`/`DELETE` — this is intentional for local use
- Extract action items is keyword-based only — will miss context-dependent action items
- Converted node always lands at position (0,0) in the graph — drag it to reposition
- No full-text search across captures yet
- Dashboard capture count updates only on page reload

---

## Planned: Browser Extension (Phase 7)

A Chrome extension will allow:
- Select text on any page → right-click → **Send to MioOS**
- Capture from ChatGPT conversations
- Capture from Claude sessions
- Capture from any webpage

**Implementation plan:**
1. Build Chrome extension with `manifest_v3`
2. Add context menu "Send to MioOS"
3. POST selected text to `/api/capture` with `source: "browser_extension"`
4. Set `CAPTURE_API_TOKEN` in extension settings
5. Show confirmation popup

---

## Planned: MCP Connector (Phase 8)

MioOS will expose an MCP (Model Context Protocol) server so Claude can:
- Create captures directly from a Claude conversation
- Query existing captures and linked nodes
- Convert captures to tasks/goals
- Search the knowledge graph

**Implementation plan:**
1. Add `@modelcontextprotocol/sdk` dependency
2. Create MCP server at `mcp/server.ts`
3. Expose tools: `create_capture`, `list_captures`, `convert_capture`, `search_graph`
4. Register in Claude Desktop config

---

## Planned: Webhooks / External Tools (Phase 6+)

`POST /api/capture` is already usable from:
- Zapier / Make / n8n — HTTP action → MioOS
- iOS Shortcuts — HTTP request with text
- Raycast extension
- Any tool that can make HTTP POST requests

**Future dedicated webhooks:**
- `POST /api/webhook/chatgpt` — ChatGPT custom action
- `POST /api/webhook/whatsapp` — WhatsApp message forwarding
- `POST /api/webhook/email` — Email forwarding via Postmark/Mailgun

---

## Security Considerations

| Surface | Current State | Required Before External Use |
|---------|--------------|------------------------------|
| `POST /api/capture` | Open unless `CAPTURE_API_TOKEN` is set | Set token in `.env.local` |
| `GET /api/capture` | Always open | Accept — read-only, local only |
| `PATCH/DELETE /api/capture/[id]` | Open | Consider token auth for writes |
| Browser extension | Not built | Token in extension settings |
| MCP connector | Not built | Localhost-only or token scoped |
| Webhooks | Not built | HMAC signature verification |

**Do not expose MioOS to the internet without token auth.**

---

## How External Context Flows Into MioOS

```
External Source (ChatGPT, Claude, WhatsApp, meeting, idea)
  ↓
POST /api/capture  OR  Manual paste in Capture Inbox
  ↓
Saved to Capture Inbox (status: inbox)
  ↓
User reviews + triages in Capture page
  ↓
Convert to: Note / Task / Goal / Node
  ↓
Linked to relevant project/node
  ↓
Appears in Tasks / Goals / Notes / Brain Graph
  ↓
AI assistant can reference it (Phase 8+)
```

---

## Roadmap Summary

| Phase | Feature | Status |
|-------|---------|--------|
| 5 | Capture Inbox (manual CRUD) | ✅ Done |
| 5/6 | Stabilization & QA | ✅ Done |
| 6 | POST /api/capture endpoint | ✅ Done |
| 6 | Optional CAPTURE_API_TOKEN auth | ✅ Done |
| 7 | Browser extension | 🔲 Planned |
| 8 | MCP connector | 🔲 Planned |
| 9 | AI processing layer (auto-classify, summarize) | 🔲 Planned |
| 10 | Full auth + token security for all write endpoints | 🔲 Required before production |
