import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { deleteFamilyMember, updateFamilyMember } from "@/db/family";
import { debounce } from "@/lib/debounce";
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";

const SUGGESTED_FLAGS = [
  "deceased",
  "estranged",
  "lives with patient",
  "caretaker",
];

export function PersonCard({ id }: { id: string }) {
  const member = useLiveQuery(() => db.family_members.get(id), [id]);
  const openFamilyDetail = useUI((s) => s.openFamilyDetail);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const pendingRef = useRef<Record<string, unknown>>({});
  const flushPending = useMemo(
    () =>
      debounce(() => {
        const changes = pendingRef.current;
        pendingRef.current = {};
        if (Object.keys(changes).length > 0) {
          void updateFamilyMember(id, changes);
        }
      }, 500),
    [id],
  );
  function persist(changes: Record<string, unknown>) {
    pendingRef.current = { ...pendingRef.current, ...changes };
    flushPending();
  }
  useEffect(() => () => flushPending.flush(), [flushPending]);

  if (!member) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[color:var(--color-border)] px-4 py-2">
        <button
          type="button"
          onClick={() => openFamilyDetail(null)}
          className="rounded p-1 text-xs text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]"
          aria-label="Back to family list"
        >
          ← Back
        </button>
        <div className="flex-1" />
        {confirmingDelete ? (
          <>
            <span className="text-xs text-[color:var(--color-muted)]">
              Delete?
            </span>
            <button
              type="button"
              onClick={() => {
                void deleteFamilyMember(id);
                openFamilyDetail(null);
              }}
              className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded border border-[color:var(--color-border)] px-2 py-1 text-xs hover:bg-[color:var(--color-subtle)]"
            >
              No
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded p-1 text-xs text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]"
          >
            Delete
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Field label="Name">
          <input
            type="text"
            defaultValue={member.name}
            onChange={(e) => persist({ name: e.target.value })}
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
          />
        </Field>

        <Field label="Relationship">
          <input
            type="text"
            list="relationship-suggestions"
            defaultValue={member.relationship}
            placeholder="mother, father, sibling…"
            onChange={(e) => persist({ relationship: e.target.value })}
            className="w-full rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
          />
          <datalist id="relationship-suggestions">
            {[
              "mother",
              "father",
              "sibling",
              "partner",
              "child",
              "friend",
              "grandparent",
            ].map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>

        <Field label="Age">
          <input
            type="number"
            min={0}
            max={130}
            defaultValue={member.age ?? ""}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value.trim();
              const n = v === "" ? undefined : Number(v);
              persist({ age: Number.isFinite(n) ? n : undefined });
            }}
            className="w-24 rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
          />
        </Field>

        <Field label="Status">
          <StatusFlags
            flags={member.statusFlags}
            onChange={(flags) => void updateFamilyMember(id, { statusFlags: flags })}
          />
        </Field>

        <Field label="Notes">
          <NotesField
            id={id}
            initialValue={member.notes}
          />
        </Field>
      </div>
    </div>
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
    <label className="block">
      <div className="mb-1 text-[10px] tracking-wider text-[color:var(--color-muted)] uppercase">
        {label}
      </div>
      {children}
    </label>
  );
}

function StatusFlags({
  flags,
  onChange,
}: {
  flags: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add(flag: string) {
    const v = flag.trim().toLowerCase();
    if (!v || flags.includes(v)) return;
    onChange([...flags, v]);
    setDraft("");
    inputRef.current?.focus();
  }

  function remove(flag: string) {
    onChange(flags.filter((f) => f !== flag));
  }

  const suggestions = SUGGESTED_FLAGS.filter((s) => !flags.includes(s));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {flags.map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] px-2 py-0.5 text-xs"
        >
          {f}
          <button
            type="button"
            onClick={() => remove(f)}
            className="text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
            aria-label={`Remove ${f}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          }
        }}
        placeholder={flags.length === 0 ? "add flag…" : "+ add"}
        className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-xs outline-none placeholder:text-[color:var(--color-muted)]"
      />
      {draft.length === 0 && suggestions.length > 0 ? (
        <div className="mt-1 flex w-full flex-wrap gap-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn(
                "rounded-full border border-dashed border-[color:var(--color-border)] px-2 py-0.5 text-[11px]",
                "text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]",
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NotesField({
  id,
  initialValue,
}: {
  id: string;
  initialValue: string;
}) {
  const persist = useMemo(
    () => debounce((notes: string) => void updateFamilyMember(id, { notes }), 500),
    [id],
  );
  useEffect(() => () => persist.flush(), [persist]);
  return (
    <textarea
      defaultValue={initialValue}
      onChange={(e) => persist(e.target.value)}
      rows={6}
      className="w-full resize-none rounded border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
      placeholder="Anything to remember about them…"
    />
  );
}
