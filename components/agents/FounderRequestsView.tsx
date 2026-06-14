"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { WorkforceTeam, Assignment } from "@/types";
import {
  Send, Loader2, CheckCircle2, Clock, ArrowRight,
  Zap, Users2, Search, UserCheck,
  Megaphone, FileText, Settings2, Headphones, Code2, Crown, ShoppingBag,
} from "lucide-react";

const ROUTING_RULES = [
  { dept: "research",    keywords: ["research", "find", "analyze", "analysis", "market", "competitor", "intelligence", "data", "study", "survey", "investigate", "discover", "lookup", "search for", "how many", "which companies", "who are", "list of"] },
  { dept: "sales",       keywords: ["sales", "leads", "prospects", "outreach", "customers", "clients", "pipeline", "deals", "close", "qualify", "contact", "prospect list"] },
  { dept: "content",     keywords: ["write", "content", "blog", "newsletter", "article", "copy", "post", "social media", "draft", "script", "email sequence"] },
  { dept: "marketing",   keywords: ["marketing", "campaign", "ads", "advertising", "brand", "promote", "launch", "go-to-market", "gtm", "awareness"] },
  { dept: "development", keywords: ["build", "develop", "code", "tool", "software", "app", "integration", "api", "script", "automate", "create a tool", "make a"] },
  { dept: "operations",  keywords: ["strategy", "plan", "roadmap", "process", "workflow", "optimize", "pricing", "pricing strategy", "structure", "framework", "playbook"] },
  { dept: "support",     keywords: ["support", "help", "faq", "customer service", "feedback", "issues", "complaints", "knowledge base"] },
  { dept: "commerce",    keywords: ["product", "offer", "service", "package", "proposal", "partnership", "reseller", "affiliate", "opportunity"] },
];

const DEPT_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  commerce:    ShoppingBag,
  research:    Search,
  sales:       UserCheck,
  marketing:   Megaphone,
  content:     FileText,
  operations:  Settings2,
  support:     Headphones,
  development: Code2,
  executive:   Crown,
};

const DEPT_COLORS: Record<string, string> = {
  commerce:    "#10b981",
  research:    "#6366f1",
  sales:       "#00D4FF",
  marketing:   "#f59e0b",
  content:     "#8b5cf6",
  operations:  "#94a3b8",
  support:     "#06b6d4",
  development: "#a78bfa",
  executive:   "#fbbf24",
};

function detectDepartment(text: string): string {
  if (!text.trim()) return "research";
  const lower = text.toLowerCase();
  const scores = ROUTING_RULES.map(rule => ({
    dept: rule.dept,
    score: rule.keywords.filter(k => lower.includes(k)).length,
  }));
  const best = scores.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.dept : "research";
}

function fmtTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1)    return "just now";
  if (diffMins < 60)   return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  const diffDays = Math.floor(diffMins / 1440);
  if (diffDays === 1)  return "yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const EXAMPLE_REQUESTS = [
  "Find 50 logistics companies in North Holland",
  "Research competitors of Mail Co-Pilot",
  "Create a launch plan for AI Offerte Assistant",
  "Generate a pricing strategy for MioOS",
  "Write a cold outreach email sequence for B2B leads",
  "Analyze the market for AI-powered invoice tools in the Netherlands",
  "Build a prospect list of Dutch SaaS companies under 50 employees",
  "Create a content plan for LinkedIn for the next 30 days",
];

const EXEC_STEPS = ["Routing to team", "Creating assignment", "Executing task", "Generating output"];

const STATUS_COLOR: Record<string, string> = {
  pending:   "#64748b",
  active:    "#10b981",
  review:    "#f59e0b",
  completed: "#6366f1",
  archived:  "#334155",
};

const STATUS_LABEL: Record<string, string> = {
  pending:   "Queued",
  active:    "In Progress",
  review:    "In Review",
  completed: "Completed",
  archived:  "Archived",
};

export function FounderRequestsView() {
  const { setActiveView, showToast, prefillRequest, setPrefillRequest } = useAppStore();
  const [teams, setTeams]             = useState<WorkforceTeam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [input, setInput]             = useState("");
  const [priority, setPriority]       = useState("high");
  const [detectedDept, setDetectedDept] = useState<string>("research");
  const [submitting, setSubmitting]   = useState(false);
  const [execStep, setExecStep]       = useState(0);
  const [execAssId, setExecAssId]     = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Consume prefilled request from store (e.g. from Goals view)
  useEffect(() => {
    if (prefillRequest) {
      setInput(prefillRequest);
      setDetectedDept(detectDepartment(prefillRequest));
      setPrefillRequest(null);
    }
  }, [prefillRequest, setPrefillRequest]);

  useEffect(() => {
    Promise.all([
      fetch("/api/workforce/teams").then(r => r.json()).catch(() => []),
      fetch("/api/assignments").then(r => r.json()).catch(() => []),
    ]).then(([tm, ass]) => {
      setTeams(Array.isArray(tm) ? tm : []);
      setAssignments(Array.isArray(ass) ? ass : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!execAssId) { setExecStep(0); return; }
    if (execStep >= EXEC_STEPS.length - 1) return;
    const t = setTimeout(() => setExecStep(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [execAssId, execStep]);

  function handleInput(text: string) {
    setInput(text);
    if (text.trim()) setDetectedDept(detectDepartment(text));
  }

  function useExample(ex: string) {
    setInput(ex);
    setDetectedDept(detectDepartment(ex));
    textareaRef.current?.focus();
  }

  async function submit() {
    const request = input.trim();
    if (!request || submitting) return;

    const team = teams.find(t => t.departmentType === detectedDept) ?? teams[0];
    if (!team) {
      showToast("No workforce teams found. Set up your workforce first.", "error");
      setActiveView("workforce");
      return;
    }

    setSubmitting(true);
    setExecStep(0);

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       request.length > 100 ? request.slice(0, 97) + "…" : request,
          description: request,
          teamId:      team.id,
          priority,
        }),
      });
      const newAss = await res.json();
      if (!newAss?.id) throw new Error("Create failed");

      setExecAssId(newAss.id);
      await fetch(`/api/assignments/${newAss.id}/execute`, { method: "POST" }).catch(() => {});
      setExecAssId(null);

      const upd = await fetch("/api/assignments").then(r => r.json()).catch(() => []);
      if (Array.isArray(upd)) setAssignments(upd);

      setInput("");
      setDetectedDept("research");
      showToast(`Request sent to ${team.name}`, "success");
    } catch {
      showToast("Failed to send request. Please try again.", "error");
    } finally {
      setSubmitting(false);
      setExecAssId(null);
    }
  }

  const hasTeams    = teams.length > 0;
  const routedTeam  = teams.find(t => t.departmentType === detectedDept);
  const deptColor   = DEPT_COLORS[detectedDept] ?? "#00D4FF";
  const DeptIcon    = DEPT_ICONS[detectedDept] ?? null;

  const recentRequests = [...assignments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  const completedToday = assignments.filter(a => {
    if (a.status !== "completed" || !a.completedAt) return false;
    const d = new Date(a.completedAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[860px] mx-auto px-5 md:px-10 py-8 md:py-12 pb-28 md:pb-12">

        {/* Header */}
        <div className="mb-8 md:mb-10">
          <p className="text-[11px] text-text-ghost font-medium tracking-[0.12em] uppercase mb-2">
            AI Workforce
          </p>
          <h1 className="text-[32px] md:text-[40px] font-semibold text-text-primary tracking-tight leading-tight mb-2">
            Founder Requests
          </h1>
          <p className="text-[15px] text-text-secondary leading-relaxed">
            Type what you need. Your AI workforce handles the rest.
          </p>
          {completedToday.length > 0 && (
            <p className="text-[13px] text-accent-green mt-2">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
              {completedToday.length} request{completedToday.length !== 1 ? "s" : ""} completed today
            </p>
          )}
        </div>

        {/* No teams state */}
        {!loading && !hasTeams && (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center mb-8">
            <Users2 className="w-6 h-6 text-text-ghost mx-auto mb-3 opacity-40" />
            <p className="text-[14px] text-text-secondary font-medium mb-1">No workforce configured yet</p>
            <p className="text-[12px] text-text-muted mb-4">Set up your AI departments before sending requests.</p>
            <button
              onClick={() => setActiveView("workforce")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-[12px] font-medium hover:bg-accent-cyan/15 transition-all"
            >
              Set up Workforce <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Command box */}
        <div className={cn(
          "rounded-2xl border bg-[#0d1220] overflow-hidden mb-6 transition-all",
          input.trim() ? "border-white/[0.10]" : "border-white/[0.06]"
        )}>
          <div className="p-5 md:p-7">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !submitting) submit();
              }}
              placeholder={hasTeams
                ? "What do you need done? Be specific — your AI workforce will handle it."
                : "Set up your workforce first to send requests."}
              rows={4}
              disabled={!hasTeams || submitting}
              className="w-full bg-transparent text-[15px] md:text-[17px] text-text-primary placeholder:text-text-ghost outline-none resize-none leading-relaxed disabled:opacity-40"
            />

            {/* Routing indicator */}
            {input.trim() && (
              <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-white/[0.05]">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${deptColor}18`, border: `1px solid ${deptColor}30` }}
                >
                  {DeptIcon && <DeptIcon className="w-3 h-3" style={{ color: deptColor }} />}
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 flex-shrink-0" style={{ color: deptColor }} />
                  <p className="text-[12px]" style={{ color: deptColor }}>
                    Routing to{" "}
                    <span className="font-semibold">
                      {routedTeam?.name
                        ?? (detectedDept.charAt(0).toUpperCase() + detectedDept.slice(1) + " Team")}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between px-5 md:px-7 py-3.5 border-t border-white/[0.05] bg-white/[0.015]">
            <div className="flex items-center gap-3">
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                disabled={submitting}
                className="bg-white/[0.04] text-[11px] text-text-secondary rounded-lg px-2.5 py-1.5 border border-white/[0.06] outline-none cursor-pointer hover:bg-white/[0.06] transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <span className="text-[10px] text-text-ghost hidden sm:block">⌘↵ to send</span>
            </div>

            <button
              onClick={submit}
              disabled={!input.trim() || !hasTeams || submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-[13px] font-medium hover:bg-[#00D4FF]/15 disabled:opacity-30 transition-all"
            >
              {submitting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                : <><Send className="w-3.5 h-3.5" /> Send Request</>}
            </button>
          </div>
        </div>

        {/* Execution progress */}
        {execAssId && (
          <div className="rounded-2xl border border-[#00D4FF]/15 bg-[#00D4FF]/[0.04] p-5 mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Loader2 className="w-4 h-4 text-[#00D4FF] animate-spin flex-shrink-0" />
              <p className="text-[13px] text-[#00D4FF] font-medium">
                {EXEC_STEPS[execStep] ?? "Completing"}…
              </p>
            </div>
            <div className="flex gap-2">
              {EXEC_STEPS.map((step, i) => (
                <div key={step} className="flex-1 space-y-1">
                  <div className={cn(
                    "h-1 rounded-full transition-all duration-700",
                    i <= execStep ? "bg-[#00D4FF]" : "bg-white/[0.07]"
                  )} />
                  <p className={cn("text-[9px]", i <= execStep ? "text-[#00D4FF]/60" : "text-text-ghost")}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Examples */}
        {!input && !submitting && hasTeams && (
          <div className="mb-8">
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] font-medium mb-3">Example requests</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_REQUESTS.map(ex => (
                <button
                  key={ex}
                  onClick={() => useExample(ex)}
                  className="text-[12px] text-text-muted px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.10] hover:text-text-secondary transition-all bg-white/[0.02] hover:bg-white/[0.04]"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Request history */}
        {recentRequests.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] text-text-ghost uppercase tracking-[0.1em] font-medium">
                Recent Requests
              </p>
              <button
                onClick={() => setActiveView("workforce")}
                className="text-[11px] text-text-ghost hover:text-text-muted transition-colors flex items-center gap-1"
              >
                Workforce view <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {recentRequests.map(a => {
                const dept  = a.team?.departmentType ?? "";
                const color = DEPT_COLORS[dept] ?? "#64748b";
                const Icon  = DEPT_ICONS[dept];

                return (
                  <div
                    key={a.id}
                    onClick={() => setActiveView("workforce")}
                    className="flex items-start gap-3.5 p-4 rounded-xl border border-white/[0.05] bg-[#0d1220] hover:border-white/[0.09] hover:bg-[#0f1628] transition-all cursor-pointer group"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
                    >
                      {Icon
                        ? <Icon className="w-3.5 h-3.5" style={{ color }} />
                        : <Users2 className="w-3.5 h-3.5 text-text-ghost" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-text-primary font-medium leading-snug line-clamp-1">
                        {a.title}
                      </p>
                      <p className="text-[11px] text-text-ghost mt-0.5">
                        {a.team?.name ?? "AI Team"}
                        {" · "}{fmtTime(a.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          a.status === "active" && "animate-pulse-slow"
                        )}
                        style={{ background: STATUS_COLOR[a.status] ?? "#64748b" }}
                      />
                      <span className="text-[11px] text-text-ghost">
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                      {a.status === "completed" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-green ml-0.5" />
                      )}
                      {a.status === "review" && (
                        <Clock className="w-3.5 h-3.5 text-accent-amber ml-0.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {recentRequests.length === 0 && !loading && hasTeams && (
          <div className="rounded-2xl border border-dashed border-white/[0.06] p-10 text-center">
            <Zap className="w-6 h-6 text-text-ghost mx-auto mb-3 opacity-25" />
            <p className="text-[14px] text-text-muted font-medium">Ready for your first request</p>
            <p className="text-[12px] text-text-ghost mt-1">
              Type above or pick an example to get started.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
