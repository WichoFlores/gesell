import { nanoid } from "nanoid";
import type { JSONContent } from "@tiptap/core";
import { db } from "./index";
import type { Session } from "./schema";
import { todayDdMmYyyy } from "@/lib/date";

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export async function listSessionsForPatient(
  patientId: string,
): Promise<Session[]> {
  return db.sessions
    .where("[patientId+updatedAt]")
    .between([patientId, Dexie_minKey], [patientId, Dexie_maxKey])
    .reverse()
    .toArray();
}

const Dexie_minKey = -Infinity;
const Dexie_maxKey = Infinity;

export async function getMostRecentSessionId(
  patientId: string,
): Promise<string | null> {
  const sessions = await listSessionsForPatient(patientId);
  return sessions[0]?.id ?? null;
}

export async function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id);
}

export async function createSession(patientId: string): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    id: nanoid(10),
    patientId,
    title: todayDdMmYyyy(),
    doc: EMPTY_DOC,
    createdAt: now,
    updatedAt: now,
  };
  await db.sessions.add(session);
  return session;
}

export async function saveSessionDoc(
  id: string,
  doc: JSONContent,
): Promise<void> {
  await db.sessions.update(id, { doc, updatedAt: Date.now() });
}

export async function renameSession(id: string, title: string): Promise<void> {
  await db.sessions.update(id, { title: title.trim(), updatedAt: Date.now() });
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}
