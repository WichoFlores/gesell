import { db } from "./index";
import { DEFAULT_MARK_DEFINITIONS } from "@/marks/defaults";
import type { MarkDefinition } from "@/marks/types";
import type { MarkDefinitionRow } from "./schema";

export async function listMarkDefinitions(): Promise<MarkDefinition[]> {
  const rows = await db.mark_definitions.toArray();
  return rows.map(rowToDef);
}

export async function updateMarkColor(id: string, color: string): Promise<void> {
  const row = await db.mark_definitions.get(id);
  if (!row) return;
  const def = rowToDef(row);
  await db.mark_definitions.put(defToRow({ ...def, color }));
}

export async function seedMarkDefinitions(): Promise<void> {
  await db.transaction("rw", db.mark_definitions, async () => {
    for (const def of DEFAULT_MARK_DEFINITIONS) {
      const existing = await db.mark_definitions.get(def.id);
      if (!existing) await db.mark_definitions.put(defToRow(def));
    }
  });
}

function rowToDef(row: MarkDefinitionRow): MarkDefinition {
  return {
    ...(row.config as MarkDefinition),
    id: row.id,
    name: row.name,
    builtin: row.builtin,
  };
}

function defToRow(def: MarkDefinition): MarkDefinitionRow {
  return {
    id: def.id,
    name: def.name,
    builtin: def.builtin,
    config: def,
  };
}
