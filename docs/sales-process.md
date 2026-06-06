# MioOS Sales Process

## Stage-by-Stage Breakdown

### 1. Lead
Capture basic info: company, contact, industry, pain point.
Use "Suggest Product" to run deterministic matching against the pain point.

### 2. Product Match
Rules-based matching (no AI required):
- follow-up / reminders / open actions → Follow-Up & Action Watchdog
- contract / deadline / renewal / compliance → Deadline & Document Guardian
- revenue / invoice / quote / missed sales → Lost Revenue Detector
- meeting / call / notes / action items → Meeting-to-Execution Agent
- evidence / claim / dispute / complaint → Evidence & Case Builder

Demo prep is auto-generated: demo angle, discovery questions, objections, pilot structure, pricing suggestion.

### 3. Outreach
Set next action and next action date. Pipeline tracks overdue follow-ups in red.

### 4. Discovery Call
Use the generated discovery questions. Update pain point and notes. Move lead to `discovery_scheduled` → `replied`.

### 5. Demo
Prepare using the Demo tab on the lead. Move to `demo_scheduled` → `demo_done`.

### 6. Proposal
Fill proposal fields: status, amount, monthly price, setup fee. Move to `proposal_sent`.

### 7. Pilot
2–3 week structured test. Fill pilot fields: start/end date, success criteria, decision deadline. Move to `pilot_offered` → `pilot_active`.

### 8. Onboarding
When lead becomes `won` or `pilot_active`, the Onboarding tab activates with a 12-item default checklist. Track progress to 100%.

### 9. Deployment
Create a Deployment record. Track environment (demo/pilot/production), status, monthly price, and next check-in date.

### 10. Support
Log issues against client + product. Track severity and resolution.

### 11. Upsell
When a client is live, look for natural expansion opportunities. Log upsell opportunities with suggested product and estimated value.
