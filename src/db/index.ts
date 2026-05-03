import Dexie, { type Table } from "dexie";
import type {
  FamilyMember,
  MarkDefinitionRow,
  Patient,
  Session,
  SettingsRow,
} from "./schema";

class TherapyNotesDB extends Dexie {
  patients!: Table<Patient, string>;
  sessions!: Table<Session, string>;
  family_members!: Table<FamilyMember, string>;
  mark_definitions!: Table<MarkDefinitionRow, string>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super("therapy-notes");
    this.version(1).stores({
      patients: "id, name, updatedAt, createdAt",
      sessions: "id, patientId, updatedAt, createdAt, [patientId+updatedAt]",
      family_members: "id, patientId, name, [patientId+name]",
      mark_definitions: "id, name, builtin",
      settings: "key",
    });
  }
}

export const db = new TherapyNotesDB();

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}
