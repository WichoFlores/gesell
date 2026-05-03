export type MarkKind = "inline" | "sentence";

export type MarkStyle =
  | "serif-quote"
  | "underline-dotted"
  | "highlight"
  | "colored";

export type MarkInputRule = { open: string; close: string };

export type MarkDefinition = {
  id: string;
  name: string;
  kind: MarkKind;
  color: string;
  style: MarkStyle;
  cssClass: string;
  shortcut?: string;
  inputRule?: MarkInputRule;
  exclusiveGroup?: string;
  builtin: boolean;
};
