# Engrams Cold Outreach Playbook

## Who is Armaan

Dartmouth undergraduate building Engrams — an AI tool that compiles scattered company knowledge into organized, queryable information.

## Outreach rules

### Targets
- **Roles:** Head of Engineering, VP Engineering, CTO, Chief of Staff, Head of Research, Research Director, Head of Product, VP Operations, Director of Operations, Managing Partner, General Counsel, Head of People, VP Strategy, Director of Business Intelligence, Head of Documentation, Head of Developer Experience, VP Legal, Knowledge Manager, Director of Competitive Intelligence, Head of Investor Relations, Portfolio Manager, Deal Lead
- **Industries:** B2B SaaS, consulting (LEK, Oliver Wyman, Kearney, FTI), law firms, VC, PE, hedge funds, family offices, wealth management, commercial real estate, biotech/pharma research, defense/intel contractors, policy think tanks, crypto/web3 research, professional services, insurance, healthcare admin, accounting, architecture/engineering firms
- **Company size:** 50-500 employees
- **Priority:** STRICT preference for Dartmouth and Tuck alumni. Before adding anyone to an outreach batch, verify their Dartmouth/Tuck affiliation via LinkedIn, alumni directories, bio pages, or credible sources. Only fall back to non-alumni targets when alumni options are exhausted for a given role/industry. When in doubt, skip.

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
