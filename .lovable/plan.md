

# Add SMTP Email Notifications for Contact Form

## Overview
Create a backend function that sends an email notification via SMTP when someone submits the contact form. The contact form will call this function instead of (or in addition to) the n8n webhook.

## Required Secrets
The following secrets need to be configured before implementation:
- `SMTP_HOST` — SMTP server hostname (e.g., `smtp.gmail.com`)
- `SMTP_PORT` — SMTP port (e.g., `587`)
- `SMTP_USER` — SMTP username/email
- `SMTP_PASS` — SMTP password or app password
- `CONTACT_TO_EMAIL` — Recipient email for notifications
- `CONTACT_FROM_EMAIL` — Sender email address

## Changes

### 1. New edge function: `supabase/functions/contact-notify/index.ts`
- Accepts POST with `{ name, email, message, timestamp, source }`
- Connects to SMTP server using `npm:nodemailer`
- Sends a formatted HTML email to `CONTACT_TO_EMAIL` with the form contents
- Returns success/error response with CORS headers
- Add `verify_jwt = false` in `supabase/config.toml`

### 2. Update `src/pages/Contact.tsx`
- Replace the n8n webhook POST with a call to the new `contact-notify` edge function via `supabase.functions.invoke('contact-notify', { body: { name, email, message, ... } })`
- Keep existing CAPTCHA and honeypot logic unchanged

## Technical Details

| Action | File |
|--------|------|
| Create | `supabase/functions/contact-notify/index.ts` |
| Modify | `supabase/config.toml` (add function config) |
| Modify | `src/pages/Contact.tsx` (switch to edge function) |

The edge function uses `npm:nodemailer` for SMTP transport, which is well-supported in Deno edge functions. The email body will be a clean HTML template showing the sender's name, email, message, and submission timestamp.

