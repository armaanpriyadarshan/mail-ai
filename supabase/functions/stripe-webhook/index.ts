// stripe-webhook — flips users between free/pro on subscription events.
// Provisional. Signature verification is intentionally minimal here; tighten before launch.
import { json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405 });

  // TODO: verify Stripe-Signature with STRIPE_WEBHOOK_SECRET. Skipping for now.
  const event = await req.json().catch(() => null);
  if (!event) return json({ error: "bad payload" }, { status: 400 });

  const sb = adminClient();
  const type = event.type as string;
  const obj = event.data?.object ?? {};
  const customerId = obj.customer as string | undefined;
  if (!customerId) return json({ ok: true });

  const tier =
    type === "customer.subscription.created" || type === "customer.subscription.updated"
      ? obj.status === "active" || obj.status === "trialing"
        ? "pro"
        : "free"
      : type === "customer.subscription.deleted"
      ? "free"
      : null;

  if (tier) {
    await sb
      .from("profiles")
      .update({ subscription_tier: tier })
      .eq("stripe_customer_id", customerId);
  }

  return json({ ok: true });
});
