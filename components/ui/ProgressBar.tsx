"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, color = "#6366f1", className, showLabel }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-text-muted font-mono w-8 text-right">{Math.round(pct)}%</span>
      )}
    </div>
  );
}
