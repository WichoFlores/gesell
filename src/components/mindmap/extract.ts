import type { JSONContent } from "@tiptap/core";

export type Snippet = {
  text: string;
  markId: string;
  sessionId: string;
};

export function extractSnippets(
  doc: JSONContent | undefined,
  sessionId: string,
): Snippet[] {
  const out: Snippet[] = [];
  if (!doc) return out;
  walk(doc, (node) => {
    if (
      node.type === "text" &&
      node.text &&
      node.marks &&
      node.marks.length > 0
    ) {
      const seen = new Set<string>();
      for (const mark of node.marks) {
        // Same span tagged with multiple marks — record under each id but
        // only once per id (Tiptap shouldn't emit duplicates, but defensive).
        if (!mark.type || seen.has(mark.type)) continue;
        seen.add(mark.type);
        out.push({ text: node.text, markId: mark.type, sessionId });
      }
    }
  });
  return out;
}

function walk(node: JSONContent, fn: (n: JSONContent) => void) {
  fn(node);
  if (node.content) for (const c of node.content) walk(c, fn);
}
