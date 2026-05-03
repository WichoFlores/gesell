import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import type { Session } from "@/db/schema";
import {
  deletePatientAndPickNext,
  getPatientCascadeCounts,
} from "@/db/patients";
import {
  createSession,
  deleteSession,
  renameSession,
} from "@/db/sessions";
import { useUI } from "@/store/ui";
import { groupKey, groupLabel, timeLabel, type SessionGroupKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./ConfirmDialog";

const GROUP_ORDER: SessionGroupKey[] = [
  "today",
  "yesterday",
  "thisWeek",
  "earlier",
];

export function Sidebar() {
  const activePatientId = useUI((s) => s.activePatientId);
  const activeSessionId = useUI((s) => s.activeSessionId);
  const setActivePatient = useUI((s) => s.setActivePatient);
  const setActiveSession = useUI((s) => s.setActiveSession);
  const openPatientSwitcher = useUI((s) => s.openPatientSwitcher);
  const setView = useUI((s) => s.setView);
  const view = useUI((s) => s.view);
  const [deletePatientId, setDeletePatientId] = useState<string | null>(null);
  const [cascadeCounts, setCascadeCounts] = useState<{
    sessions: number;
    family: number;
  } | null>(null);

  const patient = useLiveQuery(
    async () => (activePatientId ? db.patients.get(activePatientId) : null),
    [activePatientId],
  );

  const sessions = useLiveQuery(
    async () => {
      if (!activePatientId) return [];
      return db.sessions
        .where("patientId")
        .equals(activePatientId)
        .reverse()
        .sortBy("updatedAt");
    },
    [activePatientId],
    [],
  );

  const grouped = (sessions ?? []).reduce(
    (acc, s) => {
      const k = groupKey(s.updatedAt);
      (acc[k] ??= []).push(s);
      return acc;
    },
    {} as Partial<Record<SessionGroupKey, Session[]>>,
  );

  async function handleNewSession() {
    if (!activePatientId) return;
    const s = await createSession(activePatientId);
    setActiveSession(s.id);
    setView("editor");
  }

  const [menu, setMenu] = useState<{
    sessionId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!menu) return;
    function dismiss() {
      setMenu(null);
    }
    document.addEventListener("click", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("click", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [menu]);

  async function requestDeletePatient(id: string) {
    const counts = await getPatientCascadeCounts(id);
    setCascadeCounts(counts);
    setDeletePatientId(id);
  }

  async function confirmDeletePatient() {
    if (!deletePatientId) return;
    const id = deletePatientId;
    setDeletePatientId(null);
    setCascadeCounts(null);
    const next = await deletePatientAndPickNext(id);
    setActivePatient(next.patientId);
    setActiveSession(next.sessionId);
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-panel)]">
      <div
        className="flex items-center justify-between gap-2 border-b border-[color:var(--color-border)] px-4 py-3"
        onContextMenu={(e) => {
          if (!patient) return;
          e.preventDefault();
          void requestDeletePatient(patient.id);
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-wider text-[color:var(--color-muted)] uppercase">
            Patient
          </div>
          {patient ? (
            <button
              type="button"
              onClick={() => setView("bio")}
              title="Open bio"
              className={cn(
                "block w-full min-w-0 cursor-pointer truncate rounded text-left font-medium",
                "hover:bg-[color:var(--color-subtle)]",
                view === "bio" && "bg-[color:var(--color-subtle)]",
              )}
            >
              {patient.name || (
                <span className="text-[color:var(--color-muted)]">
                  Untitled patient
                </span>
              )}
            </button>
          ) : (
            <div className="truncate font-medium text-[color:var(--color-muted)]">
              —
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={openPatientSwitcher}
          title="Switch patient (⌘⇧P)"
          className="rounded px-2 py-1 text-xs text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]"
          aria-label="Switch patient"
        >
          ⌘⇧P
        </button>
      </div>

      <button
        type="button"
        onClick={handleNewSession}
        className="m-3 flex items-center justify-between rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm transition-colors hover:bg-[color:var(--color-subtle)]"
      >
        <span>+ New session</span>
        <span className="text-xs text-[color:var(--color-muted)]">⌘⇧N</span>
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2">
        {GROUP_ORDER.map((k) => {
          const list = grouped[k];
          if (!list || list.length === 0) return null;
          return (
            <div key={k} className="mt-3 first:mt-0">
              <div className="px-2 pb-1 text-[10px] tracking-wider text-[color:var(--color-muted)] uppercase">
                {groupLabel(k)}
              </div>
              <ul className="flex flex-col">
                {list.map((s) => {
                  const isActive = s.id === activeSessionId;
                  const title = s.title.trim() || "Untitled";
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSession(s.id);
                          setView("editor");
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setMenu({ sessionId: s.id, x: e.clientX, y: e.clientY });
                        }}
                        className={cn(
                          "group flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          isActive
                            ? "bg-[color:var(--color-subtle)] text-[color:var(--color-fg)]"
                            : "text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-fg)]",
                        )}
                      >
                        <span className="truncate">{title}</span>
                        <span className="shrink-0 text-[10px] text-[color:var(--color-muted)]">
                          {timeLabel(s.updatedAt)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setView(view === "settings" ? "editor" : "settings")}
        className={cn(
          "flex items-center justify-between border-t border-[color:var(--color-border)] px-4 py-3 text-sm text-left transition-colors",
          "hover:bg-[color:var(--color-subtle)]",
          view === "settings" && "bg-[color:var(--color-subtle)]",
        )}
      >
        <span>⚙ Settings</span>
        <span className="text-xs text-[color:var(--color-muted)]">⌘,</span>
      </button>

      <ConfirmDialog
        open={deletePatientId != null}
        title={`Delete ${patient?.name ?? "patient"}?`}
        body={
          cascadeCounts ? (
            <>
              This will permanently remove{" "}
              <strong>
                {cascadeCounts.sessions} session
                {cascadeCounts.sessions === 1 ? "" : "s"}
              </strong>{" "}
              and{" "}
              <strong>
                {cascadeCounts.family} family member
                {cascadeCounts.family === 1 ? "" : "s"}
              </strong>{" "}
              tied to this patient. This cannot be undone.
            </>
          ) : (
            "Loading…"
          )
        }
        confirmLabel="Delete patient"
        destructive
        onConfirm={confirmDeletePatient}
        onCancel={() => {
          setDeletePatientId(null);
          setCascadeCounts(null);
        }}
      />

      {menu ? (
        <div
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-50 min-w-[140px] overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-panel)] py-1 text-sm shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={async () => {
              const next = window.prompt("Rename session", "");
              if (next != null) await renameSession(menu.sessionId, next);
              setMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-[color:var(--color-subtle)]"
          >
            Rename…
          </button>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm("Delete this session?")) {
                await deleteSession(menu.sessionId);
              }
              setMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left text-red-400 hover:bg-[color:var(--color-subtle)]"
          >
            Delete
          </button>
        </div>
      ) : null}
    </aside>
  );
}
