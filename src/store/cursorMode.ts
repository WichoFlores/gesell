import { create } from "zustand";

type CursorModeStore = {
  modeId: string | null;
  anchorBlock: number | null;
  activationPos: number | null;
  setMode: (
    id: string | null,
    anchorBlock?: number | null,
    activationPos?: number | null,
  ) => void;
};

export const useCursorMode = create<CursorModeStore>((set) => ({
  modeId: null,
  anchorBlock: null,
  activationPos: null,
  setMode: (modeId, anchorBlock = null, activationPos = null) =>
    set({
      modeId,
      anchorBlock: modeId ? anchorBlock : null,
      activationPos: modeId ? activationPos : null,
    }),
}));
