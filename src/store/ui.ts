import { create } from "zustand";
import { setSetting } from "@/db";

type View = "editor" | "settings" | "bio";

type UIState = {
  view: View;
  activePatientId: string | null;
  activeSessionId: string | null;
  saveStatus: "idle" | "saving" | "saved";
  patientSwitcherOpen: boolean;
  familyPanelOpen: boolean;
  familyDetailId: string | null;
  setView: (view: View) => void;
  setActivePatient: (id: string | null) => void;
  setActiveSession: (id: string | null) => void;
  setSaveStatus: (s: "idle" | "saving" | "saved") => void;
  openPatientSwitcher: () => void;
  closePatientSwitcher: () => void;
  toggleFamilyPanel: () => void;
  closeFamilyPanel: () => void;
  openFamilyDetail: (id: string | null) => void;
};

export const useUI = create<UIState>((set, get) => ({
  view: "editor",
  activePatientId: null,
  activeSessionId: null,
  saveStatus: "idle",
  patientSwitcherOpen: false,
  familyPanelOpen: false,
  familyDetailId: null,
  setView: (view) => set({ view }),
  setActivePatient: (id) => {
    set({
      activePatientId: id,
      familyPanelOpen: false,
      familyDetailId: null,
    });
    if (id) void setSetting("lastOpenedPatientId", id);
  },
  setActiveSession: (id) => {
    set({ activeSessionId: id });
    if (id) void setSetting("lastOpenedSessionId", id);
  },
  setSaveStatus: (s) => {
    if (get().saveStatus !== s) set({ saveStatus: s });
  },
  openPatientSwitcher: () => set({ patientSwitcherOpen: true }),
  closePatientSwitcher: () => set({ patientSwitcherOpen: false }),
  toggleFamilyPanel: () =>
    set((s) => ({
      familyPanelOpen: !s.familyPanelOpen,
      familyDetailId: !s.familyPanelOpen ? s.familyDetailId : null,
    })),
  closeFamilyPanel: () => set({ familyPanelOpen: false, familyDetailId: null }),
  openFamilyDetail: (id) => set({ familyDetailId: id }),
}));
