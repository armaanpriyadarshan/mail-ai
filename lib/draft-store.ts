// Cross-screen draft state for the new-campaign wizard.
import { create } from "zustand";
import type { Lead } from "./types";

interface DraftState {
  name: string;
  // User-defined field names — become personalization tokens and sheet columns.
  fields: string[];
  leads: Lead[];
  subject: string;
  body: string;
  aiPersonalize: boolean;

  set: (patch: Partial<Omit<DraftState, "set" | "reset" | "addLeads" | "removeLead" | "addField" | "removeField">>) => void;
  addField: (name: string) => void;
  removeField: (name: string) => void;
  addLeads: (rows: Lead[]) => void;
  removeLead: (email: string) => void;
  reset: () => void;
}

const initial: Omit<
  DraftState,
  "set" | "reset" | "addLeads" | "removeLead" | "addField" | "removeField"
> = {
  name: "",
  fields: ["first_name", "last_name"],
  leads: [],
  subject: "",
  body: "",
  aiPersonalize: false,
};

// Slugify a user-typed field name into a safe token key.
function slug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export const useDraft = create<DraftState>((set) => ({
  ...initial,
  set: (patch) => set(patch as any),
  addField: (name) =>
    set((s) => {
      const k = slug(name);
      if (!k || s.fields.includes(k)) return {};
      return { fields: [...s.fields, k] };
    }),
  removeField: (name) =>
    set((s) => ({
      fields: s.fields.filter((f) => f !== name),
      // Also prune that field from every existing lead so the sheet stays tidy.
      leads: s.leads.map((l) => {
        const { [name]: _removed, ...rest } = l.data;
        return { ...l, data: rest };
      }),
    })),
  addLeads: (rows) =>
    set((s) => {
      // Dedup by email.
      const existing = new Set(s.leads.map((l) => l.email.toLowerCase()));
      const fresh = rows.filter((r) => r.email && !existing.has(r.email.toLowerCase()));
      return { leads: [...s.leads, ...fresh] };
    }),
  removeLead: (email) =>
    set((s) => ({
      leads: s.leads.filter((l) => l.email.toLowerCase() !== email.toLowerCase()),
    })),
  reset: () => set({ ...initial }),
}));
