import { nanoid } from "nanoid";
import { db } from "./index";
import type { FamilyMember } from "./schema";

export async function listFamilyForPatient(
  patientId: string,
): Promise<FamilyMember[]> {
  return db.family_members.where("patientId").equals(patientId).sortBy("name");
}

export async function createFamilyMember(
  patientId: string,
  init: Partial<FamilyMember> = {},
): Promise<FamilyMember> {
  const member: FamilyMember = {
    id: nanoid(10),
    patientId,
    name: init.name?.trim() || "New person",
    relationship: init.relationship ?? "",
    age: init.age,
    statusFlags: init.statusFlags ?? [],
    notes: init.notes ?? "",
  };
  await db.family_members.add(member);
  return member;
}

export async function updateFamilyMember(
  id: string,
  changes: Partial<Omit<FamilyMember, "id" | "patientId">>,
): Promise<void> {
  await db.family_members.update(id, changes);
}

export async function deleteFamilyMember(id: string): Promise<void> {
  await db.family_members.delete(id);
}
