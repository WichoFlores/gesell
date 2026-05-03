import { useEffect, useState } from "react";
import { useMarkDefs } from "@/store/marks";
import { cn } from "@/lib/utils";

const SHORTCUT_LABELS: Record<string, string> = {
  "Mod-Shift-'": "⌘⇧'",
  "Mod-Alt-w": "⌘⌥W",
  "Mod-Alt-c": "⌘⌥C",
  "Mod-Alt-d": "⌘⌥D",
  "Mod-U": "⌘U",
};

const GLOBAL_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "⌘K", label: "Command palette" },
  { keys: "⌘⇧O", label: "Jump to heading" },
  { keys: "⌘⇧↑/↓", label: "Prev / next heading" },
  { keys: "⌘⇧F", label: "Family panel" },
  { keys: "⌘⇧P", label: "Switch patient" },
  { keys: "⌘⇧N", label: "New session" },
  { keys: "⌘,", label: "Settings" },
  { keys: "?", label: "Toggle this legend" },
];

export function Legend() {
  const defs = useMarkDefs();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "?") return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (target?.isContentEditable) return;
      e.preventDefault();
      setOpen((o) => !o);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Show shortcuts (?)"
        className="fixed bottom-4 left-4 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-panel)] text-xs text-[color:var(--color-muted)] shadow-sm hover:bg-[color:var(--color-subtle)] print:hidden"
        aria-label="Show keyboard shortcuts"
      >
        ?
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 left-4 z-30 mx-auto max-w-3xl rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-4 shadow-2xl print:hidden">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] tracking-wider text-[color:var(--color-muted)] uppercase">
          Shortcuts
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 text-xs text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]"
          aria-label="Close legend"
        >
          ✕
        </button>
      </div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <section>
          <div className="mb-1.5 text-[10px] tracking-wider text-[color:var(--color-muted)] uppercase">
            Marks
          </div>
          <ul className="space-y-1.5 text-sm">
            {defs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2">
                  <span className={cn(d.cssClass, "px-1")}>{d.name}</span>
                </span>
                <span className="font-mono text-xs text-[color:var(--color-muted)]">
                  {SHORTCUT_LABELS[d.shortcut ?? ""] ?? d.shortcut}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3">
              <span className="text-sm">Underline</span>
              <span className="font-mono text-xs text-[color:var(--color-muted)]">
                ⌘U
              </span>
            </li>
          </ul>
        </section>
        <section>
          <div className="mb-1.5 text-[10px] tracking-wider text-[color:var(--color-muted)] uppercase">
            Navigation
          </div>
          <ul className="space-y-1.5 text-sm">
            {GLOBAL_SHORTCUTS.map((s) => (
              <li
                key={s.label}
                className="flex items-center justify-between gap-3"
              >
                <span>{s.label}</span>
                <span className="font-mono text-xs text-[color:var(--color-muted)]">
                  {s.keys}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
