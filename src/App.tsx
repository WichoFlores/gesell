import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { bootstrapApp } from "@/db/boot";
import { createSession, renameSession } from "@/db/sessions";
import { InlineEditable } from "@/components/InlineEditable";
import { BioPage } from "@/components/BioPage";
import { useUI } from "@/store/ui";
import { useHydrateMarks } from "@/store/marks";
import { Editor } from "@/editor/Editor";
import { Sidebar } from "@/components/Sidebar";
import { PatientSwitcher } from "@/components/PatientSwitcher";
import { SaveIndicator } from "@/components/SaveIndicator";
import { SettingsPage } from "@/components/SettingsPage";
import { MarkColorStyles } from "@/components/MarkColorStyles";
import { FamilyPanel } from "@/components/FamilyPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { OutlinePalette } from "@/components/OutlinePalette";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Legend } from "@/components/Legend";

export default function App() {
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const activePatientId = useUI((s) => s.activePatientId);
  const activeSessionId = useUI((s) => s.activeSessionId);
  const setActivePatient = useUI((s) => s.setActivePatient);
  const setActiveSession = useUI((s) => s.setActiveSession);
  const openPatientSwitcher = useUI((s) => s.openPatientSwitcher);
  const toggleFamilyPanel = useUI((s) => s.toggleFamilyPanel);
  const [booted, setBooted] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);

  useHydrateMarks();

  useEffect(() => {
    let cancelled = false;
    bootstrapApp().then(({ patientId, sessionId }) => {
      if (cancelled) return;
      setActivePatient(patientId);
      setActiveSession(sessionId);
      setBooted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [setActivePatient, setActiveSession]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        openPatientSwitcher();
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (activePatientId) {
          void createSession(activePatientId).then((s) => {
            setActiveSession(s.id);
            setView("editor");
          });
        }
        return;
      }
      if (!e.shiftKey && !e.altKey && e.key === ",") {
        e.preventDefault();
        setView(view === "settings" ? "editor" : "settings");
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFamilyPanel();
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setOutlineOpen(true);
        return;
      }
      if (!e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activePatientId,
    openPatientSwitcher,
    setActiveSession,
    setView,
    toggleFamilyPanel,
    view,
  ]);

  const session = useLiveQuery(
    () => (activeSessionId ? db.sessions.get(activeSessionId) : undefined),
    [activeSessionId],
  );

  return (
    <div className="flex h-full">
      <MarkColorStyles />
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {view === "settings" ? (
          <SettingsPage />
        ) : view === "bio" ||
          (booted && activePatientId && !activeSessionId) ? (
          <BioPage />
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-6 py-3">
              {session ? (
                <InlineEditable
                  value={session.title}
                  onCommit={(next) => renameSession(session.id, next)}
                  placeholder="Untitled session"
                  className="min-w-0 flex-1 truncate text-sm"
                  inputClassName="min-w-0 flex-1 text-sm"
                  ariaLabel="Session title"
                />
              ) : (
                <span className="text-sm text-[color:var(--color-muted)]">
                  Loading…
                </span>
              )}
              <ThemeToggle />
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-12">
                {booted && session ? (
                  <Editor
                    key={session.id}
                    sessionId={session.id}
                    initialDoc={session.doc}
                  />
                ) : (
                  <div className="text-sm text-[color:var(--color-muted)]">
                    Loading…
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
      <FamilyPanel />
      <PatientSwitcher />
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
      <OutlinePalette
        open={outlineOpen}
        onClose={() => setOutlineOpen(false)}
      />
      <SaveIndicator />
      <Legend />
    </div>
  );
}
