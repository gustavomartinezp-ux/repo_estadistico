"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  searchPlaceholder?: string;
  searchText: (row: T) => string;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  rowHref?: (row: T) => string | null;
  emptyMessage?: string;
  /** Omite el envoltorio tipo Card (borde/sombra/padding) cuando ya vive dentro de uno. */
  bare?: boolean;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function DataTable<T>({
  columns,
  rows,
  searchPlaceholder = "Buscar…",
  searchText,
  defaultSortKey,
  defaultSortDir = "desc",
  rowHref,
  emptyMessage = "Sin resultados.",
  bare = false,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = normalize(query);
    return rows.filter((r) => normalize(searchText(r)).includes(q));
  }, [rows, query, searchText]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const getValue = col.sortValue ?? ((row: T) => String(col.render(row)));
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, columns, sortKey, sortDir]);

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("desc");
    }
  }

  return (
    <div className={bare ? "" : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"}>
      <div className="relative mb-3 max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none transition-shadow duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-gradient-to-r from-primary-50/60 via-slate-50 to-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  className={`px-4 py-2.5 text-xs font-medium tracking-wide uppercase ${
                    sortKey === col.key ? "text-primary-700" : "text-slate-500"
                  } ${col.align === "right" ? "text-right" : "text-left"} ${
                    col.sortable ? "cursor-pointer select-none hover:text-primary-600" : ""
                  }`}
                >
                  <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "flex-row-reverse" : ""}`}>
                    {col.label}
                    {col.sortable &&
                      (sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => {
                const href = rowHref?.(row) ?? null;
                const zebra = i % 2 === 1 ? "bg-slate-50/50" : "bg-white";
                return href ? (
                  <tr
                    key={i}
                    className={`group cursor-pointer border-b border-slate-100 transition-colors duration-150 last:border-0 hover:bg-primary-50/50 ${zebra}`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="p-0">
                        <Link
                          href={href}
                          className={`block px-4 py-2.5 text-slate-700 transition-colors duration-150 group-hover:text-slate-900 ${col.align === "right" ? "text-right tabular-nums" : "text-left"}`}
                        >
                          {col.render(row)}
                        </Link>
                      </td>
                    ))}
                  </tr>
                ) : (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${zebra}`}>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 text-slate-700 ${col.align === "right" ? "text-right tabular-nums" : "text-left"}`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {sorted.length.toLocaleString("es-CL")} de {rows.length.toLocaleString("es-CL")}
      </p>
    </div>
  );
}
