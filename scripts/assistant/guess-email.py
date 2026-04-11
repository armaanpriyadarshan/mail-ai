#!/usr/bin/env python3
"""Find someone's email using Hunter.io Email Finder API.

Usage:
    python guess-email.py "First Last" domain.com
    python guess-email.py First Last domain.com
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

if len(sys.argv) == 3:
    parts = sys.argv[1].split()
    first, last = parts[0], parts[-1]
    domain = sys.argv[2]
elif len(sys.argv) == 4:
    first, last, domain = sys.argv[1], sys.argv[2], sys.argv[3]
else:
    print("Usage: guess-email.py 'First Last' domain.com")
    print("       guess-email.py First Last domain.com")
    sys.exit(1)

params = urllib.parse.urlencode({
    "domain": domain,
    "first_name": first,
    "last_name": last,
    "api_key": API_KEY,
})

url = f"https://api.hunter.io/v2/email-finder?{params}"
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
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

result = data.get("data", {})
email = result.get("email")
score = result.get("score")
position = result.get("position")

if email:
    print(f"Email:    {email}")
    print(f"Score:    {score}/100" if score else "Score:    unknown")
    if position:
        print(f"Position: {position}")
else:
    print("No email found.")
    sys.exit(1)
