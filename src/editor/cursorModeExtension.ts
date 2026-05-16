import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

type Options = {
  getMode: () => string | null;
  getAnchorBlock: () => number | null;
  getActivationPos: () => number | null;
  clearMode: () => void;
};

const QUOTE_CHAR = '"';

export const cursorModePluginKey = new PluginKey("cursorMode");

export function buildCursorModeExtension(options: Options) {
  return Extension.create({
    name: "cursorMode",

    addProseMirrorPlugins() {
      let viewRef: EditorView | null = null;
      // view.composing flips to false at the very start of compositionend,
      // BEFORE the synthesized commit transaction is dispatched. Dispatching
      // a storedMarks transaction in that window splits dead-key sequences
      // like `´` + `a` -> `'a` instead of `á`. The cooldown holds the guard
      // open for a few frames after composition ends.
      let lastCompositionEnd = 0;
      const COMPOSITION_COOLDOWN_MS = 120;

      // Cursor-mode marks are `inclusive: false`, so the model cursor at the
      // end of a marked range sits OUTSIDE it. Normal typing uses
      // storedMarks to still apply the mark, but IME composition bypasses
      // storedMarks — the browser inserts composed text via DOM mutations
      // that PM reads back into a fresh, unmarked text node. We snapshot the
      // cursor + active mode on compositionstart and reapply the mark to the
      // committed range after compositionend.
      let compositionStartPos: number | null = null;
      let compositionStartMode: string | null = null;

      const onCompositionStart = () => {
        if (!viewRef) return;
        const modeId = options.getMode();
        if (!modeId) return;
        compositionStartPos = viewRef.state.selection.from;
        compositionStartMode = modeId;
      };

      const onCompositionEnd = () => {
        lastCompositionEnd = Date.now();
        const startPos = compositionStartPos;
        const modeId = compositionStartMode;
        compositionStartPos = null;
        compositionStartMode = null;
        if (startPos == null || modeId == null || !viewRef) return;

        // PM commits the composition in a queued task after compositionend.
        // Defer to the next tick so we see the post-commit selection.
        const view = viewRef;
        setTimeout(() => {
          if (!view.editable) return;
          const markType = view.state.schema.marks[modeId];
          if (!markType) return;
          const endPos = view.state.selection.from;
          if (endPos <= startPos) return;
          const tr = view.state.tr
            .addMark(startPos, endPos, markType.create())
            .setStoredMarks([markType.create()]);
          view.dispatch(tr);
        }, 0);
      };

      return [
        new Plugin({
          key: cursorModePluginKey,

          view(view) {
            viewRef = view;
            view.dom.addEventListener("compositionstart", onCompositionStart);
            view.dom.addEventListener("compositionend", onCompositionEnd);
            return {
              destroy() {
                view.dom.removeEventListener(
                  "compositionstart",
                  onCompositionStart,
                );
                view.dom.removeEventListener(
                  "compositionend",
                  onCompositionEnd,
                );
                viewRef = null;
              },
            };
          },

          appendTransaction(_transactions, _oldState, newState) {
            if (viewRef?.composing) return null;
            if (Date.now() - lastCompositionEnd < COMPOSITION_COOLDOWN_MS) {
              return null;
            }

            const modeId = options.getMode();
            if (!modeId) return null;
            const markType = newState.schema.marks[modeId];
            if (!markType) return null;
            if (!newState.selection.empty) return null;

            const stored = newState.storedMarks;
            if (stored && stored.some((m) => m.type === markType)) return null;

            const tr = newState.tr;
            tr.setStoredMarks([markType.create()]);
            return tr;
          },
        }),
      ];
    },

    addKeyboardShortcuts() {
      const editorRef = () => this.editor;
      return {
        Enter: () => {
          const modeId = options.getMode();
          if (!modeId) return false;
          const ed = editorRef();

          if (modeId === "quote") {
            const wrapped = wrapQuoteOnExit(ed, options.getActivationPos());
            options.clearMode();
            if (wrapped) {
              ed.commands.splitBlock();
              return true;
            }
            ed.view.dispatch(ed.state.tr.setStoredMarks(null));
            return false;
          }

          options.clearMode();
          ed.view.dispatch(ed.state.tr.setStoredMarks(null));
          return false;
        },
      };
    },

    onSelectionUpdate({ editor }) {
      const modeId = options.getMode();
      if (!modeId) return;

      const anchor = options.getAnchorBlock();
      if (anchor == null) return;

      const $from = editor.state.selection.$from;
      const currentBlockBefore = $from.before($from.depth);
      if (currentBlockBefore !== anchor) options.clearMode();
    },
  });
}

function wrapQuoteOnExit(
  editor: Editor,
  activationPos: number | null,
): boolean {
  if (activationPos == null) return false;
  const markType = editor.state.schema.marks.quote;
  if (!markType) return false;

  const start = activationPos;
  const end = editor.state.selection.from;
  if (end <= start) return false;

  // Activation and cursor must be in the same block for the wrap to make
  // sense. If the user navigated away, abort.
  const $start = editor.state.doc.resolve(start);
  const $end = editor.state.doc.resolve(end);
  if ($start.before($start.depth) !== $end.before($end.depth)) return false;

  const tr = editor.state.tr;
  tr.insertText(QUOTE_CHAR, start);
  tr.insertText(QUOTE_CHAR, end + 1);
  tr.addMark(start, end + 2, markType.create());
  tr.setStoredMarks(null);
  tr.setSelection(TextSelection.create(tr.doc, end + 2));
  editor.view.dispatch(tr);
  return true;
}
