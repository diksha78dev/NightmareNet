"use client";

import { motion } from "framer-motion";

export type ProgressTone = "neural" | "dream" | "nightmare" | "success" | "warning";

export interface ProgressProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: "xs" | "sm" | "md";
  showValue?: boolean;
  className?: string;
  label?: string;
  indeterminate?: boolean;
}

const toneFill: Record<ProgressTone, string> = {
  neural: "bg-gradient-to-r from-neural-glow to-neural",
  dream: "bg-gradient-to-r from-dream-glow to-dream",
  nightmare: "bg-gradient-to-r from-nightmare-glow to-nightmare",
  success: "bg-gradient-to-r from-emerald-600 to-emerald-400",
  warning: "bg-gradient-to-r from-amber-600 to-amber-400",
};

const sizeClasses = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2",
};

export function Progress({
  value,
  max = 100,
  tone = "neural",
  size = "sm",
  showValue = false,
  className = "",
  label,
  indeterminate = false,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={["w-full", className].join(" ")}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-[11px] tracking-wide">
          {label && <span className="text-slate-400">{label}</span>}
          {showValue && (
            <span className="font-mono text-slate-300">{pct.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={[
          "relative w-full overflow-hidden rounded-full bg-white/[0.06]",
          sizeClasses[size],
        ].join(" ")}
      >
        {indeterminate ? (
          <motion.div
            className={["h-full w-1/3 rounded-full", toneFill[tone]].join(" ")}
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className={["h-full rounded-full", toneFill[tone]].join(" ")}
          />
        )}
      </div>
    </div>
  );
}

export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  tone?: ProgressTone;
  showValue?: boolean;
  className?: string;
}

const toneStroke: Record<ProgressTone, string> = {
  neural: "var(--color-neural)",
  dream: "var(--color-dream)",
  nightmare: "var(--color-nightmare)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
};

export function CircularProgress({
  value,
  max = 100,
  size = 48,
  thickness = 4,
  tone = "neural",
  showValue = true,
  className = "",
}: CircularProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div
      className={["relative inline-flex items-center justify-center", className].join(" ")}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={thickness}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={toneStroke[tone]}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${toneStroke[tone]})` }}
        />
      </svg>
      {showValue && (
        <span className="absolute font-mono text-xs text-slate-200">
          {pct.toFixed(0)}
        </span>
      )}
    </div>
  );
}
