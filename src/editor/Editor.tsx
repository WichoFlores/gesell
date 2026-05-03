import { useEffect, useMemo, useRef } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { buildMarkExtension } from "./buildMarkExtension";
import { buildCursorModeExtension } from "./cursorModeExtension";
import { HeadingNav } from "./headings";
import { debounce } from "@/lib/debounce";
import { saveSessionDoc } from "@/db/sessions";
import { useUI } from "@/store/ui";
import { useMarkDefs } from "@/store/marks";
import { useEditorBus } from "@/store/editorBus";
import { useCursorMode } from "@/store/cursorMode";
import { CursorModeBubble } from "@/components/CursorModeBubble";

const SAVE_DEBOUNCE_MS = 750;

type Props = {
  sessionId: string;
  initialDoc: JSONContent;
};

export function Editor({ sessionId, initialDoc }: Props) {
  const setSaveStatus = useUI((s) => s.setSaveStatus);
  const setEditorBus = useEditorBus((s) => s.setEditor);
  const markDefs = useMarkDefs();
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const persist = useMemo(
    () =>
      debounce(async (doc: JSONContent) => {
        try {
          await saveSessionDoc(sessionIdRef.current, doc);
          setSaveStatus("saved");
        } catch (err) {
          console.error("save failed", err);
          setSaveStatus("idle");
        }
      }, SAVE_DEBOUNCE_MS),
    [setSaveStatus],
  );

  const markExtensionsKey = useMemo(
    () => markDefs.map((d) => `${d.id}:${d.shortcut ?? ""}`).join("|"),
    [markDefs],
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        HeadingNav,
        ...markDefs.map((d) => buildMarkExtension(d, markDefs)),
        buildCursorModeExtension({
          getMode: () => useCursorMode.getState().modeId,
          getAnchorBlock: () => useCursorMode.getState().anchorBlock,
          getActivationPos: () => useCursorMode.getState().activationPos,
          clearMode: () => useCursorMode.getState().setMode(null),
        }),
      ],
      content: initialDoc,
      autofocus: "end",
      editorProps: {
        attributes: { class: "tn-prose", spellcheck: "false" },
      },
      onUpdate: ({ editor }) => {
        setSaveStatus("saving");
        persist(editor.getJSON());
      },
    },
    [sessionId, markExtensionsKey],
  );

  useEffect(() => {
    function flushOnHide() {
      if (document.visibilityState === "hidden") persist.flush();
    }
    function flushOnUnload() {
      persist.flush();
    }
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("beforeunload", flushOnUnload);
    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("beforeunload", flushOnUnload);
      persist.flush();
    };
  }, [persist]);

  useEffect(() => {
    setEditorBus(editor ?? null);
    return () => setEditorBus(null);
  }, [editor, setEditorBus]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const unsubscribe = useCursorMode.subscribe((state) => {
      if (state.modeId) dom.setAttribute("data-cursor-mode", state.modeId);
      else dom.removeAttribute("data-cursor-mode");
    });
    const initial = useCursorMode.getState().modeId;
    if (initial) dom.setAttribute("data-cursor-mode", initial);
    return () => {
      unsubscribe();
      dom.removeAttribute("data-cursor-mode");
    };
  }, [editor]);

  if (markDefs.length === 0) return null;

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      <CursorModeBubble />
    </div>
  );
}
