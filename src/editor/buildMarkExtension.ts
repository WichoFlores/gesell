import { InputRule, Mark, mergeAttributes } from "@tiptap/core";
import type { MarkDefinition } from "@/marks/types";
import { findSentenceRange } from "./sentence";

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const escapeRegex = (s: string) => s.replace(REGEX_SPECIAL, "\\$&");

export function buildMarkExtension(
  def: MarkDefinition,
  allDefs: MarkDefinition[],
) {
  return Mark.create({
    name: def.id,
    inclusive: false,

    parseHTML() {
      return [{ tag: `span[data-mark="${def.id}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "span",
        mergeAttributes(HTMLAttributes, {
          "data-mark": def.id,
          class: def.cssClass,
        }),
        0,
      ];
    },

    addInputRules() {
      if (!def.inputRule) return [];
      const type = this.type;
      const open = escapeRegex(def.inputRule.open);
      const close = escapeRegex(def.inputRule.close);
      return [
        new InputRule({
          find: new RegExp(`${open}([^${close}]+)${close}$`),
          handler: ({ state, range, match }) => {
            const tr = state.tr;
            const fullMatch = match[0];
            const matchEnd = range.from + fullMatch.length;
            // ProseMirror passes range.to = pre-typed-char cursor position; the
            // trigger char isn't in the doc yet. Insert any chars from the
            // matched pattern that aren't already in the doc.
            if (range.to < matchEnd) {
              tr.insertText(fullMatch.slice(range.to - range.from), range.to);
            }
            tr.addMark(range.from, matchEnd, type.create());
            tr.removeStoredMark(type);
          },
        }),
      ];
    },

    addKeyboardShortcuts() {
      if (!def.shortcut) return {};
      const editorRef = () => this.editor;
      return {
        [def.shortcut]: () => {
          const editor = editorRef();
          if (def.kind === "sentence") {
            const range = findSentenceRange(
              editor.state.doc,
              editor.state.selection.from,
            );
            if (!range) return false;
            return editor
              .chain()
              .focus()
              .setTextSelection(range)
              .toggleMark(def.id)
              .run();
          }
          if (def.exclusiveGroup) {
            const isActive = editor.isActive(def.id);
            if (isActive) {
              return editor.chain().focus().unsetMark(def.id).run();
            }
            const peers = allDefs.filter(
              (d) =>
                d.exclusiveGroup === def.exclusiveGroup && d.id !== def.id,
            );
            const chain = editor.chain().focus();
            for (const peer of peers) {
              if (editor.isActive(peer.id)) chain.unsetMark(peer.id);
            }
            return chain.toggleMark(def.id).run();
          }
          return editor.commands.toggleMark(def.id);
        },
      };
    },
  });
}
