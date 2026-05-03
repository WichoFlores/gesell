import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";

export type HeadingItem = {
  level: number;
  text: string;
  pos: number;
};

export function collectHeadings(doc: PMNode): HeadingItem[] {
  const items: HeadingItem[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      items.push({
        level: node.attrs.level ?? 1,
        text: node.textContent,
        pos,
      });
    }
  });
  return items;
}

export function jumpToHeading(
  editor: Editor,
  direction: "next" | "prev",
): boolean {
  const { state } = editor;
  const headings = collectHeadings(state.doc);
  if (headings.length === 0) return false;
  const cursor = state.selection.from;
  let target: HeadingItem | undefined;
  if (direction === "next") {
    target = headings.find((h) => h.pos > cursor);
    if (!target) target = headings[headings.length - 1];
  } else {
    for (let i = headings.length - 1; i >= 0; i--) {
      if (headings[i].pos < cursor) {
        target = headings[i];
        break;
      }
    }
    if (!target) target = headings[0];
  }
  return jumpToPos(editor, target.pos);
}

export function jumpToPos(editor: Editor, pos: number): boolean {
  return editor
    .chain()
    .focus()
    .setTextSelection(pos + 1)
    .scrollIntoView()
    .run();
}

export const HeadingNav = Extension.create({
  name: "headingNav",
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-ArrowDown": () => jumpToHeading(this.editor, "next"),
      "Mod-Shift-ArrowUp": () => jumpToHeading(this.editor, "prev"),
    };
  },
});
