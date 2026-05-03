import type { Gender } from "@/lib/relationships";
import { cn } from "@/lib/utils";

const OPTIONS: { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

type Props = {
  value: Gender | undefined;
  onChange: (g: Gender | undefined) => void;
};

export function GenderToggle({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Gender"
      className="inline-flex rounded border border-[color:var(--color-border)] p-0.5 text-xs"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? undefined : opt.id)}
            className={cn(
              "rounded px-2.5 py-1 transition-colors",
              active
                ? "bg-[color:var(--color-accent)] text-white"
                : "text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
