import { useEffect, useRef } from "react";
import { useEditorBus } from "@/store/editorBus";

/**
 * Save the editor's caret position when `open` becomes true; restore it on close
 * (focus + selection). Call `skipRestore()` from any action that intentionally
 * changes the editor (e.g. jumping to a heading, switching session) so the
 * cleanup doesn't fight your new selection.
 */
export function useEditorSelectionRestore(open: boolean) {
  const savedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const editor = useEditorBus.getState().editor;
    savedRef.current = editor?.state.selection.from ?? null;
    return () => {
      const pos = savedRef.current;
      if (pos == null) return;
      savedRef.current = null;
      const ed = useEditorBus.getState().editor;
      if (!ed) return;
      requestAnimationFrame(() => {
        const docSize = ed.state.doc.content.size;
        const safe = Math.min(Math.max(pos, 0), docSize);
        ed.chain().focus().setTextSelection(safe).run();
      });
    };
  }, [open]);

  function skipRestore() {
    savedRef.current = null;
  }

  return { skipRestore };
}
