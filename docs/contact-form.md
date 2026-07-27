# Contact form setup

The contact page posts to `/api/contact`. The Vercel Function validates the
submission, verifies Cloudflare Turnstile, and asks Resend to deliver a
plain-text message to `hi@traykov.cc`.

The visitor's email address is used as `Reply-To`. It is deliberately not used
as `From`: sending as an unverified visitor domain would fail DMARC checks and
make spoofing easier.

## One-time production setup

1. In Resend, verify `traykov.cc` (or a dedicated sending subdomain) by adding
   the SPF and DKIM DNS records Resend supplies.
2. Create a Resend API key with sending access.
3. In Cloudflare Turnstile, create a widget for `traykov.cc`. Use the managed
   widget mode and add any Vercel preview domains that should be testable.
4. Add these variables to Vercel for Production and Preview as appropriate:

   - `PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `RESEND_API_KEY`
   - `CONTACT_FROM_EMAIL` — for example,
     `Traykov website <contact@traykov.cc>`
   - `CONTACT_ALLOWED_ORIGINS` — comma-separated exact origins beyond the
     built-in canonical and current Vercel deployment origins

5. Redeploy. `PUBLIC_TURNSTILE_SITE_KEY` is read at build time; changing it
   without a rebuild will not update the page.
6. Submit one real message from the production contact page, verify that it
   reaches `hi@traykov.cc`, and verify that Reply opens a message to the
   visitor's address.

Never add real secret values to `.env.example` or commit `.env.local`.

## Abuse prevention

- Turnstile tokens are verified server-side and must match the `contact`
  action and request hostname. Tokens are short-lived and single-use.
- The API accepts only same-origin POST requests from an explicit allowlist.
- A honeypot silently absorbs simple form bots.
- Names, email addresses, messages, token length, and total request size are
  bounded and validated on the server.
- Email is plain text with a fixed recipient and fixed subject, which avoids
  HTML injection and user-controlled email headers.
- Secrets exist only in the Vercel Function environment.
- Responses are not cached and do not include the submitted personal data.

Origin checks and a honeypot are supporting controls, not rate limits. In
Vercel Firewall, add a rate-limit rule for `POST /api/contact`. A practical
starting point is 5 requests per minute per IP with a one-hour block after
repeated violations. Review legitimate traffic before tightening it. Turnstile
remains necessary because IP-only limits can punish shared networks and can be
bypassed with distributed traffic.

Resend should only be authorized to send from the verified portfolio domain.
Do not send an automatic confirmation to the visitor: that would let attackers
use this form to send unsolicited mail to arbitrary addresses.

## Failure behavior

The form fails closed if Turnstile or email delivery is not configured. It
keeps the visitor's text after a failed attempt and shows a direct
`hi@traykov.cc` fallback. Provider errors are logged without the visitor's
name, email, or message body.
