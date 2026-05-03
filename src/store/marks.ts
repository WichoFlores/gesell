import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { create } from "zustand";
import { db } from "@/db";
import { listMarkDefinitions } from "@/db/marks";
import type { MarkDefinition } from "@/marks/types";

type MarksState = {
  defs: MarkDefinition[];
  setDefs: (defs: MarkDefinition[]) => void;
};

export const useMarks = create<MarksState>((set) => ({
  defs: [],
  setDefs: (defs) => set({ defs }),
}));

export function useHydrateMarks() {
  const setDefs = useMarks((s) => s.setDefs);
  const defs = useLiveQuery(() => listMarkDefinitions(), [], []);
  useEffect(() => {
    if (defs && defs.length) setDefs(defs);
  }, [defs, setDefs]);
}

export async function refreshMarksOnce() {
  const defs = await listMarkDefinitions();
  useMarks.setState({ defs });
}

export function useMarkDefs() {
  return useMarks((s) => s.defs);
}

// useLiveQuery imported only for the hydrate hook — keep db reference live so Dexie subscription stays attached
void db;
