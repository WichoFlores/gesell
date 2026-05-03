import { useEffect, useMemo, useRef, useState } from "react";
import { Command } from "cmdk";
import { useEditorBus } from "@/store/editorBus";
import {
  collectHeadings,
  jumpToPos,
  type HeadingItem,
} from "@/editor/headings";
import { useEditorSelectionRestore } from "@/lib/useEditorSelectionRestore";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OutlinePalette({ open, onClose }: Props) {
  const editor = useEditorBus((s) => s.editor);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { skipRestore } = useEditorSelectionRestore(open);

  const headings: HeadingItem[] = useMemo(() => {
    if (!open || !editor) return [];
    return collectHeadings(editor.state.doc);
  }, [open, editor]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  function jump(item: HeadingItem) {
    if (!editor) return;
    skipRestore();
    jumpToPos(editor, item.pos);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[18vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter
          loop
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Jump to heading…"
            className="w-full border-b border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[color:var(--color-muted)]"
          />
          <Command.List className="max-h-80 overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-[color:var(--color-muted)]">
              {headings.length === 0
                ? "No headings in this session yet. Type ## to make one."
                : "No matches."}
            </Command.Empty>
            {headings.map((h) => (
              <Command.Item
                key={h.pos}
                value={h.text + " " + h.level}
                onSelect={() => jump(h)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]",
                  h.level === 1 && "font-medium",
                )}
              >
                <span className="w-6 text-xs text-[color:var(--color-muted)]">
                  H{h.level}
                </span>
                <span className="flex-1 truncate">
                  {h.text || "Untitled heading"}
                </span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
