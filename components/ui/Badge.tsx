"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "purple" | "blue" | "green" | "amber" | "red" | "cyan" | "pink";
  size?: "sm" | "md";
  className?: string;
}

const variants = {
  default: "bg-white/[0.06] text-text-secondary border-white/[0.08]",
  purple: "bg-accent-purple/15 text-accent-purple border-accent-purple/25",
  blue: "bg-accent-blue/15 text-accent-blue border-accent-blue/25",
  green: "bg-accent-green/15 text-accent-green border-accent-green/25",
  amber: "bg-accent-amber/15 text-accent-amber border-accent-amber/25",
  red: "bg-accent-red/15 text-accent-red border-accent-red/25",
  cyan: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/25",
  pink: "bg-accent-pink/15 text-accent-pink border-accent-pink/25",
};

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center border rounded font-medium",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
