// Contact form handler. Accepts a JSON body from /contact and relays it through
// Resend. Client-facing errors are deliberately generic: configuration and
// provider details stay in the function logs.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_TO_EMAIL = "hello@abhnv.in";
const DEFAULT_FROM_EMAIL = "abhnv.in <hello@abhnv.in>";
const MAX_BODY_BYTES = 12_000;

const TOPICS = {
  "security-research": "Security research",
  "product-security": "Product security review",
  "vulnerability-report": "Vulnerability report about one of my products",
  "build": "Build or product work",
  "other": "Something else"
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }
});

const clean = (value, maxLength) => String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength);
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function onRequestGet() {
  return json({
    ok: true,
    method: "POST",
    contentType: "application/json",
    fields: {
      name: "required, up to 120 characters",
      email: "required, a reply-to address",
      topic: `optional, one of: ${Object.keys(TOPICS).join(", ")}`,
      message: "required, up to 4000 characters"
    },
    note: "Vulnerability reports about abhnv.in or my products are welcome. See /.well-known/security.txt."
  });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { "cache-control": "public, max-age=86400" } });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return json({ ok: false, error: "Send the form as JSON." }, 415);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) {
    return json({ ok: false, error: "That message is too long. Keep it under 4000 characters." }, 413);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "The form data could not be read. Try again." }, 400);
  }
  if (!payload || typeof payload !== "object") {
    return json({ ok: false, error: "The form data could not be read. Try again." }, 400);
  }

  // Honeypot: bots fill the hidden field; humans never see it.
  if (clean(payload.website, 200)) {
    return json({ ok: true });
  }

  const name = clean(payload.name, 120);
  const email = clean(payload.email, 160);
  const message = clean(payload.message, 4000);
  const topicKey = clean(payload.topic, 40);
  const topic = TOPICS[topicKey] || TOPICS.other;

  if (!name || !email || !message) {
    return json({ ok: false, error: "Add your name, an email address and a message." }, 400);
  }
  if (!isEmail(email)) {
    return json({ ok: false, error: "That email address does not look right." }, 400);
  }
  if (message.length < 10) {
    return json({ ok: false, error: "Add a little more detail so I can reply usefully." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    console.error("contact: RESEND_API_KEY is not bound on this deployment");
    return json({ ok: false, error: "The form is not available right now. Email hello@abhnv.in directly." }, 503);
  }

  const toEmail = clean(env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL, 200);
  const fromEmail = clean(env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL, 200);
  const subject = `[abhnv.in] ${topic}: ${name}`;
  const text = [
    `Topic: ${topic}`,
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    message
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;line-height:1.55;color:#1a1916">
      <p style="margin:0 0 6px;font-family:monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#a33128">${escapeHtml(topic)}</p>
      <p style="margin:0"><strong>${escapeHtml(name)}</strong> &middot; ${escapeHtml(email)}</p>
      <hr style="border:0;border-top:1px solid #d6ccbd;margin:18px 0">
      <p style="white-space:pre-wrap;margin:0">${escapeHtml(message)}</p>
    </div>
  `;

  let resendResponse;
  try {
    resendResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ from: fromEmail, to: [toEmail], reply_to: email, subject, text, html })
    });
  } catch (error) {
    console.error("contact: relay request failed", error);
    return json({ ok: false, error: "The message could not be sent. Email hello@abhnv.in directly." }, 502);
  }

  if (!resendResponse.ok) {
    let detail = "";
    try {
      const data = await resendResponse.json();
      detail = data.message || data.error || data.name || "";
    } catch {
      // Non-JSON error body; nothing more to log.
    }
    console.error("contact: relay rejected the message", resendResponse.status, detail);
    return json({ ok: false, error: "The message could not be sent. Email hello@abhnv.in directly." }, 502);
  }

  return json({ ok: true });
}
