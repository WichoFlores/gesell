import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onCommit: (next: string) => void | Promise<void>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Open in edit mode immediately on mount. */
  startEditing?: boolean;
  ariaLabel?: string;
};

export function InlineEditable({
  value,
  onCommit,
  placeholder = "Untitled",
  className,
  inputClassName,
  startEditing = false,
  ariaLabel,
}: Props) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (editing) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [editing]);

  function commit() {
    const next = draft.trim();
    if (next && next !== value) void onCommit(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "rounded border border-[color:var(--color-accent)] bg-transparent px-1 py-0.5 outline-none",
          inputClassName,
        )}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onDoubleClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "F2") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      title="Double-click to rename"
      aria-label={ariaLabel}
      className={cn(
        "cursor-text rounded px-1 py-0.5",
        "hover:bg-[color:var(--color-subtle)]",
        className,
      )}
    >
      {value || (
        <span className="text-[color:var(--color-muted)]">{placeholder}</span>
      )}
    </span>
  );
}
