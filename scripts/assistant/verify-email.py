#!/usr/bin/env python3
"""Verify if an email address is deliverable using Hunter.io Email Verifier API.

Usage:
    python verify-email.py someone@example.com
"""

import os
import sys
import urllib.request
import urllib.parse
import json

API_KEY = os.environ.get("HUNTER_API_KEY")
if not API_KEY:
    print("Error: Set HUNTER_API_KEY environment variable", file=sys.stderr)
    sys.exit(1)

if len(sys.argv) != 2:
    print("Usage: verify-email.py someone@example.com")
    sys.exit(1)

email = sys.argv[1]
params = urllib.parse.urlencode({"email": email, "api_key": API_KEY})
url = f"https://api.hunter.io/v2/email-verifier?{params}"

try:
    with urllib.request.urlopen(urllib.request.Request(url)) as resp:
        data = json.loads(resp.read().decode()).get("data", {})
except urllib.error.HTTPError as e:
    raw = e.read().decode()
    try:
        body = json.loads(raw)
        errors = body.get("errors", [])
        msg = errors[0].get("details", "Unknown error") if errors else "Unknown error"
    except json.JSONDecodeError:
        msg = f"HTTP {e.code}: {raw[:200]}"
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(1)

status = data.get("status", "unknown")
score = data.get("score")
mx = data.get("mx_records")
smtp_server = data.get("smtp_server")
smtp_check = data.get("smtp_check")
disposable = data.get("disposable")
block = data.get("block")
accept_all = data.get("accept_all")

VERDICT = {
    "valid": "Deliverable",
    "invalid": "WILL BOUNCE - do not send",
    "accept_all": "Server accepts all (can't confirm individual address)",
    "webmail": "Webmail (deliverable but unverifiable via SMTP)",
    "unknown": "Unknown - could not determine",
}

print(f"Email:       {email}")
print(f"Status:      {status} — {VERDICT.get(status, status)}")
print(f"Score:       {score}/100" if score is not None else "Score:       unknown")
print(f"MX records:  {'yes' if mx else 'no'}")
print(f"SMTP server: {'yes' if smtp_server else 'no'}")
print(f"SMTP check:  {'pass' if smtp_check else 'fail'}")
print(f"Accept all:  {'yes' if accept_all else 'no'}")
print(f"Disposable:  {'yes' if disposable else 'no'}")
print(f"Blocked:     {'yes' if block else 'no'}")

if status == "invalid":
    sys.exit(2)
