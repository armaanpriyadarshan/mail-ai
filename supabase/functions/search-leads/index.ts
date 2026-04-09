// search-leads — proxies Apollo.io /people/search.
// Provisional. Apollo's response shape may differ from what this assumes — verify before relying on it.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";
import { getUsageAndTier, incrementUsage } from "../_shared/usage.ts";

const APOLLO_URL = "https://api.apollo.io/api/v1/mixed_people/search";

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

  try {
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
    const apolloKey = Deno.env.get("APOLLO_API_KEY");
    if (!apolloKey) {
      console.error("search-leads: APOLLO_API_KEY is not set");
      return json({ error: "server misconfig", details: "APOLLO_API_KEY missing" }, { status: 500 });
    }

    const requestBody = {
      q_keywords: body.query,
      person_titles: body.filters?.job_titles,
      person_locations: body.filters?.location ? [body.filters.location] : undefined,
      organization_num_employees_ranges: body.filters?.company_size
        ? [body.filters.company_size]
        : undefined,
      page: 1,
      per_page: body.per_page ?? 25,
    };
    console.log("search-leads: calling Apollo", { query: body.query });

    const res = await fetch(APOLLO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apolloKey,
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await res.text();
    if (!res.ok) {
      console.error("search-leads: apollo error", res.status, rawText);
      return json({ error: "apollo failed", details: `${res.status} ${rawText}` }, { status: 502 });
    }

    let apollo: Record<string, unknown>;
    try {
      apollo = JSON.parse(rawText);
    } catch {
      console.error("search-leads: apollo returned non-JSON", rawText.slice(0, 200));
      return json({ error: "apollo bad json", details: rawText.slice(0, 200) }, { status: 502 });
    }

    // Normalize. Apollo's mixed_people_search returns `people` (and sometimes `contacts`).
    const peopleArr = ((apollo.people as any[]) ?? (apollo.contacts as any[]) ?? []);
    console.log(`search-leads: got ${peopleArr.length} people from Apollo`);

    const leads = peopleArr
      .filter((p: any) => !!p.email)
      .map((p: Record<string, unknown>) => {
        const data: Record<string, string> = {};
        if (p.first_name) data.first_name = String(p.first_name);
        if (p.last_name) data.last_name = String(p.last_name);
        if (p.title) data.title = String(p.title);
        const company =
          (p.organization as { name?: string } | undefined)?.name ??
          (p.organization_name as string | undefined);
        if (company) data.company = String(company);
        return { email: String(p.email).toLowerCase(), data };
      });

    // Persist to cache + bump usage.
    await sb.from("leads_cache").insert({
      query_hash: queryHash,
      query_text: body.query,
      results: leads,
    });
    await incrementUsage(userId, "leads_searched", leads.length);

    return json({ leads, cached: false });
  } catch (err) {
    console.error("search-leads: unexpected error", err);
    return json(
      { error: "unexpected", details: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
});
