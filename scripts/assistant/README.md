# Email Assistant for Claude Code

Personal email automation toolkit.

## Setup

### 1. Environment variables

Set these before running any commands. Store them in a local `.env` file (gitignored), your shell rc, or export them per-session:

```bash
export HUNTER_API_KEY="<your hunter.io api key>"
export GOG_KEYRING_PASSWORD="<your gog keyring password>"
```

Get a Hunter.io API key at [hunter.io](https://hunter.io/api-keys). Never commit the key.

### 2. gogcli authentication

The Gmail account `armaan.priyadarshan.29@dartmouth.edu` is already authenticated via `gog`. To verify:

```bash
gog auth list
gog auth list --check
```

If re-auth is needed:

```bash
gog auth add armaan.priyadarshan.29@dartmouth.edu --services gmail --force-consent
```

---

## Tools

### Send an email

```bash
gog gmail send --to recipient@example.com --subject "Subject" --body "Body text"
```

With HTML body:

```bash
gog gmail send --to recipient@example.com --subject "Subject" --body "Plain fallback" --body-html "<p>Rich content</p>"
```

Reply to a message (with quoted original):

```bash
gog gmail send --reply-to-message-id <messageId> --quote --to recipient@example.com --subject "Re: Subject" --body "Reply text"
```

From a file:

```bash
gog gmail send --to recipient@example.com --subject "Subject" --body-file ./message.txt
```

### Guess an email (Hunter.io)

```bash
python3 scripts/assistant/guess-email.py "First Last" domain.com
python3 scripts/assistant/guess-email.py First Last domain.com
```

Returns the most likely email, confidence score, and position if available.

### Verify an email (Hunter.io)

Check if an email will bounce before sending:

```bash
python3 scripts/assistant/verify-email.py someone@example.com
```

Status meanings:
- **valid** — Deliverable, safe to send
- **invalid** — Will bounce, do not send
- **accept_all** — Server accepts all addresses (can't confirm the individual mailbox exists)
- **webmail** — Webmail provider (deliverable but unverifiable via SMTP)
- **unknown** — Could not determine

The script exits with code 2 if the email is invalid, so you can chain it:

```bash
python3 scripts/assistant/verify-email.py target@example.com && \
  gog gmail send --to target@example.com --subject "Hi" --body "..."
```

### Search inbox

```bash
gog gmail search 'newer_than:7d'                          # Last 7 days
gog gmail search 'from:someone@example.com'               # From specific person
gog gmail search 'subject:invoice newer_than:30d'         # Subject + time
gog gmail search 'is:unread' --max 20                     # Unread, limit 20
```

### Read a message or thread

```bash
gog gmail thread get <threadId>                            # Full thread
gog gmail get <messageId>                                  # Single message
gog gmail get <messageId> --format metadata                # Headers only
```

### Drafts

```bash
gog gmail drafts list
gog gmail drafts create --to recipient@example.com --subject "Draft" --body "Body"
gog gmail drafts update <draftId> --subject "Updated" --body "New body"
gog gmail drafts send <draftId>
```

### Labels and organization

```bash
gog gmail labels list
gog gmail thread modify <threadId> --add STARRED --remove INBOX    # Star and archive
gog gmail batch modify <id1> <id2> --add STARRED                   # Batch label
```

---

## Common workflows

### Find someone's email, verify it, and send

```bash
# 1. Guess the email
python3 scripts/assistant/guess-email.py "Jane Doe" acme.com

# 2. Verify it won't bounce
python3 scripts/assistant/verify-email.py jane.doe@acme.com

# 3. Send only if valid
gog gmail send --to jane.doe@acme.com --subject "Quick question" --body "Hi Jane, ..."
```

### Bulk send (different recipients, same template)

```bash
for email in alice@a.com bob@b.com carol@c.com; do
  gog gmail send --to "$email" --subject "Hello" --body "Hi there, ..."
done
```

### Search and reply

```bash
# Find the thread
gog gmail search 'from:someone@example.com subject:meeting' --max 1 --json

# Reply (use the messageId from the search result)
gog gmail send --reply-to-message-id <messageId> --quote --to someone@example.com --subject "Re: meeting" --body "Sounds good!"
```

---

## Outreach campaign

See [OUTREACH.md](OUTREACH.md) for the active DTC agentic-commerce outreach playbook — target brands, LLM-evidence personalization workflow, email format, tone, and bounce handling.

The prior Engrams campaign log is archived at `engrams-outreach-log.csv`. New campaign log is `outreach-log.csv` (columns: `name,role,brand,domain,email,date_sent,verified,llm_evidence`).

---

## Claude Code instructions

When asked to send emails or find contacts, use these tools directly:

- **Send email:** `gog gmail send --to <email> --subject "<subject>" --body "<body>"`
- **Guess email:** `python3 scripts/assistant/guess-email.py "<name>" <domain>`
- **Verify email:** `python3 scripts/assistant/verify-email.py <email>` (always do this before sending to a guessed address)
- **Search inbox:** `gog gmail search '<query>' --max <n>`
- **Read thread:** `gog gmail thread get <threadId>`
- **Create draft:** `gog gmail drafts create --to <email> --subject "<subject>" --body "<body>"`

Environment variables `HUNTER_API_KEY` and `GOG_KEYRING_PASSWORD` must be set in the session.

The authenticated Gmail account is `armaan.priyadarshan.29@dartmouth.edu`.

All emails are sent from and signed as this account unless otherwise specified.
