import { updateMarkColor } from "@/db/marks";
import { useMarkDefs } from "@/store/marks";
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";

const SHORTCUT_LABELS: Record<string, string> = {
  "Mod-Shift-'": "⌘⇧'",
  "Mod-Alt-w": "⌘⌥W",
  "Mod-Alt-c": "⌘⌥C",
  "Mod-Alt-d": "⌘⌥D",
  "Mod-U": "⌘U",
};

function shortcutLabel(s?: string) {
  if (!s) return "";
  return SHORTCUT_LABELS[s] ?? s;
}

export function SettingsPage() {
  const defs = useMarkDefs();
  const setView = useUI((s) => s.setView);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-3">
        <span className="text-sm">Settings</span>
        <button
          type="button"
          onClick={() => setView("editor")}
          className="rounded-md border border-[color:var(--color-border)] px-3 py-1 text-xs hover:bg-[color:var(--color-subtle)]"
        >
          Done
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[640px] px-8 py-10">
          <h2 className="text-lg font-medium">Marks</h2>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            Edit the color of each mark. Built-in marks can&rsquo;t be removed,
            but you can retune them. Changes apply immediately.
          </p>

          <ul className="mt-6 divide-y divide-[color:var(--color-border)] rounded-lg border border-[color:var(--color-border)]">
            {defs.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <input
                  type="color"
                  value={d.color}
                  onChange={(e) => void updateMarkColor(d.id, e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-[color:var(--color-border)] bg-transparent"
                  aria-label={`Color for ${d.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-[color:var(--color-muted)]">
                    {d.kind === "sentence"
                      ? "Applies to the current sentence"
                      : d.exclusiveGroup
                        ? `Inline highlight (excludes ${d.exclusiveGroup} peers)`
                        : "Inline mark"}
                  </div>
                </div>
                <SamplePreview cssClass={d.cssClass} />
                <span
                  className={cn(
                    "min-w-[48px] rounded border border-[color:var(--color-border)] px-2 py-1 text-center font-mono text-xs",
                    "text-[color:var(--color-muted)]",
                  )}
                  title={d.shortcut}
                >
                  {shortcutLabel(d.shortcut)}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-[color:var(--color-muted)]">
            Shortcut rebinding lands in a later phase.
          </p>
        </div>
      </div>
    </div>
  );
}

function SamplePreview({ cssClass }: { cssClass: string }) {
  return (
    <span className="text-sm">
      <span className={cssClass}>sample</span>
    </span>
  );
}
