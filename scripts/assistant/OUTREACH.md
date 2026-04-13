# Engrams Cold Outreach Playbook

## Who is Armaan

Dartmouth undergraduate building Engrams — an AI tool that compiles scattered company knowledge into organized, queryable information.

## Outreach rules

### Targets
- **Roles (prioritized):** CTO, VP Engineering, Head of Engineering, Head of Product, VP Operations, Director of Operations, Chief of Staff, Head of Research, Research Director, VP Strategy, Director of Business Intelligence, Head of Documentation, Head of Developer Experience, Knowledge Manager, Director of Competitive Intelligence, COO, CPO
- **Industries (highest priority, most knowledge-scattered):**
  - Boutique M&A advisory firms (deal teams drown in scattered research, memos, and precedent transactions)
  - Paid newsletter writers and research publishers (their entire business is organizing and synthesizing knowledge)
  - Research analysts and equity research firms (scattered notes, models, and source materials)
  - Competitive intelligence firms (CI teams aggregate information from dozens of fragmented sources)
  - Policy and regulatory intelligence firms (tracking scattered regulatory changes across jurisdictions)
  - Market research boutiques (synthesizing qualitative and quantitative research from many sources)
  - B2B SaaS (particularly knowledge management, data, and productivity tools)
  - Defense tech and intelligence contractors
  - Biotech/pharma research
  - Healthtech
  - Consulting firms (knowledge/ops roles only, not partner classes)
- **Do NOT mass-email law firm partner classes or consulting partner classes.** These are not the target user. Only email people in knowledge-heavy operational roles.
- **Quality over volume.** Every recipient should plausibly have a scattered knowledge problem. Prioritize people who research, analyze, synthesize, or manage information as their core job.
- **Company size:** 50-500 employees
- **Priority:** 
  1. Dartmouth and Tuck alumni (highest priority)
  2. Ivy League graduates (Harvard, Yale, Princeton, Columbia, Penn, Brown, Cornell) at companies with high email deliverability
  3. Non-alumni at mid-size firms (50-500 employees) in target industries where email patterns are known to work
- **Diversity rule:** No more than 20% of a batch (100 of 500) should go to any single industry. Spread sends across B2B SaaS, defense tech, biotech, consulting, PE/VC ops, healthtech, and other target industries. Do NOT repeat the law firm partner class strategy.
- **Relevance rule:** Every recipient should plausibly benefit from a tool that organizes scattered company knowledge. Best targets: CTOs who manage technical documentation, Heads of Product who deal with cross-team knowledge, VPs of Operations who handle process documentation, and knowledge management leaders. Worst targets: litigators, salespeople, and pure finance roles with no operational component.
- **Confirmed-deliverable companies and their email patterns:**
  | Company | Domain | Pattern | Confirmed |
  |---------|--------|---------|-----------|
  | L.E.K. Consulting | lek.com | f.last@ (e.g. j.rutan@lek.com) | Yes, 100+ delivered |
  | Oliver Wyman | oliverwyman.com | first.last@ | Yes, 80+ delivered |
  | Goodwin Procter | goodwinprocter.com | flast@ (e.g. astemlar@) | Yes, 60+ delivered |
  | Wilson Elser | wilsonelser.com | flast@ (e.g. rgordon@) | Yes, 40+ delivered |
  | Kearney | kearney.com | first.last@ or b.last@ | Yes, 15+ delivered |
  | Foley & Lardner | foley.com | flast@ (e.g. clogullo@) | Yes, 10+ delivered |
  | Morgan Lewis | morganlewis.com | first.last@ or flast@ | Yes, verified |
  | Brightstar Capital | brightstarcp.com | flast@ | Yes, verified |
  | Edison Partners | edisonpartners.com | flast@ | Yes, verified |
  | THL Partners | thl.com | flast@ | Yes, verified |
  | Align Capital Partners | aligncp.com | flast@ | Yes, verified |
  | Fundstrat | fundstrat.com | first.last@ | Yes, verified |
  | Chainalysis | chainalysis.com | first.last@ | Yes, verified |
  | Arcus Biosciences | arcusbio.com | flast@ | Yes, verified |
  | Inovalon | inovalon.com | first.last@ or flast@ | Yes, verified |
  | Shield AI | shield.ai | first.last@ (accept_all) | Yes |
  | Anduril | anduril.com | first.last@ | Yes, delivered |
  | Indegene | indegene.com | first.last@ or tarun.mathur@ | Yes |
- **Confirmed-bouncing companies (do NOT send):**
  Huron Consulting, FTI Consulting, Alvarez & Marsal, Rebellion Defense, Recorded Future, Formation Bio, Xaira Therapeutics, Harbor Global, Simon-Kucher, Roland Berger, Summit Partners, Norwest Venture Partners, Corient, Guidepost Growth Equity, Olympus Partners, D.E. Shaw, Lone Pine Capital, Morgan Stanley, Goldman Sachs, BDT & MSD, all big banks, all mega hedge funds, YouTube/Google, Amazon, ServiceNow, Smartsheet
- **Best strategy for volume:** Scrape official partner/promotion announcements from confirmed-deliverable companies using WebFetch. These yield 30-60 verified names per company with known email patterns. This is far more efficient than guessing both person and pattern.
- **Avoid:** Fortune 500, big banks, mega hedge funds, and large tech companies. These reject pattern-guessed emails.

### Email format
- Subject: 5 words max, reference their company or role
- Body: under 50 words
- Introduce Armaan as a Dartmouth undergrad building an AI tool that compiles scattered company knowledge into something organized and queryable
- Express curiosity about their perspective given their role and company
- Do NOT posit how the tool could help their specific company. Just describe what it does.
- Ask if they're free for a call anytime in the next week
- Sign off with "Thanks," then "Armaan" on the next line
- Do NOT use em dashes anywhere
- Do NOT be peppy or forced about Dartmouth connections. If they're an alum, don't call it out explicitly. The Dartmouth mention in the intro is enough.

### Tone
Brief, respectful, understated. A student genuinely curious, not pitching anything. No jargon. No buzzwords. No exclamation marks. No em dashes. Plain and human.

### Email finding workflow

Hunter.io has limited credits. Use it sparingly. Prefer confident guesses over burning API calls.

**Step 1: Find the email**
1. Use Hunter.io to guess: `python3 scripts/assistant/guess-email.py "First Last" domain.com`
2. If Hunter is rate-limited or returns nothing, fall back to common patterns:
   - first@domain.com
   - first.last@domain.com
   - firstlast@domain.com
   - flast@domain.com
   - first.l@domain.com

**Step 2: Verify before sending**
1. Always verify with Hunter when credits are available: `python3 scripts/assistant/verify-email.py guessed@domain.com`
2. Only send to addresses that come back as "valid" or "accept_all"
3. If Hunter credits are exhausted, send to the top 2 most likely patterns

**Step 3: Send**
`gog gmail send --to verified@domain.com --subject "..." --body "..."`

**Step 4: Retry on bounce (up to 5 attempts per person)**
When an email bounces, Gmail receives a reply from `mailer-daemon@googlemail.com` (Mail Delivery Subsystem) with the subject `Delivery Status Notification (Failure)`. These land in the inbox and are the authoritative signal that an address failed — don't guess at deliverability, read the bounces.

After sending a batch, wait ~30 seconds for bounces to arrive, then check:
```bash
gog gmail messages search 'from:mailer-daemon@googlemail.com subject:"Delivery Status Notification"' --max 200
```

To extract the failed recipient from a specific bounce, read the message and grep for the email address:
```bash
gog gmail get <messageId> | grep -oE '[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+' | grep -v dartmouth.edu | grep -v googlemail.com | grep -v mailer-daemon
```

For each bounced address:
1. Extract the failed recipient from the bounce message
2. Try the next pattern from the list (first, first.last, firstlast, flast, first.l)
3. Re-send to the new pattern
4. Repeat until one lands OR you've tried 5 distinct patterns for that person
5. After 5 failed attempts, give up on that person and log them as `unreachable`

**Step 5: Log**
After each send, append the contact to `scripts/assistant/outreach-log.csv` with columns:
`name,role,company,email,date_sent,verified`

After bounce checks, update the `verified` column:
- `BOUNCED` — the address bounced
- `delivered` — sent and no bounce received
- `unreachable` — all 5 patterns exhausted

### Example email

**Subject:** Quick question, Oliver Wyman

**Body:**
Hi Sarah,

I'm a Dartmouth undergrad building an AI tool that compiles a company's scattered knowledge into something organized and queryable. Curious to hear your perspective as a director of knowledge management at Oliver Wyman. Would you be free for a call anytime in the next week?

Thanks,
Armaan
