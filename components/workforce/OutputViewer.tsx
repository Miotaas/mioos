"use client";

import { useEffect } from "react";
import { X, Copy, Download, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { WorkforceOutput } from "@/types";

interface OutputViewerProps {
  output: WorkforceOutput;
  onClose: () => void;
}

// All user/AI content is passed through escapeHtml() before any HTML
// interpolation. The inline() function is the only path where variable
// content enters the output HTML — it always escapes first, then wraps
// in a fixed set of safe tags (<strong>, <em>, <code>). No raw content
// ever reaches dangerouslySetInnerHTML without going through this chain.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdown(raw: string): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  let listOpen  = false;
  let pOpen     = false;

  const closeList = () => { if (listOpen) { out.push("</ul>"); listOpen = false; } };
  const closePara = () => { if (pOpen)    { out.push("</p>"); pOpen = false; } };

  // All content entering here MUST be escaped first via escapeHtml().
  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

  for (const rawLine of lines) {
    const line    = rawLine.trimEnd();
    const trimmed = line.trim();

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      closePara(); closeList();
      out.push('<hr class="border-white/[0.08] my-5" />');
      continue;
    }

    // Headers
    const hMatch = trimmed.match(/^(#{1,4}) (.+)$/);
    if (hMatch) {
      closePara(); closeList();
      const level = hMatch[1].length;
      const sizes = ["text-xl font-bold text-white mt-6 mb-2", "text-lg font-semibold text-white mt-5 mb-2", "text-base font-semibold text-text-primary mt-4 mb-1", "text-sm font-semibold text-text-primary mt-3 mb-1"];
      out.push(`<h${level} class="${sizes[level - 1] ?? sizes[2]}">${inline(hMatch[2])}</h${level}>`);
      continue;
    }

    // Checkbox list items
    const cbMatch = trimmed.match(/^[-*] \[([xX ])\] (.+)$/);
    if (cbMatch) {
      closePara();
      if (!listOpen) { out.push('<ul class="space-y-1 my-2">'); listOpen = true; }
      const checked = cbMatch[1].toLowerCase() === "x";
      const cls = checked ? "text-accent-green" : "text-text-ghost";
      const sym = checked ? "✓" : "○";
      out.push(`<li class="flex items-start gap-2 text-sm"><span class="${cls} text-xs mt-0.5 flex-shrink-0">${sym}</span><span class="${checked ? "text-text-secondary line-through" : "text-text-secondary"}">${inline(cbMatch[2])}</span></li>`);
      continue;
    }

    // Unordered list items
    const uMatch = trimmed.match(/^[-*] (.+)$/);
    if (uMatch) {
      closePara();
      if (!listOpen) { out.push('<ul class="space-y-1 my-2">'); listOpen = true; }
      out.push(`<li class="flex items-start gap-2 text-sm"><span class="text-text-ghost mt-1 flex-shrink-0">•</span><span class="text-text-secondary">${inline(uMatch[1])}</span></li>`);
      continue;
    }

    // Ordered list items
    const oMatch = trimmed.match(/^(\d+)\. (.+)$/);
    if (oMatch) {
      closePara();
      if (!listOpen) { out.push('<ul class="space-y-1 my-2">'); listOpen = true; }
      out.push(`<li class="flex items-start gap-2 text-sm"><span class="text-text-ghost text-xs mt-0.5 flex-shrink-0 font-mono">${escapeHtml(oMatch[1])}.</span><span class="text-text-secondary">${inline(oMatch[2])}</span></li>`);
      continue;
    }

    // Table row
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      closePara(); closeList();
      const cells = trimmed.split("|").filter(c => c.trim() !== "");
      if (cells.every(c => !/[a-zA-Z0-9]/.test(c))) continue; // separator row (only dashes/colons/spaces)
      out.push(`<div class="flex gap-0 border-b border-white/[0.06] py-1">${cells.map(c => `<div class="flex-1 text-sm text-text-secondary px-2 first:pl-0">${inline(c.trim())}</div>`).join("")}</div>`);
      continue;
    }

    // Blank line
    if (trimmed === "") {
      closePara(); closeList();
      continue;
    }

    // Regular paragraph text
    closeList();
    if (!pOpen) { out.push('<p class="text-sm text-text-secondary leading-relaxed mb-3">'); pOpen = true; }
    else out.push("<br />");
    out.push(inline(trimmed));
  }

  closePara(); closeList();
  return out.join("\n");
}

export function OutputViewer({ output, onClose }: OutputViewerProps) {
  const [copied, setCopied] = useState(false);
  const rawContent = output.content ?? output.description ?? "(No content available)";

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(rawContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleExport() {
    const blob = new Blob([rawContent], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${output.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const html = renderMarkdown(rawContent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface-1 border border-white/[0.08] rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-text-ghost uppercase tracking-[0.12em] mb-1">
              {output.outputType.replace(/_/g, " ")} · {output.status.replace(/_/g, " ")}
              {output.team && ` · ${output.team.name}`}
            </p>
            <h2 className="text-[15px] font-semibold text-text-primary leading-tight">{output.title}</h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                copied
                  ? "bg-accent-green/10 text-accent-green border-accent-green/20"
                  : "bg-white/[0.04] text-text-secondary border-white/[0.06] hover:bg-white/[0.07]"
              )}
            >
              {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border bg-white/[0.04] text-text-secondary border-white/[0.06] hover:bg-white/[0.07] transition-all"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-ghost hover:text-text-secondary transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {output.content ? (
            <div
              className="prose-output"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="text-sm text-text-ghost italic">
              No full content available. This output was created before content storage was enabled.
              {output.description && (
                <p className="mt-3 text-text-secondary not-italic">{output.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between flex-shrink-0">
          <p className="text-[11px] text-text-ghost">
            Generated {new Date(output.createdAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
          <p className="text-[11px] text-text-ghost">
            ID: <span className="font-mono">{output.id.slice(0, 8)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
