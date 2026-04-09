// search-leads — proxies Apollo.io /people/search.
// Provisional. Apollo's response shape may differ from what this assumes — verify before relying on it.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";
import { getUsageAndTier, incrementUsage } from "../_shared/usage.ts";

const APOLLO_URL = "https://api.apollo.io/v1/mixed_people/search";

interface SearchBody {
  query: string;
  filters?: {
    location?: string;
    company_size?: string;
    job_titles?: string[];
  };
  per_page?: number;
}

async function hashQuery(input: unknown): Promise<string> {
  const enc = new TextEncoder().encode(JSON.stringify(input));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const userId = await getUserId(req);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as SearchBody;
  if (!body.query) return json({ error: "missing query" }, { status: 400 });

  // Gate by tier.
  const usage = await getUsageAndTier(userId);
  if (usage.leads_searched >= usage.limits.leads) {
    return json(
      { error: "lead_limit_reached", limit: usage.limits.leads, tier: usage.tier },
      { status: 402 },
    );
  }

  const sb = adminClient();
  const queryHash = await hashQuery({ q: body.query, f: body.filters ?? {} });

  // Cache check.
  const { data: cached } = await sb
    .from("leads_cache")
    .select("results")
    .eq("query_hash", queryHash)
    .maybeSingle();
  if (cached) {
    return json({ leads: cached.results, cached: true });
  }

  // Apollo call.
  const apolloKey = Deno.env.get("APOLLO_API_KEY")!;
  const res = await fetch(APOLLO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apolloKey,
    },
    body: JSON.stringify({
      q_keywords: body.query,
      person_titles: body.filters?.job_titles,
      person_locations: body.filters?.location ? [body.filters.location] : undefined,
      organization_num_employees_ranges: body.filters?.company_size
        ? [body.filters.company_size]
        : undefined,
      page: 1,
      per_page: body.per_page ?? 25,
    }),
  });
  if (!res.ok) {
    return json({ error: "apollo failed", details: await res.text() }, { status: 502 });
  }
  const apollo = await res.json();

  // Normalize. Provisional shape — Apollo may return different field names.
  const leads = (apollo.people ?? []).map((p: Record<string, unknown>) => ({
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    title: p.title,
    company: (p.organization as { name?: string } | undefined)?.name,
    linkedin_url: p.linkedin_url,
  }));

  // Persist to cache + bump usage.
  await sb.from("leads_cache").insert({
    query_hash: queryHash,
    query_text: body.query,
    results: leads,
  });
  await incrementUsage(userId, "leads_searched", leads.length);

  return json({ leads, cached: false });
});
