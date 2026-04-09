// personalize-emails — for each recipient in a campaign, ask gpt-4o-mini to rewrite
// the template into a warm, recipient-specific version. Writes back to the recipients table.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface Body {
  campaign_id: string;
}

const SYSTEM = `Rewrite the given email template so it feels written specifically for this recipient.
Keep it short (4-7 sentences), warm, and never markety. Don't invent facts about them.
Return strict JSON: {"subject": "...", "body": "..."}.`;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const userId = await getUserId(req);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const { campaign_id } = (await req.json().catch(() => ({}))) as Body;
  if (!campaign_id) return json({ error: "missing campaign_id" }, { status: 400 });

  const sb = adminClient();
  const { data: campaign, error: cErr } = await sb
    .from("campaigns")
    .select("*")
    .eq("id", campaign_id)
    .eq("user_id", userId)
    .single();
  if (cErr || !campaign) return json({ error: "campaign not found" }, { status: 404 });

  const { data: recipients } = await sb
    .from("recipients")
    .select("*")
    .eq("campaign_id", campaign_id)
    .eq("status", "queued");

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  let updated = 0;

  for (const r of recipients ?? []) {
    // Flatten the recipient's data jsonb into a readable list for the prompt.
    const dataLines = Object.entries((r as any).data ?? {})
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");
    const userPrompt = `Recipient:
- email: ${(r as any).email}
${dataLines || "(no extra fields)"}

Template subject: ${campaign.subject_template}
Template body:
${campaign.body_template}`;

    try {
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
      if (!res.ok) continue;
      const out = await res.json();
      const parsed = JSON.parse(out.choices?.[0]?.message?.content ?? "{}");
      await sb
        .from("recipients")
        .update({
          personalized_subject: parsed.subject ?? campaign.subject_template,
          personalized_body: parsed.body ?? campaign.body_template,
        })
        .eq("id", r.id);
      updated++;
    } catch (_) {
      // Skip on per-recipient failure; send-batch will fall back to the template.
    }
  }

  return json({ ok: true, updated });
});
