"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chip-style multi-value input: type, press Enter (or comma) to add.
 * Optional suggestion list filters as you type — click to add.
 */
export function TagInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
  className,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  const matches =
    draft.length >= 2
      ? suggestions
          .filter((s) => s.toLowerCase().includes(draft.toLowerCase()) && !values.includes(s))
          .slice(0, 6)
      : [];

  function add(value: string) {
    const v = value.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
  }

  return (
    <div className={cn("space-y-2", className)}>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="rounded p-0.5 hover:bg-primary/15"
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {matches.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
            {matches.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  // onMouseDown so it fires before the input's onBlur adds the raw draft
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(m);
                  }}
                >
                  {m}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
