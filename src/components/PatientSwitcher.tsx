import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { createPatient } from "@/db/patients";
import { getMostRecentSessionId } from "@/db/sessions";
import { useUI } from "@/store/ui";

export function PatientSwitcher() {
  const open = useUI((s) => s.patientSwitcherOpen);
  const close = useUI((s) => s.closePatientSwitcher);
  const setActivePatient = useUI((s) => s.setActivePatient);
  const setActiveSession = useUI((s) => s.setActiveSession);
  const activePatientId = useUI((s) => s.activePatientId);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function selectPatient(id: string) {
    setActivePatient(id);
    const sid = await getMostRecentSessionId(id);
    setActiveSession(sid);
    close();
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    const p = await createPatient(name);
    await selectPatient(p.id);
  }

  if (!open) return null;

  const trimmedQuery = query.trim();
  const noExactMatch =
    trimmedQuery.length > 0 &&
    !(patients ?? []).some(
      (p) => p.name.toLowerCase() === trimmedQuery.toLowerCase(),
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[18vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter
          loop
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
        >
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Switch to patient or type a new name…"
            className="w-full border-b border-[color:var(--color-border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[color:var(--color-muted)]"
          />
          <Command.List className="max-h-80 overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-[color:var(--color-muted)]">
              No matches.
            </Command.Empty>
            {(patients ?? []).map((p) => (
              <Command.Item
                key={p.id}
                value={p.name}
                onSelect={() => void selectPatient(p.id)}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]"
              >
                <span>{p.name}</span>
                {p.id === activePatientId ? (
                  <span className="text-xs text-[color:var(--color-muted)]">
                    current
                  </span>
                ) : null}
              </Command.Item>
            ))}
            {noExactMatch ? (
              <Command.Item
                value={`__create__${trimmedQuery}`}
                onSelect={handleCreate}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm aria-selected:bg-[color:var(--color-subtle)]"
              >
                <span>+ Create &ldquo;{trimmedQuery}&rdquo;</span>
                <span className="text-xs text-[color:var(--color-muted)]">
                  new patient
                </span>
              </Command.Item>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
