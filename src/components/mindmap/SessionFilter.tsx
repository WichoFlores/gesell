import { useMemo } from "react";
import type { Session } from "@/db/schema";
import { cn } from "@/lib/utils";

export type SessionSelection = Set<string> | "all";

type Props = {
  sessions: Session[];
  value: SessionSelection;
  onChange: (next: SessionSelection) => void;
};

export function SessionFilter({ sessions, value, onChange }: Props) {
  // Newest first feels right for a filter pinned to the latest session work.
  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  // No point showing a one-button filter.
  if (sorted.length <= 1) return null;

  const isActive = (id: string) => value === "all" || value.has(id);
  const activeCount = value === "all" ? sorted.length : value.size;

  function toggle(id: string) {
    if (value === "all") {
      // Materialize "all" to an explicit set with this one removed.
      const next = new Set(sorted.map((s) => s.id));
      next.delete(id);
      onChange(next);
      return;
    }
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // If the user re-selected everything, collapse back to the "all" sentinel
    // so subsequent UI reads cleanly.
    if (next.size === sorted.length) {
      onChange("all");
      return;
    }
    onChange(next);
  }

  function selectAll() {
    onChange("all");
  }

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div
      className="absolute top-4 left-1/2 z-20 flex max-w-[80%] -translate-x-1/2 items-center gap-1.5 rounded-full border border-[color:var(--color-border)] px-2 py-1.5 shadow-md backdrop-blur-md"
      style={{
        background:
          "color-mix(in srgb, var(--color-bg) 80%, transparent)",
      }}
      role="group"
      aria-label="Filter sessions"
    >
      <span
        className="ml-1 shrink-0 text-[10px] tracking-wider uppercase tabular-nums"
        style={{ color: "var(--color-muted)" }}
      >
        {activeCount}/{sorted.length}
      </span>
      <div className="flex max-w-[60vw] flex-1 items-center gap-1 overflow-x-auto">
        {sorted.map((s) => {
          const active = isActive(s.id);
          const label = s.title?.trim() || new Date(s.updatedAt).toLocaleDateString();
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              aria-pressed={active}
              title={new Date(s.updatedAt).toLocaleString()}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap transition-colors",
                active
                  ? "border-[color:var(--color-border)] bg-[color:var(--color-subtle)] text-[color:var(--color-fg)]"
                  : "border-transparent text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]/60",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="ml-1 flex shrink-0 items-center gap-0.5">
        {value !== "all" ? (
          <button
            type="button"
            onClick={selectAll}
            className="rounded-full px-2 py-0.5 text-[10px] tracking-wider uppercase hover:bg-[color:var(--color-subtle)]"
            style={{ color: "var(--color-muted)" }}
          >
            All
          </button>
        ) : null}
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full px-2 py-0.5 text-[10px] tracking-wider uppercase hover:bg-[color:var(--color-subtle)]"
            style={{ color: "var(--color-muted)" }}
          >
            None
          </button>
        ) : null}
      </div>
    </div>
  );
}
