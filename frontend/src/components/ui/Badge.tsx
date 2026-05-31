"use client";

import type { ReactNode } from "react";

export type BadgeVariant =
  | "neutral"
  | "neural"
  | "dream"
  | "nightmare"
  | "success"
  | "warning"
  | "outline";

export type BadgeSize = "xs" | "sm" | "md";

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-white/[0.06] text-slate-300 border-white/10",
  neural: "bg-neural/10 text-neural border-neural/30",
  dream: "bg-dream/10 text-dream-soft border-dream/30",
  nightmare: "bg-nightmare/10 text-nightmare-soft border-nightmare/30",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  outline: "bg-transparent text-slate-400 border-white/10",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-slate-400",
  neural: "bg-neural",
  dream: "bg-dream",
  nightmare: "bg-nightmare",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  outline: "bg-slate-400",
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: "text-[10px] px-1.5 py-0.5 gap-1",
  sm: "text-[11px] px-2 py-0.5 gap-1.5",
  md: "text-xs px-2.5 py-1 gap-1.5",
};

export function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  className = "",
  children,
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-medium tracking-wide",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {dot && (
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            dotClasses[variant],
            "shadow-[0_0_6px_currentColor]",
          ].join(" ")}
        />
      )}
      {children}
    </span>
  );
}
