/**
 * Baja AI Builders — newsletter signup worker.
 * POST /subscribe { email } → creates the contact in Resend.
 *
 * Config:
 *   RESEND_API_KEY     (secret: `wrangler secret put RESEND_API_KEY`)
 *   RESEND_SEGMENT_ID  (var, wrangler.toml — optional; adds contacts to it)
 */

const ALLOWED_ORIGINS = [
  "https://bajaaibuilders.com",
  "https://baja-ai-builders.github.io",
  "http://localhost:8873",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/subscribe") {
      return json({ error: "not_found" }, 404, cors);
    }

    let email;
    try {
      const body = await request.json();
      email = String(body.email || "")
        .trim()
        .toLowerCase();
      // honeypot: real users never fill this hidden field
      if (body.website) return json({ ok: true }, 200, cors);
    } catch {
      return json({ error: "bad_request" }, 400, cors);
    }

    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      return json({ error: "invalid_email" }, 400, cors);
    }

    const contact = { email, unsubscribed: false };
    if (env.RESEND_SEGMENT_ID) {
      contact.segments = [{ id: env.RESEND_SEGMENT_ID }];
    }

    const res = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contact),
    });

    if (res.ok) return json({ ok: true }, 200, cors);

    // Resend returns 409 when the contact already exists — that's a success
    // from the visitor's point of view.
    if (res.status === 409) return json({ ok: true, already: true }, 200, cors);

    console.log("resend error", res.status, await res.text());
    return json({ error: "upstream" }, 502, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
