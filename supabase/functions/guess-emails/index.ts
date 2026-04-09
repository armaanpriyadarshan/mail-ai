// guess-emails — given a list of {name, company} pairs, uses gpt-4o-mini to
// guess the most likely corporate email for each using common patterns
// (first.last@, flast@, first@, etc.) and the company's likely domain.
//
// Provisional. The model will invent addresses — these are GUESSES, not verified.
import { preflight, json } from "../_shared/cors.ts";
import { getUserId } from "../_shared/supabase.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface Body {
  contacts: { name: string; company?: string }[];
}

const SYSTEM = `You guess corporate email addresses from names + company names.
For each input, return the most likely work email using common patterns
(first.last@domain, flast@domain, first@domain, etc.). Infer the domain from
the company name — prefer the bare corporate domain (e.g. acme.com, not
acme.io unless you're confident). If you have no reasonable guess, omit that
entry from the output.

Return strict JSON: {"leads":[{"first_name":"","last_name":"","company":"","email":""}]}`;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!Array.isArray(body.contacts) || body.contacts.length === 0) {
      return json({ error: "missing contacts" }, { status: 400 });
    }
    if (body.contacts.length > 50) {
      return json({ error: "too many contacts (max 50)" }, { status: 400 });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "server misconfig" }, { status: 500 });

    const userPrompt =
      "Contacts:\n" +
      body.contacts
        .map(
          (c, i) => `${i + 1}. ${c.name}${c.company ? ` — ${c.company}` : ""}`,
        )
        .join("\n");

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      return json({ error: "openai failed", details: await res.text() }, { status: 502 });
    }
    const out = await res.json();
    const content = out.choices?.[0]?.message?.content ?? "{}";
    let parsed: { leads?: any[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return json({ error: "bad model output" }, { status: 502 });
    }

    const leads = (parsed.leads ?? [])
      .filter((l: any) => l?.email)
      .map((l: any) => {
        const data: Record<string, string> = {};
        if (l.first_name) data.first_name = String(l.first_name);
        if (l.last_name) data.last_name = String(l.last_name);
        if (l.company) data.company = String(l.company);
        return { email: String(l.email).toLowerCase(), data };
      });

    return json({ leads });
  } catch (err) {
    console.error("guess-emails error", err);
    return json(
      { error: "unexpected", details: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
});
