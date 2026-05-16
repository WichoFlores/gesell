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
      return [
        new Plugin({
          key: cursorModePluginKey,

          view(view) {
            viewRef = view;
            return {
              destroy() {
                viewRef = null;
              },
            };
          },

          appendTransaction(_transactions, _oldState, newState) {
            // Don't re-assert storedMarks mid-IME composition: dispatching
            // while view.composing tears down the pending composition and
            // splits dead-key sequences (e.g. `´` + `a` -> `á`).
            if (viewRef?.composing) return null;

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
