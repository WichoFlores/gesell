import { useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { createFamilyMember } from "@/db/family";
import { initials } from "@/lib/age";
import { useUI } from "@/store/ui";
import { useEditorSelectionRestore } from "@/lib/useEditorSelectionRestore";
import { cn } from "@/lib/utils";
import { relationshipLabel } from "@/lib/relationships";
import { PersonCard } from "./PersonCard";

export function FamilyPanel() {
  const open = useUI((s) => s.familyPanelOpen);
  const close = useUI((s) => s.closeFamilyPanel);
  const detailId = useUI((s) => s.familyDetailId);
  const openDetail = useUI((s) => s.openFamilyDetail);
  const activePatientId = useUI((s) => s.activePatientId);

  const members = useLiveQuery(
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

  const patient = useLiveQuery(
    () => (activePatientId ? db.patients.get(activePatientId) : undefined),
    [activePatientId],
  );

  const listRef = useRef<HTMLUListElement>(null);

  useEditorSelectionRestore(open);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const first = listRef.current?.querySelector<HTMLButtonElement>(
        "li > button",
      );
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open, detailId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (detailId) openDetail(null);
        else close();
        return;
      }
      if (detailId) return;
      const target = e.target as HTMLElement | null;
      const isField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !isField) {
        e.preventDefault();
        void handleAdd();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (isField) return;
        const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
          "li > button",
        );
        if (!buttons || buttons.length === 0) return;
        e.preventDefault();
        const arr = Array.from(buttons);
        const currentIndex = arr.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        let next: number;
        if (currentIndex === -1) {
          next = e.key === "ArrowDown" ? 0 : arr.length - 1;
        } else {
          next =
            e.key === "ArrowDown"
              ? (currentIndex + 1) % arr.length
              : (currentIndex - 1 + arr.length) % arr.length;
        }
        arr[next]?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, detailId, close, openDetail, activePatientId]);

  async function handleAdd() {
    if (!activePatientId) return;
    const m = await createFamilyMember(activePatientId);
    openDetail(m.id);
  }

  if (!open) return null;

  return (
    <aside
      className="fixed top-0 right-0 bottom-0 z-40 flex w-80 flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-panel)] shadow-2xl print:hidden"
      role="complementary"
      aria-label="Family panel"
    >
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] tracking-wider text-[color:var(--color-muted)] uppercase">
            Family of
          </div>
          <div className="truncate text-sm font-medium">
            {patient?.name ?? "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          className="rounded p-1 text-xs text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]"
          aria-label="Close family panel"
        >
          ✕
        </button>
      </header>

      {detailId ? (
        <PersonCard key={detailId} id={detailId} />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-3 py-2">
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-md border border-[color:var(--color-border)] px-2 py-1 text-xs hover:bg-[color:var(--color-subtle)]"
            >
              + Add person
            </button>
            <span className="text-xs text-[color:var(--color-muted)]">
              n
            </span>
          </div>

          <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-2">
            {members.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[color:var(--color-muted)]">
                No family yet. Press <kbd>n</kbd> to add.
              </li>
            ) : (
              members.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetail(m.id);
                      }
                    }}
                    className="group flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-[color:var(--color-subtle)] focus:bg-[color:var(--color-subtle)] focus:outline-none"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                        "border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]",
                      )}
                    >
                      {initials(m.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {m.name}
                      </span>
                      {m.relationship && m.relationship !== "other" ? (
                        <span className="block truncate text-xs text-[color:var(--color-muted)]">
                          {relationshipLabel(m.relationship)}
                        </span>
                      ) : null}
                    </span>
                    {m.statusFlags.length > 0 ? (
                      <StatusGlyphs flags={m.statusFlags} />
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </aside>
  );
}

function StatusGlyphs({ flags }: { flags: string[] }) {
  return (
    <span className="flex items-center gap-1 text-xs text-[color:var(--color-muted)]">
      {flags.includes("deceased") ? <span title="deceased">†</span> : null}
      {flags.includes("estranged") ? <span title="estranged">⚡</span> : null}
      {flags.includes("lives with patient") ? (
        <span title="lives with patient">⌂</span>
      ) : null}
      {flags.includes("caretaker") ? <span title="caretaker">★</span> : null}
    </span>
  );
}
