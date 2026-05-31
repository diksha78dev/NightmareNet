"use client";

import { useMemo, useState, type ReactNode } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  accessor: (row: T) => unknown;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  initialSort?: { key: string; direction: SortDirection };
  isLoading?: boolean;
  loadingRows?: number;
  density?: "compact" | "comfortable";
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
  className = "",
  initialSort,
  isLoading = false,
  loadingRows = 5,
  density = "comfortable",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(initialSort?.direction ?? null);

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDir) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const sorted = [...rows].sort((a, b) =>
      compare(col.accessor(a), col.accessor(b))
    );
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [rows, columns, sortKey, sortDir]);

  const onSort = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortKey(null);
      setSortDir(null);
    } else {
      setSortDir("asc");
    }
  };

  const cellPad = density === "compact" ? "py-1.5 px-3" : "py-2.5 px-4";

  return (
    <div className={["overflow-hidden rounded-xl border border-white/[0.06]", className].join(" ")}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {columns.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width, textAlign: col.align ?? "left" }}
                    className={[
                      "text-[10px] font-semibold uppercase tracking-wider text-slate-500",
                      cellPad,
                      col.sortable ? "cursor-pointer select-none hover:text-slate-200" : "",
                      col.className ?? "",
                    ].join(" ")}
                    onClick={() => onSort(col)}
                    aria-sort={
                      active && sortDir === "asc"
                        ? "ascending"
                        : active && sortDir === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                        <span
                          className={[
                            "text-[8px]",
                            active ? "text-neural" : "text-slate-700",
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          {active && sortDir === "asc" ? "▲" : active && sortDir === "desc" ? "▼" : "↕"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: loadingRows }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-white/[0.04]">
                    {columns.map((col) => (
                      <td key={col.key} className={cellPad}>
                        <span className="block h-3 w-3/4 animate-shimmer rounded bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.10)_50%,rgba(255,255,255,0.04)_100%)]" />
                      </td>
                    ))}
                  </tr>
                ))
              : sortedRows.length === 0
                ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-500">
                      {empty ?? "No data"}
                    </td>
                  </tr>
                )
                : sortedRows.map((row) => (
                    <tr
                      key={rowKey(row)}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={[
                        "border-b border-white/[0.04] transition-colors",
                        onRowClick ? "cursor-pointer hover:bg-white/[0.03]" : "",
                      ].join(" ")}
                    >
                      {columns.map((col) => {
                        const content = col.cell ? col.cell(row) : (col.accessor(row) as ReactNode);
                        return (
                          <td
                            key={col.key}
                            style={{ textAlign: col.align ?? "left" }}
                            className={[
                              cellPad,
                              "text-slate-200",
                              col.className ?? "",
                            ].join(" ")}
                          >
                            {content as ReactNode}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
