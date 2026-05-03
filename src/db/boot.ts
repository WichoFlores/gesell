import { db, getSetting } from "./index";
import { createPatient } from "./patients";
import { getMostRecentSessionId } from "./sessions";
import { seedMarkDefinitions } from "./marks";

let bootPromise: Promise<{
  patientId: string;
  sessionId: string | null;
}> | null = null;

export function bootstrapApp(): Promise<{
  patientId: string;
  sessionId: string | null;
}> {
  if (!bootPromise) bootPromise = doBootstrap();
  return bootPromise;
}

async function doBootstrap(): Promise<{
  patientId: string;
  sessionId: string | null;
}> {
  await seedMarkDefinitions();

  let patientId = await getSetting<string>("lastOpenedPatientId");
  let exists = patientId
    ? !!(await db.patients.get(patientId))
    : false;

  if (!exists) {
    const anyPatient = await db.patients.orderBy("updatedAt").reverse().first();
    if (anyPatient) {
      patientId = anyPatient.id;
      exists = true;
    }
  }

  if (!exists) {
    const fresh = await createPatient("Untitled patient");
    patientId = fresh.id;
  }

  const pid = patientId!;

  let sessionId: string | null =
    (await getSetting<string>("lastOpenedSessionId")) ?? null;
  const session = sessionId ? await db.sessions.get(sessionId) : undefined;
  if (!session || session.patientId !== pid) {
    sessionId = await getMostRecentSessionId(pid);
  }

  return { patientId: pid, sessionId };
}
