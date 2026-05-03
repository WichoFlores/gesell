import type { JSONContent } from "@tiptap/core";

export type Patient = {
  id: string;
  name: string;
  age?: number;
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
  relationship: string;
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
