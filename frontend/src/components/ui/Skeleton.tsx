"use client";

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
}

const roundedMap = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function Skeleton({
  className = "",
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;
  return (
    <span
      style={style}
      className={[
        "block animate-shimmer bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.10)_50%,rgba(255,255,255,0.04)_100%)]",
        roundedMap[rounded],
        className,
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={["space-y-2", className].join(" ")}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={10}
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

/**
 * Shape-matched skeleton for the 4-up stat tile grid in `CommandCenter`.
 * Mirrors the spacing and proportions of `MetricCard`.
 */
export function SkeletonStatTile({
  count = 4,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={[
        "grid grid-cols-2 gap-3 sm:grid-cols-4",
        className,
      ].join(" ")}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <Skeleton width={32} height={32} rounded="md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton height={8} width="60%" />
            <Skeleton height={14} width="40%" />
            <Skeleton height={8} width="80%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Shape-matched skeleton for a line/area chart panel — title strip,
 * left-aligned y-axis ticks, a curved placeholder path. Matches `LiveMetrics`.
 */
export function SkeletonChart({
  height = 220,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  // Plausible, slightly noisy curve so the skeleton reads as "a chart" not a blob.
  const path =
    "M 36 170 C 70 150, 100 140, 130 120 S 200 70, 240 60 T 320 50 T 400 70 T 560 60";
  const area = `${path} L 560 ${height - 22} L 36 ${height - 22} Z`;
  return (
    <div className={["w-full", className].join(" ")} aria-hidden="true">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton height={10} width={140} />
        <Skeleton height={10} width={70} />
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 600 ${height}`}
          className="w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sk-chart" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(34,211,238,0.12)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => {
            const y = 14 + (i * (height - 36)) / 4;
            return (
              <g key={i}>
                <line
                  x1={36}
                  x2={580}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.04)"
                />
                <rect
                  x={6}
                  y={y - 4}
                  width={22}
                  height={8}
                  rx={2}
                  className="animate-shimmer"
                  fill="rgba(255,255,255,0.06)"
                />
              </g>
            );
          })}
          <path d={area} fill="url(#sk-chart)" />
          <path
            d={path}
            fill="none"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2"
          >
            <Skeleton height={8} width="55%" className="mb-1.5" />
            <Skeleton height={10} width="40%" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shape-matched skeleton for a row-based list / table such as
 * `ExperimentList`. Avatar + 3 columns layout per row.
 */
export function SkeletonRows({
  rows = 5,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={[
        "overflow-hidden rounded-xl border border-white/[0.06]",
        className,
      ].join(" ")}
      aria-hidden="true"
    >
      <div className="border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <Skeleton height={8} width={120} />
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <Skeleton width={24} height={24} rounded="full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton height={10} width={`${50 + ((i * 7) % 30)}%`} />
              <Skeleton height={8} width={`${22 + ((i * 11) % 18)}%`} />
            </div>
            <div className="hidden w-24 sm:block">
              <Skeleton height={10} width="80%" />
            </div>
            <div className="hidden w-16 sm:block">
              <Skeleton height={10} width="60%" />
            </div>
            <Skeleton height={10} width={40} />
          </li>
        ))}
      </ul>
    </div>
  );
}
