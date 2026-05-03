import { useEffect, useMemo, useState } from "react";
import { useEditorBus } from "@/store/editorBus";
import { useMarkDefs } from "@/store/marks";
import { useCursorMode } from "@/store/cursorMode";
import type { MarkDefinition } from "@/marks/types";

const ARROW_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
] as const;
type ArrowKey = (typeof ARROW_KEYS)[number];

const ARROW_GLYPH: Record<ArrowKey, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

type Coords = { left: number; top: number };

export function CursorModeBubble() {
  const editor = useEditorBus((s) => s.editor);
  const markDefs = useMarkDefs();
  const setMode = useCursorMode((s) => s.setMode);

  const [coords, setCoords] = useState<Coords | null>(null);

  const arrowMap = useMemo(() => {
    const map = new Map<ArrowKey, MarkDefinition>();
    markDefs.slice(0, 4).forEach((def, i) => {
      map.set(ARROW_KEYS[i], def);
    });
    return map;
  }, [markDefs]);

  useEffect(() => {
    if (!editor) {
      setCoords(null);
      return;
    }

    const update = () => {
      const { state, view } = editor;
      const sel = state.selection;
      if (!sel.empty) return setCoords(null);
      if (document.activeElement !== view.dom) return setCoords(null);
      const $from = sel.$from;
      const parent = $from.parent;
      if (!parent.isTextblock) return setCoords(null);
      if (parent.content.size > 0) return setCoords(null);
      const c = view.coordsAtPos(sel.from);
      setCoords({ left: c.left, top: c.bottom });
    };

    update();
    const raf = requestAnimationFrame(update);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);
    editor.on("blur", update);
    const onDocFocus = () => update();
    document.addEventListener("focusin", onDocFocus);
    document.addEventListener("focusout", onDocFocus);
    return () => {
      cancelAnimationFrame(raf);
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
      editor.off("blur", update);
      document.removeEventListener("focusin", onDocFocus);
      document.removeEventListener("focusout", onDocFocus);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !coords) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((ARROW_KEYS as readonly string[]).includes(e.key)) {
        const def = arrowMap.get(e.key as ArrowKey);
        if (!def) return;
        e.preventDefault();
        e.stopPropagation();

        const $from = editor.state.selection.$from;
        const anchorBlock = $from.before($from.depth);
        setMode(def.id, anchorBlock);

        const markType = editor.state.schema.marks[def.id];
        if (markType) {
          editor.view.dispatch(
            editor.state.tr.setStoredMarks([markType.create()]),
          );
        }
        setCoords(null);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setCoords(null);
        return;
      }
      setCoords(null);
    };

    editor.view.dom.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editor.view.dom.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor, coords, arrowMap, setMode]);

  if (!coords || arrowMap.size === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: coords.left,
        top: coords.top + 6,
        zIndex: 50,
      }}
      className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] shadow-md text-xs overflow-hidden"
      role="menu"
      aria-label="Cursor mode picker"
    >
      {Array.from(arrowMap.entries()).map(([key, def]) => (
        <div
          key={def.id}
          className="flex items-center gap-2 px-2.5 py-1.5 text-[color:var(--color-fg)]"
          role="menuitem"
        >
          <kbd className="font-mono text-[10px] bg-[color:var(--color-subtle)] border border-[color:var(--color-border)] rounded px-1 leading-none py-0.5 min-w-[18px] text-center">
            {ARROW_GLYPH[key]}
          </kbd>
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: `var(--mark-${def.id}-color)` }}
          />
          <span>{def.name}</span>
        </div>
      ))}
    </div>
  );
}
