import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { findSentenceRange } from "./sentence";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "text*",
      toDOM: () => ["p", 0],
    },
    text: { group: "inline" },
  },
});

function docFrom(...paragraphs: string[]) {
  return schema.node(
    "doc",
    null,
    paragraphs.map((p) =>
      schema.node("paragraph", null, p.length ? [schema.text(p)] : []),
    ),
  );
}

function rangeText(doc: ReturnType<typeof docFrom>, range: { from: number; to: number } | null) {
  if (!range) return null;
  return doc.textBetween(range.from, range.to, "\n");
}

describe("findSentenceRange", () => {
  it("returns the sentence containing pos in a single-sentence paragraph", () => {
    const doc = docFrom("Hello world.");
    const r = findSentenceRange(doc, 3);
    expect(rangeText(doc, r)).toBe("Hello world.");
  });

  it("splits multi-sentence paragraph on . and returns the first sentence", () => {
    const doc = docFrom("She paused. Then she spoke softly.");
    const r = findSentenceRange(doc, 3);
    expect(rangeText(doc, r)).toBe("She paused.");
  });

  it("returns the second sentence when caret sits in it", () => {
    const doc = docFrom("She paused. Then she spoke softly.");
    const offsetIntoSecond = "She paused. Then she ".length + 1;
    const r = findSentenceRange(doc, offsetIntoSecond);
    expect(rangeText(doc, r)).toBe("Then she spoke softly.");
  });

  it("treats ! as a sentence terminator", () => {
    const doc = docFrom("Wait! What did you say?");
    const r1 = findSentenceRange(doc, 2);
    expect(rangeText(doc, r1)).toBe("Wait!");
    const r2 = findSentenceRange(doc, 10);
    expect(rangeText(doc, r2)).toBe("What did you say?");
  });

  it("treats ? as a sentence terminator", () => {
    const doc = docFrom("Are you sure? I think so.");
    const r = findSentenceRange(doc, 5);
    expect(rangeText(doc, r)).toBe("Are you sure?");
  });

  it("returns the trailing sentence even without a terminator", () => {
    const doc = docFrom("She paused. Then she spoke softly");
    const r = findSentenceRange(doc, doc.content.size - 2);
    expect(rangeText(doc, r)).toBe("Then she spoke softly");
  });

  it("works on a one-word non-terminated 'sentence'", () => {
    const doc = docFrom("Maybe");
    const r = findSentenceRange(doc, 2);
    expect(rangeText(doc, r)).toBe("Maybe");
  });

  it("returns null on an empty paragraph", () => {
    const doc = docFrom("");
    const r = findSentenceRange(doc, 1);
    expect(r).toBeNull();
  });

  it("scopes to the paragraph containing pos, not earlier ones", () => {
    const doc = docFrom("First para.", "Second para.");
    const firstParaSize = "First para.".length + 2;
    const r = findSentenceRange(doc, firstParaSize + 2);
    expect(rangeText(doc, r)).toBe("Second para.");
  });

  it("known limitation: false-splits on abbreviations like 'Dr.'", () => {
    const doc = docFrom("She mentioned Dr. Patel briefly.");
    const r = findSentenceRange(doc, 5);
    expect(rangeText(doc, r)).toBe("She mentioned Dr.");
  });
});
