import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { updatePatient } from "@/db/patients";
import { createSession } from "@/db/sessions";
import { debounce } from "@/lib/debounce";
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";
import { GenderToggle } from "./GenderToggle";
import { Genogram } from "./Genogram";
import { MindMap } from "./MindMap";
import type { Gender } from "@/lib/relationships";

type Tab = "bio" | "genogram" | "mindmap";

export function BioPage() {
  const activePatientId = useUI((s) => s.activePatientId);
  const setActiveSession = useUI((s) => s.setActiveSession);
  const setView = useUI((s) => s.setView);
  const [tab, setTab] = useState<Tab>("bio");

  const patient = useLiveQuery(
    () =>
      activePatientId ? db.patients.get(activePatientId) : undefined,
    [activePatientId],
  );

  const sessionCount =
    useLiveQuery(
      () =>
        activePatientId
          ? db.sessions
              .where("patientId")
              .equals(activePatientId)
              .count()
          : 0,
      [activePatientId],
      0,
    ) ?? 0;

  const pendingRef = useRef<Record<string, unknown>>({});
  const flush = useMemo(
    () =>
      debounce(() => {
        if (!activePatientId) return;
        const changes = pendingRef.current;
        pendingRef.current = {};
        if (Object.keys(changes).length > 0) {
          void updatePatient(activePatientId, changes);
        }
      }, 500),
    [activePatientId],
  );

  function persist(changes: Record<string, unknown>) {
    pendingRef.current = { ...pendingRef.current, ...changes };
    flush();
  }

  useEffect(() => () => flush.flush(), [flush]);

  async function startSession() {
    if (!activePatientId) return;
    flush.flush();
    const s = await createSession(activePatientId);
    setActiveSession(s.id);
    setView("editor");
  }

  if (!patient) {
    return (
      <div className="p-12 text-sm text-[color:var(--color-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-3">
        <div className="flex items-center gap-1">
          <TabButton active={tab === "bio"} onClick={() => setTab("bio")}>
            Bio
          </TabButton>
          <TabButton
            active={tab === "genogram"}
            onClick={() => setTab("genogram")}
          >
            Genogram
          </TabButton>
          <TabButton
            active={tab === "mindmap"}
            onClick={() => setTab("mindmap")}
          >
            Mind map
          </TabButton>
        </div>
        {sessionCount > 0 ? (
          <button
            type="button"
            onClick={() => setView("editor")}
            className="rounded-md border border-[color:var(--color-border)] px-3 py-1 text-xs hover:bg-[color:var(--color-subtle)]"
          >
            Done
          </button>
        ) : null}
      </header>

      {tab === "genogram" ? (
        <div className="flex-1">
          <Genogram />
        </div>
      ) : tab === "mindmap" ? (
        <div className="flex-1">
          <MindMap />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[640px] px-8 py-10">
          <Field label="Name">
            <input
              key={`${patient.id}:name`}
              type="text"
              defaultValue={patient.name}
              onChange={(e) => persist({ name: e.target.value })}
              placeholder="Patient name"
              className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
            />
          </Field>

          <Field label="Age">
            <input
              key={`${patient.id}:age`}
              type="number"
              min={0}
              max={130}
              defaultValue={patient.age ?? ""}
              placeholder="—"
              onChange={(e) => {
                const v = e.target.value.trim();
                const n = v === "" ? undefined : Number(v);
                persist({ age: Number.isFinite(n) ? n : undefined });
              }}
              className="w-24 rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
            />
          </Field>

          <Field label="Gender">
            <GenderToggle
              value={patient.gender}
              onChange={(g: Gender | undefined) => persist({ gender: g })}
            />
          </Field>

          <Field label="Education">
            <textarea
              key={`${patient.id}:education`}
              defaultValue={patient.education ?? ""}
              placeholder="Highest level, field, ongoing studies…"
              rows={2}
              onChange={(e) => persist({ education: e.target.value })}
              className="w-full resize-none rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
            />
          </Field>

          <Field label="Work">
            <textarea
              key={`${patient.id}:work`}
              defaultValue={patient.work ?? ""}
              placeholder="Occupation, employer, hours…"
              rows={2}
              onChange={(e) => persist({ work: e.target.value })}
              className="w-full resize-none rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
            />
          </Field>

          <div className="mt-8 flex items-center gap-3 border-t border-[color:var(--color-border)] pt-6">
            <button
              type="button"
              onClick={startSession}
              className="rounded-md border border-[color:var(--color-accent)] bg-[color:var(--color-accent)] px-3 py-1.5 text-sm text-white hover:opacity-90"
            >
              + Start a session
            </button>
            {sessionCount === 0 ? (
              <span className="text-xs text-[color:var(--color-muted)]">
                No sessions yet — fill in the basics above and start when ready.
              </span>
            ) : (
              <span className="text-xs text-[color:var(--color-muted)]">
                {sessionCount} session{sessionCount === 1 ? "" : "s"} so far.
              </span>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1 text-sm transition-colors",
        active
          ? "bg-[color:var(--color-subtle)] text-[color:var(--color-fg)]"
          : "text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-5 block">
      <div className="mb-1 text-[10px] tracking-wider text-[color:var(--color-muted)] uppercase">
        {label}
      </div>
      {children}
    </label>
  );
}
