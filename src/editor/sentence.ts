import type { Node as PMNode } from "@tiptap/pm/model";

export type SentenceRange = { from: number; to: number };

const TERMINATORS = /(?<=[.!?])\s+/g;
const WS = /\s/;

export function findSentenceRange(
  doc: PMNode,
  pos: number,
): SentenceRange | null {
  const $pos = doc.resolve(pos);

  let depth = $pos.depth;
  while (depth > 0 && !$pos.node(depth).isTextblock) depth--;
  const block = $pos.node(depth);
  if (!block.isTextblock) return null;

  const text = block.textContent;
  if (text.trim().length === 0) return null;

  const blockStart = $pos.start(depth);
  const offset = Math.max(0, Math.min(pos - blockStart, text.length));

  const sentences: SentenceRange[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  TERMINATORS.lastIndex = 0;
  while ((m = TERMINATORS.exec(text)) !== null) {
    sentences.push({ from: lastEnd, to: m.index });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < text.length) {
    sentences.push({ from: lastEnd, to: text.length });
  } else if (sentences.length === 0) {
    sentences.push({ from: 0, to: text.length });
  }

  const found =
    sentences.find((s) => offset >= s.from && offset <= s.to) ??
    sentences[sentences.length - 1];

  let from = found.from;
  while (from < found.to && WS.test(text[from])) from++;
  let to = found.to;
  while (to > from && WS.test(text[to - 1])) to--;

  if (to <= from) return null;

  return { from: blockStart + from, to: blockStart + to };
}
