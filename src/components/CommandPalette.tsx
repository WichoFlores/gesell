import { useEffect, useRef, useState, type ReactNode } from "react";
import { Command } from "cmdk";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import {
  createPatient,
  deletePatientAndPickNext,
  getPatientCascadeCounts,
} from "@/db/patients";
import { createSession, getMostRecentSessionId } from "@/db/sessions";
import { useEditorSelectionRestore } from "@/lib/useEditorSelectionRestore";
import { ConfirmDialog } from "./ConfirmDialog";
import { useUI } from "@/store/ui";
import { timeLabel } from "@/lib/date";
import { initials } from "@/lib/age";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: Props) {
  const activePatientId = useUI((s) => s.activePatientId);
  const setActivePatient = useUI((s) => s.setActivePatient);
  const setActiveSession = useUI((s) => s.setActiveSession);
  const setView = useUI((s) => s.setView);
  const toggleFamilyPanel = useUI((s) => s.toggleFamilyPanel);
  const openFamilyDetail = useUI((s) => s.openFamilyDetail);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    patientName: string;
    patientId: string;
    body: ReactNode;
  } | null>(null);
  const { skipRestore } = useEditorSelectionRestore(open);

  const sessions = useLiveQuery(
    () =>
      activePatientId
        ? db.sessions
            .where("patientId")
            .equals(activePatientId)
            .reverse()
            .sortBy("updatedAt")
        : [],
    [activePatientId],
    [],
  );

  const family = useLiveQuery(
    () =>
      activePatientId
        ? db.family_members
            .where("patientId")
            .equals(activePatientId)
            .sortBy("name")
        : [],
    [activePatientId],
    [],
  );

  const patients = useLiveQuery(
    () => db.patients.orderBy("updatedAt").reverse().toArray(),
    [],
    [],
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  async function selectSession(id: string) {
    skipRestore();
    setActiveSession(id);
    setView("editor");
    onClose();
  }

  async function selectPatient(id: string) {
    skipRestore();
    setActivePatient(id);
    const sid = await getMostRecentSessionId(id);
    setActiveSession(sid);
    onClose();
  }

  function selectPerson(id: string) {
    if (useUI.getState().familyPanelOpen === false) {
      toggleFamilyPanel();
    }
    openFamilyDetail(id);
    onClose();
  }

  async function actionNewSession() {
    if (!activePatientId) return;
    skipRestore();
    const s = await createSession(activePatientId);
    setActiveSession(s.id);
    setView("editor");
    onClose();
  }

  function actionOpenSettings() {
    skipRestore();
    setView("settings");
    onClose();
  }

  function actionToggleFamily() {
    toggleFamilyPanel();
    onClose();
  }

  async function actionDeleteCurrentPatient() {
    if (!activePatientId) return;
    const current = patients.find((p) => p.id === activePatientId);
    if (!current) return;
    const counts = await getPatientCascadeCounts(activePatientId);
    setConfirmDelete({
      patientId: activePatientId,
      patientName: current.name,
      body: (
        <>
          This will permanently remove{" "}
          <strong>
            {counts.sessions} session{counts.sessions === 1 ? "" : "s"}
          </strong>{" "}
          and{" "}
          <strong>
            {counts.family} family member{counts.family === 1 ? "" : "s"}
          </strong>{" "}
          tied to this patient. This cannot be undone.
        </>
      ),
    });
    onClose();
  }

  async function performDelete() {
    if (!confirmDelete) return;
    const { patientId } = confirmDelete;
    setConfirmDelete(null);
    const next = await deletePatientAndPickNext(patientId);
    setActivePatient(next.patientId);
    setActiveSession(next.sessionId);
  }

  async function actionCreatePatient() {
    const name = query.trim();
    if (!name) return;
    const p = await createPatient(name);
    await selectPatient(p.id);
  }

  const otherPatients = patients.filter((p) => p.id !== activePatientId);

  const trimmed = query.trim();
  const noPatientMatch =
    trimmed.length > 0 &&
    !patients.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[18vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
        <Command
          shouldFilter
          loop
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Search sessions, family, patients, or actions…"
            className="w-full border-b border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[color:var(--color-muted)]"
          />
          <Command.List className="max-h-96 overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-[color:var(--color-muted)]">
              No matches.
            </Command.Empty>

            <Command.Group
              heading="Sessions"
              className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[color:var(--color-muted)] [&_[cmdk-group-heading]]:uppercase"
            >
              {sessions.map((s) => {
                const title = s.title.trim() || "Untitled session";
                return (
                  <Command.Item
                    key={s.id}
                    value={`session ${title}`}
                    onSelect={() => void selectSession(s.id)}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]"
                  >
                    <span className="truncate">{title}</span>
                    <span className="text-xs text-[color:var(--color-muted)]">
                      {timeLabel(s.updatedAt)}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            {family.length > 0 ? (
              <Command.Group
                heading="Family"
                className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[color:var(--color-muted)] [&_[cmdk-group-heading]]:uppercase"
              >
                {family.map((m) => (
                  <Command.Item
                    key={m.id}
                    value={`person ${m.name} ${m.relationship}`}
                    onSelect={() => selectPerson(m.id)}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] text-[10px] text-[color:var(--color-muted)]">
                      {initials(m.name)}
                    </span>
                    <span className="flex-1 truncate">{m.name}</span>
                    {m.relationship ? (
                      <span className="text-xs text-[color:var(--color-muted)]">
                        {m.relationship}
                      </span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {otherPatients.length > 0 ? (
              <Command.Group
                heading="Patients"
                className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[color:var(--color-muted)] [&_[cmdk-group-heading]]:uppercase"
              >
                {otherPatients.map((p) => (
                  <Command.Item
                    key={p.id}
                    value={`patient ${p.name}`}
                    onSelect={() => void selectPatient(p.id)}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs text-[color:var(--color-muted)]">
                      switch
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Group
              heading="Actions"
              className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[color:var(--color-muted)] [&_[cmdk-group-heading]]:uppercase"
            >
              <Command.Item
                value="action new session"
                onSelect={() => void actionNewSession()}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]"
              >
                <span>+ New session</span>
                <span className="text-xs text-[color:var(--color-muted)]">
                  ⌘⇧N
                </span>
              </Command.Item>
              <Command.Item
                value="action open settings"
                onSelect={actionOpenSettings}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]"
              >
                <span>Open settings</span>
                <span className="text-xs text-[color:var(--color-muted)]">
                  ⌘,
                </span>
              </Command.Item>
              <Command.Item
                value="action toggle family panel"
                onSelect={actionToggleFamily}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]"
              >
                <span>Toggle family panel</span>
                <span className="text-xs text-[color:var(--color-muted)]">
                  ⌘⇧F
                </span>
              </Command.Item>
              {activePatientId ? (
                <Command.Item
                  value="action delete current patient remove"
                  onSelect={() => void actionDeleteCurrentPatient()}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-red-400 aria-selected:bg-[color:var(--color-subtle)]"
                >
                  <span>Delete current patient…</span>
                </Command.Item>
              ) : null}
            </Command.Group>

            {noPatientMatch ? (
              <Command.Group
                heading="Create"
                className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[color:var(--color-muted)] [&_[cmdk-group-heading]]:uppercase"
              >
                <Command.Item
                  value={`__create__${trimmed}`}
                  onSelect={() => void actionCreatePatient()}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]"
                >
                  <span>+ Create patient &ldquo;{trimmed}&rdquo;</span>
                </Command.Item>
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmDelete != null}
        title={`Delete ${confirmDelete?.patientName ?? "patient"}?`}
        body={confirmDelete?.body ?? "Loading…"}
        confirmLabel="Delete patient"
        destructive
        onConfirm={performDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
