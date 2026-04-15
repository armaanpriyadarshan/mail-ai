# DTC Agentic Commerce Outreach Playbook

## Who is Armaan

Dartmouth undergrad helping DTC brands prepare for the era of agentic commerce — where buyers increasingly ask AI agents (ChatGPT, Perplexity, Claude, Gemini) for product recommendations instead of searching Google or scrolling Instagram. Brands that don't show up in those answers lose discovery they never knew they had.

## The pitch (short version)

The discovery surface is shifting from search and social to AI agents. When a buyer asks ChatGPT "best electrolyte drink for endurance athletes" or "skincare for sensitive combination skin in my 30s," a small set of brands get named. Most DTC brands have never checked whether they're in that set, and most of them aren't. The cold message exists to make that fact visceral.

## Outreach rules

### Targets

- **Roles (prioritized):** Founder, Co-Founder, CEO, CMO, Head of Growth, Head of Brand, VP Marketing, Head of Ecommerce, Head of Digital. Founder-led brands first — they feel category positioning anxiety the most.
- **Brand profile:**
  - DTC consumer brands selling physical product (food/bev, supplements, beauty, skincare, apparel, home, pet, baby, wellness, fitness gear, kitchen)
  - $5M–$200M revenue range — big enough to feel competitive pressure, small enough that the founder reads their own inbox
  - Sells primarily through Shopify, their own site, and/or Amazon — not pure wholesale, not pure marketplace
  - Has a real category they compete in (i.e. a buyer would ask an AI agent "best X" and the brand should plausibly be in the answer)
- **Avoid:**
  - SaaS, B2B, services, agencies, consultancies — wrong category entirely
  - Mega-brands (Nike, Allbirds, Glossier, Warby Parker tier) — they have GEO teams already
  - Pre-revenue or hobby brands — no urgency
  - Marketplaces, aggregators, retailers reselling other brands
  - Anything where AI discovery isn't a plausible buying motion

### The personalization is the pitch

Every email demonstrates the problem before the recipient even replies. Workflow per prospect:

1. Identify the brand's primary category and 2–3 buyer personas
2. Pick 2–3 buyer prompts a real customer would ask an AI agent. Prefer specific over generic. Examples:
   - "best magnesium supplement for sleep"
   - "non-toxic deodorant for sensitive skin under $20"
   - "best dog food for senior labs with allergies"
3. Run those prompts in **at least two** LLMs (ChatGPT, Perplexity, Claude, or Gemini)
4. Record verbatim what brands the agent recommended
5. Note whether the prospect's brand was named, ranked low, or absent. Note which competitors got named instead.
6. The email references that result directly — not "I think you might have a problem" but "I asked ChatGPT [exact prompt] and it recommended X, Y, Z. You weren't there."

If the brand IS named prominently in every result, **don't send**. They don't have the problem yet, and the message will land flat. Move on.

### Email format

- **Subject:** `Quick question, {Brand Name}` — exactly that, no variations
- **Body template** (use this exact structure, don't paraphrase):

```
Hi {first name},

I searched up {category descriptor — e.g. "brands that sell magnesium supplements for sleep"} on ChatGPT, Perplexity, etc. {Brand} didn't show up. I'm Armaan, a Dartmouth student working on how AI platforms decide which products to recommend to users. Would love 15 minutes to show you what I found. Are you free anytime soon?

Thanks,
Armaan
```

- Sign off with `Thanks,` then `Armaan` on the next line
- Plain text. No em dashes. No exclamation marks. No buzzwords ("synergy", "leverage", "solutions"). No "I noticed your amazing brand". No hype.
- Keep the line breaks: blank line after greeting, blank line before sign-off.
- The {category descriptor} should sound like a real buyer's query, not a marketing taxonomy. "brands that sell non-toxic deodorant for sensitive skin" beats "the personal care category."

### Tone

Direct, slightly clinical. Three sentences in the body; the absence does the emotional work. A founder reading it should think "wait, is that real?" and reply to find out.

### Example email

**Subject:** Quick question, Hydrant

**Body:**
Hi John,

I searched up brands that sell electrolyte mixes for daily hydration without sugar on ChatGPT, Perplexity, etc. Hydrant didn't show up. I'm Armaan, a Dartmouth student working on how AI platforms decide which products to recommend to users. Would love 15 minutes to show you what I found. Are you free anytime soon?

Thanks,
Armaan

---

## Workflow

### Step 1: Find the brand and the founder
- Source brands from: ProductHunt, Shopify Top Stores, Glossy / Modern Retail / Retail Brew newsletters, DTC Twitter, /r/DTC, Crunchbase consumer filters, "fastest growing DTC brands" lists
- Find the founder via the brand's About page, LinkedIn, or press coverage. Confirm they're still active at the company.

### Step 2: Run the LLM queries
- Use ChatGPT and Perplexity at minimum. Add Claude and Gemini if the result in the first two is ambiguous.
- Record: the exact prompt, which LLM, the brands that got recommended, the prospect brand's position (named / not named / mentioned only when prompted again).
- If the brand shows up well in every query, skip them — they aren't the target.

### Step 3: Find the email
1. Try Hunter: `python3 scripts/assistant/guess-email.py "First Last" domain.com`
2. If Hunter is rate-limited, fall back to common patterns:
   - first@domain.com
   - first.last@domain.com
   - firstlast@domain.com
   - flast@domain.com

### Step 4: Verify before sending
1. When credits exist: `python3 scripts/assistant/verify-email.py guessed@domain.com`
2. Only send to `valid` or `accept_all`
3. If credits are out, send to the top 2 most likely patterns

### Step 5: Send
```
gog gmail send --to verified@domain.com --subject "Quick question, {Brand}" --body "..."
```

### Step 6: Retry on bounce (up to 5 attempts per founder)
Bounces come from `mailer-daemon@googlemail.com` with subject `Delivery Status Notification (Failure)`. After a batch, wait ~30s and check:
```bash
gog gmail messages search 'from:mailer-daemon@googlemail.com subject:"Delivery Status Notification"' --max 200
```

For each bounce: try the next pattern, re-send. Give up after 5 patterns and log as `unreachable`.

### Step 7: Log
Append to `scripts/assistant/outreach-log.csv` with columns:
`name,role,brand,domain,email,date_sent,verified,llm_evidence`

`llm_evidence` is a short tag like `chatgpt-absent-perplexity-absent` or `chatgpt-rank4-perplexity-named`. Enough to know later why we sent.

After bounce checks, update `verified`:
- `BOUNCED` — bounced
- `delivered` — sent, no bounce
- `unreachable` — 5 patterns exhausted

---

## Hard rules

- **No sending without LLM evidence.** If you didn't run the queries, you don't have the email. The personalization IS the campaign.
- **No sending to brands that are already winning AI discovery.** They'll think we're wrong and ignore us.
- **No duplicate sends.** Check `outreach-log.csv` for the brand and email before queuing.
- **No mega-brands, no B2B, no agencies.** DTC consumer brands selling physical product, $5M–$200M, founder-led.
- **No em dashes. No exclamation marks. No buzzwords. No flattery.**
- **Subject line is always exactly:** `Quick question, {Brand Name}`
- **Prior Engrams sends are archived in `engrams-outreach-log.csv`.** That campaign is closed. Do not reference Engrams in any new outreach.
