// create-checkout — creates a Stripe Checkout session for upgrading to Pro.
// Provisional. Stripe price IDs and success/cancel URLs need to be set as env vars.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripe(path: string, body: Record<string, string>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`stripe ${path}: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const userId = await getUserId(req);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const sb = adminClient();
  const { data: profile } = await sb
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe("/customers", { "metadata[user_id]": userId });
    customerId = customer.id;
    await sb.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  const session = await stripe("/checkout/sessions", {
    mode: "subscription",
    customer: customerId!,
    "line_items[0][price]": Deno.env.get("STRIPE_PRO_PRICE_ID")!,
    "line_items[0][quantity]": "1",
    success_url: Deno.env.get("STRIPE_SUCCESS_URL") ?? "mailai://settings?upgraded=1",
    cancel_url: Deno.env.get("STRIPE_CANCEL_URL") ?? "mailai://settings",
  });

  return json({ url: session.url });
});
