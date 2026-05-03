import { create } from "zustand";

type CursorModeStore = {
  modeId: string | null;
  anchorBlock: number | null;
  setMode: (id: string | null, anchorBlock?: number | null) => void;
};

export const useCursorMode = create<CursorModeStore>((set) => ({
  modeId: null,
  anchorBlock: null,
  setMode: (modeId, anchorBlock = null) =>
    set({ modeId, anchorBlock: modeId ? anchorBlock : null }),
}));
