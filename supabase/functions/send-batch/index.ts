// send-batch — fired by pg_cron once a minute. Picks the next queued recipient(s)
// across users, respects per-user daily limits and randomized 30-60s spacing,
// sends via Gmail, updates row status. Stops on first Gmail error per user.
//
// Provisional. Untested. The cron interval, batch size, and spacing windows
// are first-pass guesses — tune based on real Gmail behavior.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, currentMonth } from "../_shared/supabase.ts";
import { sendGmail } from "../_shared/gmail.ts";
import { incrementUsage } from "../_shared/usage.ts";

// Hard cap per cron tick so a single tick can't spam.
const MAX_PER_TICK = 20;

// Fill {field_name} tokens using whatever is in the recipient's data jsonb.
// Unknown tokens collapse to empty strings rather than crash the send.
function fillTokens(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{([a-z0-9_]+)\}/g, (_, key) => {
    const v = data?.[key];
    return v == null ? "" : String(v);
  });
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const sb = adminClient();

  // Pull queued recipients joined to their campaign + profile.
  const { data: queued } = await sb
    .from("recipients")
    .select(
      "id, email, data, personalized_subject, personalized_body, campaign_id, campaigns!inner(id, user_id, status, subject_template, body_template)",
    )
    .eq("status", "queued")
    .in("campaigns.status", ["sending"])
    .limit(MAX_PER_TICK);

  if (!queued || queued.length === 0) return json({ ok: true, sent: 0 });

  // Group by user so we can enforce per-user daily limit and stop-on-error.
  const byUser = new Map<string, typeof queued>();
  for (const r of queued) {
    const uid = (r as any).campaigns.user_id as string;
    if (!byUser.has(uid)) byUser.set(uid, [] as any);
    byUser.get(uid)!.push(r as any);
  }

  let totalSent = 0;
  const month = currentMonth();

  for (const [uid, rows] of byUser) {
    const { data: profile } = await sb
      .from("profiles")
      .select("id, gmail_email, gmail_access_token, gmail_refresh_token, gmail_token_expires_at, daily_send_limit")
      .eq("id", uid)
      .single();
    if (!profile?.gmail_access_token) continue;

    const { data: usage } = await sb
      .from("usage")
      .select("emails_sent")
      .eq("user_id", uid)
      .eq("month", month)
      .maybeSingle();
    let sentToday = usage?.emails_sent ?? 0;

    for (const r of rows) {
      if (sentToday >= profile.daily_send_limit) break;
      const data = ((r as any).data ?? {}) as Record<string, unknown>;
      const subject = (r as any).personalized_subject ??
        fillTokens((r as any).campaigns.subject_template ?? "", data);
      const body = (r as any).personalized_body ??
        fillTokens((r as any).campaigns.body_template ?? "", data);

      try {
        await sendGmail(profile as any, (r as any).email, subject, body);
        await sb
          .from("recipients")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", (r as any).id);
        await incrementUsage(uid, "emails_sent", 1);
        sentToday++;
        totalSent++;

        // Randomized 30-60s spacing.
        const wait = 30_000 + Math.floor(Math.random() * 30_000);
        await new Promise((res) => setTimeout(res, wait));
      } catch (err) {
        await sb
          .from("recipients")
          .update({ status: "failed", error: String(err) })
          .eq("id", (r as any).id);
        // Stop processing this user on first error — retry next tick / next day.
        break;
      }
    }

    // Mark campaigns complete if no more queued recipients remain.
    const campaignIds = Array.from(new Set(rows.map((r) => (r as any).campaign_id)));
    for (const cid of campaignIds) {
      const { count } = await sb
        .from("recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", cid)
        .eq("status", "queued");
      if ((count ?? 0) === 0) {
        await sb.from("campaigns").update({ status: "completed" }).eq("id", cid);
      }
    }
  }

  return json({ ok: true, sent: totalSent });
});
