"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type TooltipSide = "top" | "right" | "bottom" | "left";

export interface TooltipProps {
  content: ReactNode;
  side?: TooltipSide;
  delayMs?: number;
  className?: string;
  children: ReactNode;
}

const sideClasses: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({
  content,
  side = "top",
  delayMs = 100,
  className = "",
  children,
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const open = () => {
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => setShow(true), delayMs));
  };
  const close = () => {
    if (timer) clearTimeout(timer);
    setShow(false);
  };

  return (
    <span
      className={["relative inline-flex", className].join(" ")}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={[
              "pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-white/[0.08]",
              "bg-abyss/95 px-2 py-1 text-[11px] text-slate-200 shadow-lg backdrop-blur-md",
              sideClasses[side],
            ].join(" ")}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
