window.CASE_STUDY_EXTRAS = {
  "clex": {
    "vision": "Clex started from a practical problem: people need to send, compress, merge or protect files without every step becoming a cloud upload. Browsers already have the pieces, so the product tests how much of that work can stay on the device by default.",
    "differentiators": [
      "WeTransfer, Smash, Filemail: upload-and-link products built around server storage. Clex is built around not storing.",
      "Snapdrop, PairDrop: good lightweight WebRTC tools. Clex adds preparation tools, a Vault, the Chain, mobile apps and fallback routes.",
      "AirDrop, Quick Share: excellent inside one ecosystem and limited across them."
    ],
    "longTerm": "A neutral file-movement layer: prepare locally, choose the right route, keep a verifiable record when proof matters.",
    "lessons": [
      { "category": "Product", "body": "The route picker is a trust surface. Showing how a file moves is more useful than making the transfer feel mysterious." },
      { "category": "Engineering", "body": "Back-pressure matters on long data-channel sends. Real devices exposed limits that local demos never did." },
      { "category": "Design", "body": "Marketing pages can be expressive. Task surfaces need restraint." },
      { "category": "Security", "body": "A privacy claim is worth exactly as much as the architecture behind it. Hashes instead of files, keys on the device." }
    ],
    "pullQuote": "A file workspace for web, Android and iOS: peer-to-peer transfer, on-device tools, an encrypted Vault, and a public Chain that proves a transfer without holding the file."
  },
  "clex-ai": {
    "vision": "Model choice changes faster than application code should. Clex AI keeps the OpenAI-shaped request developers already write and routes it to whichever provider makes sense today.",
    "differentiators": [
      "OpenRouter: the closest comparison. Clex AI focuses on zero retention, a free starting path through NVIDIA NIM, and a tighter playground.",
      "Direct provider SDKs: fine until you want to compare providers, at which point every call site changes.",
      "Hosted inference endpoints: a different job. They host models; Clex AI routes requests."
    ],
    "longTerm": "A model-operations surface: latency, cost, reliability, prompt versions and A/B tests visible enough to pick the right model per workload.",
    "lessons": [
      { "category": "Product", "body": "Compatibility removes adoption friction. A familiar request shape lets people try the gateway without rewriting anything." },
      { "category": "Engineering", "body": "Streaming proxies should stay simple. Passing chunks through untouched protects first-token latency and removes parsing risk." },
      { "category": "Design", "body": "A visible pricing calculator beats vague enterprise copy." },
      { "category": "Security", "body": "Keep human sessions and machine keys in separate systems. Most gateway compromises start where the two meet." }
    ],
    "pullQuote": "An OpenAI-compatible gateway that routes across providers with streaming, abort handling, per-key usage and no prompt retention."
  },
  "driped": {
    "vision": "Subscription receipts already live in the inbox. Reading them gives useful recurring-spend visibility without bank access, which most tools demand as step one.",
    "differentiators": [
      "Rocket Money and similar: strong in supported markets, but bank linking and regional coverage do not fit everyone.",
      "Manual trackers: useful until you forget what renews, which is the problem.",
      "Card-data products: miss UPI, app-store billing, wallets and prepaid charges."
    ],
    "longTerm": "From detection to action: category insight, forecasts, reminders, merchant links, and a correction loop that improves the next extraction.",
    "lessons": [
      { "category": "Product", "body": "The privacy boundary is what content leaves the device, not where the model runs. A lighter app with selective cloud fallback was the better product." },
      { "category": "Engineering", "body": "Two-tier extraction suits messy data. Deterministic parsing handles the known cases; a model handles unusual templates when confidence is low." },
      { "category": "Design", "body": "Cross-platform parity is shared language as much as shared code: the same screen names, gestures and correction model." },
      { "category": "Market", "body": "Non-US payment behaviour deserves first-class design. UPI, app-store billing, wallets and multi-currency receipts change the requirements." }
    ],
    "pullQuote": "A subscription tracker that reads receipt evidence first, uses a model only when needed, and never asks for bank access."
  },
  "trgt": {
    "vision": "A richer race weekend: prediction, context, live state and post-session feedback in one product, without turning the experience into a spreadsheet.",
    "differentiators": [
      "The official F1 app: built for broadcast and official content, not for prediction loops.",
      "F1 Fantasy: a strong game layer, more spreadsheet than story.",
      "Forums and social feeds: good conversation, hard to turn into a repeatable game."
    ],
    "longTerm": "Driver strategy notes, tyre-compound deltas, sprint modes, historical accuracy badges, friend leagues and better race-weekend explanations.",
    "lessons": [
      { "category": "Product", "body": "The lockout timer is the game boundary. It has to be enforced on the server and shown clearly." },
      { "category": "Engineering", "body": "Snapshot mode is a normal reliability path, not an error fallback. Race-weekend data is volatile by nature." },
      { "category": "Design", "body": "A strong sports identity needs restraint. One accent colour and a newspaper grid kept it legible." },
      { "category": "Audience", "body": "The best user is the engaged fan who wants context before and after a session, not only the result." }
    ],
    "pullQuote": "A Formula 1 platform with server-enforced prediction lockouts, live session context, AI notes, badges and leaderboards on Cloudflare."
  },
  "modih-mail": {
    "vision": "Disposable email with a proper product surface: instant inboxes, OTP extraction, expiry controls and an API, on a Cloudflare-native backend.",
    "differentiators": [
      "TempMail, Mailinator, 10MinuteMail: familiar, often ad-heavy, limited for developer use.",
      "SimpleLogin, AnonAddy: strong alias products for a different workflow.",
      "Proton Mail, Hey: primary mail, not temporary inboxes."
    ],
    "longTerm": "Reply support, aliases, custom domains, team accounts, QA workflows and better API analytics.",
    "lessons": [
      { "category": "Product", "body": "OTP extraction is the core use case. It should be visible and fast, not buried in a message view." },
      { "category": "Engineering", "body": "Cloudflare's mail stack fits the job: Email Routing, Workers, D1, KV and Pages share one deployment model." },
      { "category": "Design", "body": "A light frontend is a product advantage when first paint is what people notice." },
      { "category": "Security", "body": "Every message is untrusted HTML from a stranger. Sanitising before render is the product, not a hardening task." }
    ],
    "pullQuote": "A Cloudflare-native disposable email service with OTP extraction, owner tokens, an API, automatic cleanup and an interface that feels controlled."
  }
};
