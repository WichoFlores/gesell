import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

type Options = {
  getMode: () => string | null;
  getAnchorBlock: () => number | null;
  clearMode: () => void;
};

export const cursorModePluginKey = new PluginKey("cursorMode");

export function buildCursorModeExtension(options: Options) {
  return Extension.create({
    name: "cursorMode",

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: cursorModePluginKey,

          appendTransaction(_transactions, _oldState, newState) {
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
          if (options.getMode()) {
            options.clearMode();
            const ed = editorRef();
            ed.view.dispatch(ed.state.tr.setStoredMarks(null));
          }
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
