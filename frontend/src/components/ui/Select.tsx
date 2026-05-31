"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export interface SelectProps<T extends string = string> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Select<T extends string = string>({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
  disabled = false,
  size = "md",
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const sizeCls = size === "sm" ? "py-1.5 text-xs" : "py-2.5 text-sm";

  return (
    <div ref={containerRef} className={["relative w-full", className].join(" ")}>
      {label && (
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className={[
          "flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-black/30 px-3",
          "text-left text-slate-100 transition-colors focus:outline-none focus-visible:ring-2",
          "focus-visible:ring-neural/50 hover:border-white/[0.16] cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          sizeCls,
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={current ? "" : "text-slate-500"}>
          {current?.label ?? placeholder}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className={[
            "text-slate-500 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            className={[
              "absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-white/[0.08]",
              "bg-abyss/95 backdrop-blur-md p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]",
            ].join(" ")}
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={[
                      "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm cursor-pointer",
                      active
                        ? "bg-neural/15 text-neural"
                        : "text-slate-200 hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.hint && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">
                        {opt.hint}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
