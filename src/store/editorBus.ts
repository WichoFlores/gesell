import { create } from "zustand";
import type { Editor } from "@tiptap/core";

type EditorBus = {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
};

export const useEditorBus = create<EditorBus>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}));
