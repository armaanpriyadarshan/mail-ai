// Mirror of the Edge-side limits so the UI can render usage bars and gate inline.
// Provisional — keep in sync with supabase/functions/_shared/usage.ts.
export const LIMITS = {
  free: { emails: 50, leads: 100 },
  pro: { emails: 1000, leads: 2000 },
} as const;

export type Tier = keyof typeof LIMITS;
