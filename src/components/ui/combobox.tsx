"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface ComboboxProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: string[];
  placeholder?: string; // texto cuando no hay selección ("Todos")
  disabled?: boolean;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Select buscable: las listas de profesionales/prestaciones tienen cientos de
 * opciones, un <select> nativo es inutilizable ahí. Combobox controlado a
 * mano (sin dependencia extra) con filtro, teclado y click-fuera-para-cerrar.
 */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder = "Todos",
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = normalize(query);
    return options.filter((opt) => normalize(opt).includes(q));
  }, [options, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function select(option: string | null) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) select(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={rootRef} className="relative flex min-w-[190px] flex-1 flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="group flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm shadow-sm transition-all duration-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        {open ? (
          <>
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              ref={inputRef}
              aria-label={label}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={value ?? placeholder}
              className="min-w-0 flex-1 cursor-text bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
            />
          </>
        ) : (
          <span className={`flex-1 truncate ${value ? "text-slate-900" : "text-slate-500"}`}>
            {value ?? placeholder}
          </span>
        )}

        {value && !open && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              select(null);
            }}
            className="cursor-pointer rounded p-0.5 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 z-20 mt-1 max-h-72 w-full min-w-[240px] overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              onClick={() => select(null)}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${
                !value ? "font-medium text-primary-600" : "text-slate-600"
              }`}
            >
              <Check className={`h-3.5 w-3.5 ${!value ? "opacity-100" : "opacity-0"}`} />
              {placeholder}
            </button>

            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-500">Sin resultados</p>
            )}

            {filtered.map((opt, i) => (
              <button
                key={opt}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(opt)}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 focus-visible:outline-none ${
                  i === activeIndex ? "bg-slate-50" : ""
                } ${opt === value ? "font-medium text-primary-600" : "text-slate-700"}`}
              >
                <Check className={`h-3.5 w-3.5 shrink-0 ${opt === value ? "opacity-100" : "opacity-0"}`} />
                <span className="truncate">{opt}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
