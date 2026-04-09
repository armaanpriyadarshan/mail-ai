// Cross-screen draft state for the new-campaign wizard.
// Lives in Zustand because the wizard spans 3 routes and persisting a partial draft
// to the DB on every step would be noisy.
import { create } from "zustand";
import type { Lead } from "./types";

interface DraftState {
  name: string;
  audienceQuery: string;
  filters: { location?: string; companySize?: string; jobTitles?: string };
  leads: Lead[];
  selected: Set<string>; // selected by email
  subject: string;
  body: string;
  aiPersonalize: boolean;

  set: (patch: Partial<Omit<DraftState, "set" | "reset" | "toggleSelected">>) => void;
  toggleSelected: (email: string) => void;
  reset: () => void;
}

const initial = {
  name: "",
  audienceQuery: "",
  filters: {},
  leads: [],
  selected: new Set<string>(),
  subject: "",
  body: "",
  aiPersonalize: false,
};

export const useDraft = create<DraftState>((set) => ({
  ...initial,
  set: (patch) => set(patch as any),
  toggleSelected: (email) =>
    set((s) => {
      const next = new Set(s.selected);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return { selected: next };
    }),
  reset: () => set({ ...initial, selected: new Set() }),
}));
