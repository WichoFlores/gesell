import { nanoid } from "nanoid";
import { db } from "./index";
import type { Patient } from "./schema";
import { getMostRecentSessionId } from "./sessions";

export async function listPatients(): Promise<Patient[]> {
  return db.patients.orderBy("updatedAt").reverse().toArray();
}

export async function createPatient(name: string): Promise<Patient> {
  const now = Date.now();
  const patient: Patient = {
    id: nanoid(10),
    name: name.trim() || "Untitled patient",
    createdAt: now,
    updatedAt: now,
  };
  await db.patients.add(patient);
  return patient;
}

export async function updatePatient(
  id: string,
  changes: Partial<Omit<Patient, "id" | "createdAt">>,
): Promise<void> {
  await db.patients.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deletePatient(id: string): Promise<void> {
  await db.transaction(
    "rw",
    db.patients,
    db.sessions,
    db.family_members,
    async () => {
      await db.sessions.where("patientId").equals(id).delete();
      await db.family_members.where("patientId").equals(id).delete();
      await db.patients.delete(id);
    },
  );
}

export async function getPatientCascadeCounts(
  id: string,
): Promise<{ sessions: number; family: number }> {
  const [sessions, family] = await Promise.all([
    db.sessions.where("patientId").equals(id).count(),
    db.family_members.where("patientId").equals(id).count(),
  ]);
  return { sessions, family };
}

export async function deletePatientAndPickNext(
  id: string,
): Promise<{ patientId: string; sessionId: string | null }> {
  await deletePatient(id);
  const next = await db.patients.orderBy("updatedAt").reverse().first();
  const patientId = next
    ? next.id
    : (await createPatient("Untitled patient")).id;
  const sessionId = await getMostRecentSessionId(patientId);
  return { patientId, sessionId };
}
