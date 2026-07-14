# Newsletter worker

Cloudflare Worker that takes signups from bajaaibuilders.com and creates
[Resend](https://resend.com) contacts. The site posts `{ "email": "..." }` to
`/subscribe`; the worker validates, forwards to Resend, and answers
`{ "ok": true }`.

## Setup (one time)

1. **Resend**
   - Verify the sending domain: Resend → Domains → Add `bajaaibuilders.com`,
     add the DNS records it gives you (DKIM + SPF), wait for green checks.
   - Create an API key (API Keys → Create) with full access (contact creation
     needs more than send-only scope).
   - Contacts are account-level in Resend (Audiences are deprecated); signups
     appear under **Contacts**. New contacts are also added to the segment set
     in `wrangler.toml` → `RESEND_SEGMENT_ID` (currently the "newsletter"
     segment); clear that var to skip segment assignment.

2. **Deploy the worker**

   ```sh
   cd worker
   npx wrangler login
   npx wrangler secret put RESEND_API_KEY   # paste the Resend key
   npx wrangler deploy
   ```

   `deploy` prints the worker URL, e.g.
   `https://baja-newsletter.<account>.workers.dev`. To serve it from
   `newsletter.bajaaibuilders.com` instead, put the domain on Cloudflare and
   uncomment the `routes` block in `wrangler.toml`.

3. **Point the site at it** — in `index.html`, set

   ```js
   var SUBSCRIBE_ENDPOINT = "https://<worker-url>/subscribe";
   ```

## Sending newsletters

Write and send broadcasts from the Resend dashboard (Broadcasts → New) to your
contacts (optionally filtered by segment). Resend handles unsubscribe links,
bounces, and suppression. Free tier: 3,000 emails/month, 100/day.

## Notes

- Allowed origins live in `ALLOWED_ORIGINS` in `index.js`.
- Duplicate signups return success to the visitor.
- Single opt-in: contacts are added without a confirmation email.
