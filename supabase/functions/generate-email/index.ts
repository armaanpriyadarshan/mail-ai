// generate-email — drafts a subject + body via OpenAI gpt-4o-mini.
import { preflight, json } from "../_shared/cors.ts";
import { getUserId } from "../_shared/supabase.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface GenBody {
  goal: string;
  context?: string;
  tone?: string;
}

const SYSTEM = `You write short, warm cold emails for non-technical users.
Constraints:
- 4-7 sentences max
- conversational, never markety
- subject under 60 chars
- one clear ask at the end
- use {first_name}, {company}, {title} as personalization tokens where natural
Return strict JSON: {"subject": "...", "body": "..."}.`;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const userId = await getUserId(req);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const { goal, context, tone } = (await req.json().catch(() => ({}))) as GenBody;
  if (!goal) return json({ error: "missing goal" }, { status: 400 });

  const userPrompt = [
    `Goal: ${goal}`,
    context ? `Context / offer: ${context}` : null,
    tone ? `Tone: ${tone}` : null,
  ].filter(Boolean).join("\n");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
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
  const completion = await res.json();
  const content = completion.choices?.[0]?.message?.content ?? "{}";
  let parsed: { subject?: string; body?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    return json({ error: "bad model output" }, { status: 502 });
  }
  return json({ subject: parsed.subject ?? "", body: parsed.body ?? "" });
});
