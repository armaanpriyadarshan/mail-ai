// Usage tracking + tier gating. Provisional limits — adjust before launch.
import { adminClient, currentMonth } from "./supabase.ts";

export const LIMITS = {
  free: { emails: 50, leads: 100 },
  pro: { emails: 1000, leads: 2000 },
} as const;

export type Tier = keyof typeof LIMITS;

export async function getUsageAndTier(userId: string) {
  const sb = adminClient();
  const month = currentMonth();
  const [{ data: profile }, { data: usage }] = await Promise.all([
    sb.from("profiles").select("subscription_tier").eq("id", userId).single(),
    sb.from("usage").select("*").eq("user_id", userId).eq("month", month).maybeSingle(),
  ]);
  const tier: Tier = (profile?.subscription_tier as Tier) ?? "free";
  return {
    tier,
    limits: LIMITS[tier],
    emails_sent: usage?.emails_sent ?? 0,
    leads_searched: usage?.leads_searched ?? 0,
  };
}

export async function incrementUsage(
  userId: string,
  field: "emails_sent" | "leads_searched",
  by = 1,
) {
  const sb = adminClient();
  const month = currentMonth();
  // Upsert + increment. Done as RPC-less for simplicity.
  const { data: existing } = await sb
    .from("usage")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  if (!existing) {
    await sb.from("usage").insert({
      user_id: userId,
      month,
      emails_sent: field === "emails_sent" ? by : 0,
      leads_searched: field === "leads_searched" ? by : 0,
    });
  } else {
    await sb
      .from("usage")
      .update({ [field]: (existing[field] ?? 0) + by })
      .eq("user_id", userId)
      .eq("month", month);
  }
}
