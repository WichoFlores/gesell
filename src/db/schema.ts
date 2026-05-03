import type { JSONContent } from "@tiptap/core";
import type { Gender, Relationship } from "@/lib/relationships";

export type Patient = {
  id: string;
  name: string;
  age?: number;
  gender?: Gender;
  education?: string;
  work?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type Session = {
  id: string;
  patientId: string;
  title: string;
  doc: JSONContent;
  createdAt: number;
  updatedAt: number;
};

export type FamilyMember = {
  id: string;
  patientId: string;
  name: string;
  relationship: Relationship;
  gender?: Gender;
  age?: number;
  statusFlags: string[];
  notes: string;
};

export type MarkDefinitionRow = {
  id: string;
  name: string;
  builtin: boolean;
  config: unknown;
};

export type SettingsRow = {
  key: string;
  value: unknown;
};
