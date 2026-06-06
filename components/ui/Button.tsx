"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-accent-purple hover:bg-accent-purple/90 text-white shadow-glow",
  secondary: "bg-white/[0.06] hover:bg-white/[0.1] text-text-primary border border-white/[0.08]",
  ghost: "hover:bg-white/[0.05] text-text-secondary hover:text-text-primary",
  danger: "bg-accent-red/15 hover:bg-accent-red/25 text-accent-red border border-accent-red/25",
};

const sizes = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-3.5 py-2 gap-2",
  lg: "text-sm px-5 py-2.5 gap-2",
};

export function Button({ variant = "secondary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
