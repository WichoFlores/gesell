export type Relationship =
  | "grandparent"
  | "parent"
  | "parent-sibling"
  | "sibling"
  | "partner"
  | "cousin"
  | "child"
  | "sibling-child"
  | "grandchild"
  | "other";

export type Gender = "male" | "female" | "other";

export type RelationshipDef = {
  id: Relationship;
  label: string;
  level: number;
};

export const RELATIONSHIPS: RelationshipDef[] = [
  { id: "grandparent", label: "Grandparent", level: 2 },
  { id: "parent", label: "Parent", level: 1 },
  { id: "parent-sibling", label: "Aunt/Uncle", level: 1 },
  { id: "sibling", label: "Sibling", level: 0 },
  { id: "partner", label: "Partner", level: 0 },
  { id: "cousin", label: "Cousin", level: 0 },
  { id: "child", label: "Child", level: -1 },
  { id: "sibling-child", label: "Niece/Nephew", level: -1 },
  { id: "grandchild", label: "Grandchild", level: -2 },
  { id: "other", label: "Other", level: 0 },
];

const BY_ID = new Map(RELATIONSHIPS.map((r) => [r.id, r]));

export function relationshipLabel(id: Relationship | string | undefined): string {
  if (!id) return "";
  return BY_ID.get(id as Relationship)?.label ?? "Other";
}

export function relationshipLevel(id: Relationship | string | undefined): number {
  if (!id) return 0;
  return BY_ID.get(id as Relationship)?.level ?? 0;
}

export function isRelationship(v: unknown): v is Relationship {
  return typeof v === "string" && BY_ID.has(v as Relationship);
}

type LegacyMap = { rel: Relationship; gender?: Gender };

const LEGACY: Record<string, LegacyMap> = {
  mother: { rel: "parent", gender: "female" },
  mom: { rel: "parent", gender: "female" },
  mum: { rel: "parent", gender: "female" },
  father: { rel: "parent", gender: "male" },
  dad: { rel: "parent", gender: "male" },
  parent: { rel: "parent" },
  grandmother: { rel: "grandparent", gender: "female" },
  grandfather: { rel: "grandparent", gender: "male" },
  grandma: { rel: "grandparent", gender: "female" },
  grandpa: { rel: "grandparent", gender: "male" },
  grandparent: { rel: "grandparent" },
  brother: { rel: "sibling", gender: "male" },
  sister: { rel: "sibling", gender: "female" },
  sibling: { rel: "sibling" },
  partner: { rel: "partner" },
  spouse: { rel: "partner" },
  husband: { rel: "partner", gender: "male" },
  wife: { rel: "partner", gender: "female" },
  girlfriend: { rel: "partner", gender: "female" },
  boyfriend: { rel: "partner", gender: "male" },
  son: { rel: "child", gender: "male" },
  daughter: { rel: "child", gender: "female" },
  child: { rel: "child" },
  aunt: { rel: "parent-sibling", gender: "female" },
  uncle: { rel: "parent-sibling", gender: "male" },
  cousin: { rel: "cousin" },
  niece: { rel: "sibling-child", gender: "female" },
  nephew: { rel: "sibling-child", gender: "male" },
  grandson: { rel: "grandchild", gender: "male" },
  granddaughter: { rel: "grandchild", gender: "female" },
  grandchild: { rel: "grandchild" },
  friend: { rel: "other" },
};

export function migrateLegacyRelationship(raw: string | undefined): LegacyMap {
  if (!raw) return { rel: "other" };
  const key = raw.trim().toLowerCase();
  if (!key) return { rel: "other" };
  return LEGACY[key] ?? { rel: "other" };
}
