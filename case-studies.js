window.CASE_STUDIES = [
  {
    slug: "clex",
    title: "Clex",
    label: "The Clex file",
    headline: "Files move. Servers stay out of it.",
    subtitle: "A browser workspace for preparing and sending files directly between people, with no server storage by default.",
    liveUrl: "https://clex.in",
    repoUrl: "https://github.com/Abhinavv-007/clex",
    issue: "Privacy / Transfer / Proof",
    version: "Web 1.0 / Android 1.9.12 / iOS 1.9.5",
    accent: "#9f7a36",
    stack: ["Svelte", "TypeScript", "Cloudflare Workers", "Durable Objects", "WebRTC", "D1", "KV", "Kotlin", "SwiftUI"],
    heroImage: {
      src: "assets/case-studies/clex/workspace.webp",
      alt: "Poster showing the Clex workspace with a file queue and transfer panel",
      caption: "The workspace. Files are queued, prepared and sent from the device; nothing is uploaded unless the user chooses the Drive fallback."
    },
    supportingImages: [
      {
        src: "assets/case-studies/clex/chain.webp",
        alt: "Poster for the Clex Chain explorer",
        caption: "The Chain records that a transfer happened: hash, size, type, route and time. Never the file."
      },
      {
        src: "assets/case-studies/clex/vault.webp",
        alt: "Poster for the Clex Vault",
        caption: "The Vault holds encrypted notes, view-once links and a 24-hour timed relay. Keys are generated on the device."
      },
      {
        src: "assets/case-studies/clex/share-anywhere.webp",
        alt: "Poster showing the direct, local and relay share routes",
        caption: "Three routes: direct WebRTC, same-network delivery, and an encrypted relay when neither side can connect directly."
      }
    ],
    lead: [
      "Clex is a file workspace for web, Android and iOS. You drop files, prepare them on the device, and send them to another person. By default no server ever holds the file.",
      "Transfers try a direct WebRTC connection first, then same-network delivery, then an encrypted relay when both sides sit behind networks that refuse to connect. The route is shown, not hidden, so the person sending knows exactly where the bytes went.",
      "Two more pieces make it more than a transfer tool: a Vault for encrypted notes and view-once links, and a public Chain that proves a transfer took place without exposing what was in it."
    ],
    deepDive: [
      "The browser does the work that file services usually do on a server. Image compression, format conversion, PDF merge and split, zip creation and OCR all run on the device using WebCodecs, WebAssembly, IndexedDB and Web Crypto. Only then does the file move.",
      "Signalling for WebRTC runs on Cloudflare Durable Objects, one room per transfer. Large sends use a one-megabyte high-water mark with drain polling on the data channel, because the naive version froze tabs on real devices.",
      "The Chain stores hashes, timestamps, sizes, MIME types and route metadata in D1. It answers one question, 'did this transfer happen?', and nothing else. Keeping it useful without turning it into analytics was a design constraint from the first commit."
    ],
    blueprint: {
      features: ["On-device file preparation", "Direct, local and relay routing", "Encrypted Vault notes", "View-once secret links", "Public Chain explorer", "Android and iOS apps"],
      flow: ["Drop", "Prepare", "Pick a route", "Transfer", "Verify on the Chain"],
      modules: ["Workspace", "Vault", "Chain", "Signalling", "Relay"]
    },
    anatomy: [
      { title: "Frontend", body: "Svelte and TypeScript on the web, Jetpack Compose on Android, SwiftUI on iOS. Marketing surfaces are loud; the app surfaces are quiet and focused on the queue." },
      { title: "Transport", body: "WebRTC data channels are the primary route. Signalling runs through Durable Object rooms. Same-network delivery and the encrypted relay keep the product working on hostile networks." },
      { title: "Data", body: "D1 holds Chain metadata. KV holds short-lived encrypted secrets. IndexedDB holds local Vault state. Timed relay ciphertext lives in Supabase and expires." },
      { title: "Security", body: "Payloads are prepared and encrypted on the device. Master keys never leave it, and users can compare key fingerprints when pairing." }
    ],
    challenges: [
      { title: "Hostile networks", problem: "Carrier NAT and enterprise firewalls break naive peer-to-peer transfers.", solution: "A three-route model with connection-kind detection and visible fallback states.", result: "A transfer still makes sense to the user when the network downgrades the route." },
      { title: "Large-file back-pressure", problem: "Raw data-channel sends filled browser memory and froze the tab.", solution: "A one-megabyte high-water mark with drain polling.", result: "Multi-gigabyte sends stay controlled." },
      { title: "Key ownership", problem: "A Vault is pointless if the service becomes the key server.", solution: "Master keys are generated on the device and users can verify fingerprints when pairing.", result: "Trust stays local and pairing stays practical." },
      { title: "Proof without surveillance", problem: "A public ledger can quietly become analytics.", solution: "The Chain records only hashes and transfer metadata.", result: "Transit can be proven without a server ever seeing a file." }
    ],
    impact: ["Three production surfaces: web, Android, iOS", "150-300 ms faster Android cold start", "Smaller Android release after R8 cleanup", "Device-held keys for Vault and secret links", "Public transfer-verification explorer"],
    securityLens: [
      { title: "What the server can see", body: "Building Clex was the first time I had to write down, endpoint by endpoint, what the server is allowed to know. That list is now the first thing I look for on any target." },
      { title: "Trust is a surface", body: "The route picker shows where a file goes. Hiding it would feel smoother and would be less honest. Visible security decisions are usually the better product." },
      { title: "Keys and proofs", body: "Device-generated keys and hash-only proofs are the same instinct I use when reviewing an app: keep the sensitive part where the user is, and give the server only what it needs to do its job." }
    ],
    closing: [
      "The route picker became the product. Showing how a file moves turned out to be worth more than making the transfer feel like magic.",
      "Next is making Chain verification useful for teams that need proof of handoff without another cloud bucket."
    ]
  },
  {
    slug: "clex-ai",
    title: "Clex AI",
    label: "The model exchange",
    headline: "One endpoint. Any provider.",
    subtitle: "An OpenAI-compatible gateway that routes one request shape to OpenAI, Anthropic, Gemini, NVIDIA and other providers.",
    liveUrl: "https://ai.clex.in",
    repoUrl: "https://github.com/Abhinavv-007/clex-ai",
    issue: "Gateway / Routing / Keys",
    version: "Gateway / Dashboard / Playground",
    accent: "#34546a",
    stack: ["Express", "Node.js", "Vercel", "React", "Vite", "Firebase", "NVIDIA NIM", "OpenAI", "Anthropic", "Gemini"],
    heroImage: {
      src: "assets/case-studies/clex-ai/overview.webp",
      alt: "Poster showing the Clex AI dashboard with routing, usage and keys",
      caption: "One dashboard for routing, usage, keys and OpenAI-compatible requests."
    },
    supportingImages: [
      {
        src: "assets/case-studies/clex-ai/routing-layer.webp",
        alt: "Poster for the Clex AI routing layer",
        caption: "The routing layer turns one request shape into provider-specific calls and turns provider streams back into one shape."
      },
      {
        src: "assets/case-studies/clex-ai/api-playground.webp",
        alt: "Poster for the Clex AI playground",
        caption: "The playground checks prompts, streaming, latency and response shape before a line of app code changes."
      },
      {
        src: "assets/case-studies/clex-ai/model-catalog.webp",
        alt: "Poster for the Clex AI model catalogue",
        caption: "The catalogue shows what each provider offers and what it costs, so choosing a model is a decision rather than a rewrite."
      }
    ],
    lead: [
      "Clex AI sits between an application and the model providers it might want to use. The app sends an OpenAI-shaped request to one base URL with one key, and the gateway routes it to OpenAI, Anthropic, Gemini, NVIDIA, Meta, Mistral or an open model.",
      "It exists because model choice changes faster than application code should. Swapping a provider should be a configuration change, not a rewrite of every call site.",
      "Prompts and outputs are not retained. Usage is tracked per key as operational metadata, which is enough for a dashboard and nothing more."
    ],
    deepDive: [
      "Streaming is passed through chunk by chunk with one decoder and no buffering, so first-token latency is the provider's, not the gateway's. An AbortController is tied to the client connection, so a closed tab frees upstream capacity immediately. A hard sixty-second ceiling stops a hung upstream from holding a worker.",
      "Human and machine access are two systems. The dashboard authenticates people through Firebase; the API authenticates requests through scoped keys. A leaked key cannot open the dashboard and a dashboard session cannot be replayed against the API.",
      "The dashboard is a React and Vite single-page app with isolated cross-origin headers for the playground. The marketing page is plain HTML so the landing page pays no framework cost."
    ],
    blueprint: {
      features: ["OpenAI-compatible proxy", "Provider routing", "Scoped API keys", "Streaming playground", "Model catalogue", "Usage and pricing visibility"],
      flow: ["Create a key", "Pick a model", "Send an OpenAI-shaped request", "Gateway routes it", "Stream the response", "Read the usage"],
      modules: ["Gateway", "Provider adapters", "Dashboard", "Playground", "Usage ledger"]
    },
    anatomy: [
      { title: "Gateway", body: "Express routes normalise requests and streams into an OpenAI-compatible surface while adapters absorb provider differences." },
      { title: "Providers", body: "Adapters wrap NVIDIA NIM, OpenAI, Anthropic, Gemini and open-model hosts, with routing based on model, availability, latency and cost." },
      { title: "Dashboard", body: "React and Firebase provide keys, usage, the catalogue and playground sessions without storing prompts or outputs." },
      { title: "Deployment", body: "The gateway runs on Vercel with a stateless design: no prompt store, no output store, nothing to leak." }
    ],
    challenges: [
      { title: "Streaming mismatch", problem: "Providers disagree on chunk shape and finish signals.", solution: "Every stream is normalised into one OpenAI-style contract.", result: "Apps switch providers without touching their stream handling." },
      { title: "Hung upstreams", problem: "Some model calls stall and leave clients waiting.", solution: "Timeouts, fallback behaviour and visible status.", result: "The gateway fails predictably instead of silently." },
      { title: "Two kinds of identity", problem: "People need dashboard sessions; apps need keys. Mixing them is how gateways get compromised.", solution: "Firebase identity for the dashboard, scoped keys for the API, no bridge between them.", result: "Human and machine access stay isolated." },
      { title: "Usage without retention", problem: "A gateway needs usage data without becoming a prompt store.", solution: "Only operational metadata is recorded.", result: "Usage visibility with a zero-retention posture." }
    ],
    impact: ["OpenAI-shaped compatibility", "Multi-provider routing behind one key", "Streaming passed through untouched", "No prompt or output retention", "Dashboard identity separated from API keys"],
    securityLens: [
      { title: "Two identities, no bridge", body: "The separation between dashboard sessions and API keys is the single most important security decision in the product. Weak links between identity systems are exactly what I test for on OAuth and account-linking flows today." },
      { title: "Timeouts are a control", body: "A hung upstream is a denial-of-service waiting to happen. The sixty-second ceiling and abort wiring were added after watching a provider hold connections open." },
      { title: "Retention is a liability", body: "Not storing prompts is not a feature. It removes an entire class of things that could go wrong." }
    ],
    closing: [
      "Clex AI is infrastructure disguised as a base URL: keep the SDK, change one line, get model choice.",
      "Next is routing on measured signals: latency, cost and reliability feeding provider choice automatically."
    ]
  },
  {
    slug: "driped",
    title: "Driped",
    label: "The subscription leak",
    headline: "Your inbox already knows what you pay for.",
    subtitle: "A subscription tracker that reads receipts instead of bank accounts.",
    liveUrl: "https://driped.in",
    repoUrl: "https://github.com/Abhinavv-007/DRIPED-Web",
    issue: "Inbox / Spend / Forecast",
    version: "Web and Android",
    accent: "#5b6a48",
    stack: ["Next.js", "React", "Flutter", "Riverpod", "Hive", "Cloudflare Workers AI", "Firebase", "Gmail API"],
    heroImage: {
      src: "assets/case-studies/driped/dashboard.webp",
      alt: "Poster showing the Driped dashboard with subscriptions, renewals and spend",
      caption: "The dashboard: detected subscriptions, renewal forecast, spend by category and what can be cancelled."
    },
    supportingImages: [
      {
        src: "assets/case-studies/driped/receipt-pipeline.webp",
        alt: "Poster for the Driped receipt pipeline",
        caption: "Deterministic parsing first. The model sees only the receipts that parsing is unsure about."
      },
      {
        src: "assets/case-studies/driped/mobile-command.webp",
        alt: "Poster for the Driped Android app",
        caption: "The Android app keeps scanning, renewals and analytics available without the web dashboard."
      },
      {
        src: "assets/case-studies/driped/analytics-forecast.webp",
        alt: "Poster for the Driped analytics and forecast views",
        caption: "Category spend, renewal timing and savings in one view."
      }
    ],
    lead: [
      "Every subscription sends a receipt. Driped reads those receipts, works out the merchant, the amount and the billing cycle, and shows what is about to renew. It never asks for bank access.",
      "Most receipts are handled by deterministic parsing on the device in milliseconds. The ones that parsing is unsure about go to a small model on Cloudflare Workers AI, and only a trimmed slice of the message makes that trip.",
      "It works on web and Android, and it works outside the US, where bank-linking products often do not."
    ],
    deepDive: [
      "The pipeline has two tiers. Tier one is a set of merchant rules, cadence inference and confidence scoring that runs locally and handles most mail. Tier two is a Llama 3.1 8B model on Workers AI, called only when overall confidence falls below a threshold, and given only a sanitised body slice.",
      "An earlier version shipped an on-device model. Removing it in v3.1.1 cut roughly 570 MB from the Android package. The cloud model is more accurate and the app is lighter. The privacy line is drawn at what content leaves the device, not at where the model runs.",
      "Cycle inference is the hard part. A single receipt rarely says 'monthly', so Driped combines repeated merchant evidence, dates and price history before it commits to a forecast."
    ],
    blueprint: {
      features: ["Gmail receipt scan", "Subscription detection", "Renewal forecast", "Reminders before a charge", "Category analytics", "Savings view"],
      flow: ["Connect inbox", "Scan receipts", "Parse merchant and amount", "Infer the cycle", "Show the forecast", "Remind before renewal"],
      modules: ["Inbox scanner", "Parser", "Model fallback", "Dashboard", "Android sync"]
    },
    anatomy: [
      { title: "Frontend", body: "Next.js and React on the web. Flutter with Riverpod and Hive on Android, so the app stays fast and works from local state." },
      { title: "AI", body: "A deterministic classifier first. Workers AI handles the messy tail: unknown senders, new templates, other languages." },
      { title: "Data", body: "Firebase handles identity and sync. Local state keeps the app responsive during background scans." },
      { title: "Privacy", body: "No bank credentials, the narrowest read-only Gmail scope the feature allows, and a hard limit on what leaves the device." }
    ],
    challenges: [
      { title: "A 570 MB app", problem: "The on-device model made the Android build far too heavy.", solution: "Moved the fallback to Workers AI and kept deterministic parsing local.", result: "A much smaller app that handles more receipt formats." },
      { title: "Receipts that look like promotions", problem: "Marketing mail and receipts share templates.", solution: "Merchant rules, cadence inference and confidence scoring, layered.", result: "Detected subscriptions are reliable and editable." },
      { title: "Currency formats", problem: "Symbols, separators and billing language differ by country.", solution: "Normalised currency extraction with fallback parsing.", result: "Non-US receipts work as a first-class case." },
      { title: "Cycle inference", problem: "One email rarely states the billing cycle.", solution: "Repeated merchant evidence, dates and price history combined.", result: "Forecasts hold up even when a single receipt is incomplete." }
    ],
    impact: ["Subscription visibility without bank access", "Most receipts handled without the model", "Web and Android parity", "Daily background scan", "Receipts from outside the US handled as normal"],
    securityLens: [
      { title: "Scope is the product", body: "The Gmail scope Driped asks for is the smallest one that makes the feature work. Asking for more would have been easier and worse. On targets, over-broad OAuth scopes are one of the first things I check." },
      { title: "What leaves the device", body: "Deciding exactly which slice of a message may travel to the model was the longest design argument in the project. Trust boundaries are drawn at content, not at compute." },
      { title: "Model output is untrusted input", body: "Whatever the model returns is validated before it touches the ledger. A model is another upstream, and upstreams get checked." }
    ],
    closing: [
      "Financial visibility can come from a lighter trust boundary. Receipts were enough for the first useful version.",
      "Next is a correction loop: every edit a user makes should improve the next extraction without making the app feel like accounting software."
    ]
  },
  {
    slug: "trgt",
    title: "trgt",
    label: "The grid report",
    headline: "Predict before the lights. Argue after.",
    subtitle: "Formula 1 session data, podium predictions with server-side lockouts, and AI race notes.",
    liveUrl: "https://trgt.in",
    repoUrl: "https://github.com/Abhinavv-007/f1",
    issue: "F1 / Predictions / Race intel",
    version: "Race-weekend product",
    accent: "#ee3f2c",
    stack: ["Next.js", "React", "Tailwind", "Framer Motion", "Prisma", "Cloudflare D1", "Firebase", "Gemini"],
    heroImage: {
      src: "assets/case-studies/trgt/f1-intelligence.webp",
      alt: "Poster showing the trgt platform with telemetry, predictions and race notes",
      caption: "Telemetry, race deck, prediction lock, performance index and AI notes on one screen."
    },
    supportingImages: [
      {
        src: "assets/case-studies/trgt/grid-report.webp",
        alt: "Poster for the trgt race intelligence system",
        caption: "Feed data, prediction locking, AI notes and snapshot fallback in one system."
      },
      {
        src: "assets/case-studies/trgt/predict-race.webp",
        alt: "Poster for the trgt prediction game",
        caption: "Podium locks, badges, scoring and leaderboards turn a race weekend into a repeatable loop."
      },
      {
        src: "assets/case-studies/trgt/circuit-intelligence.webp",
        alt: "Poster for trgt circuit intelligence",
        caption: "Weather, DRS zones, tyre wear and strategy context per circuit."
      }
    ],
    lead: [
      "trgt is a Formula 1 platform for fans who follow more than the podium. It combines live session state, circuit context, podium predictions, badges and a leaderboard.",
      "The loop is strict: predict before the lockout, follow the session, then let the platform turn what happened into scoring and context.",
      "It is part sports paper, part pit wall, part game. Keeping those three feelings in one coherent product was the design problem."
    ],
    deepDive: [
      "Lockouts are enforced on the server. A prediction is accepted only before the session's start time as the server sees it, and scoring runs at session end. The client shows a countdown; the client does not decide.",
      "Race feeds lag, stall and disagree. Snapshot mode captures a consistent view of session state and serves it when the upstream is unreliable, so a race-weekend page never goes blank at the moment people care most.",
      "Gemini writes short race notes from structured session snapshots rather than from a live stream, which keeps the AI cost bounded and the notes tied to real data."
    ],
    blueprint: {
      features: ["Server-side prediction lockout", "Live session state", "AI race notes", "Weather and circuit context", "Badge engine", "Leaderboard"],
      flow: ["Read the race state", "Make a prediction", "Lock at session start", "Watch the results", "Earn badges", "Climb the board"],
      modules: ["Race feed", "Prediction engine", "Gemini notes", "Badge system", "Snapshot mode"]
    },
    anatomy: [
      { title: "Frontend", body: "Next.js, React, Tailwind and Framer Motion. Monochrome newspaper structure with one crimson accent reserved for trgt itself." },
      { title: "Data", body: "Prisma on Cloudflare D1 stores predictions, badges, sessions and leaderboard state." },
      { title: "AI", body: "Gemini generates race notes from snapshots, so cost and latency stay predictable." },
      { title: "Reliability", body: "Snapshot mode is a normal path, not an error handler. Volatile weekends are the expected case." }
    ],
    challenges: [
      { title: "Unreliable feeds", problem: "Motorsport data feeds lag, fail and contradict each other.", solution: "Snapshot mode and defensive session-state handling.", result: "Pages stay usable when upstream data is rough." },
      { title: "Fair lockouts", problem: "A prediction game is meaningless if the deadline can be argued with.", solution: "Lockout enforcement moved to the server.", result: "A competitive boundary that holds." },
      { title: "AI cost", problem: "Generating context on every refresh gets expensive.", solution: "Structured snapshots and a limited set of note surfaces.", result: "AI adds context without becoming the cost centre." },
      { title: "Loud brand", problem: "F1 visuals turn noisy fast.", solution: "Newspaper structure with crimson used only for trgt-specific emphasis.", result: "Aggressive, but still legible." }
    ],
    impact: ["Race-weekend prediction loop", "Server-side lockout model", "Seven-badge progression", "Snapshot reliability mode", "AI notes tied to session data"],
    securityLens: [
      { title: "The client does not decide", body: "Moving the lockout to the server is the same rule I apply to every business-logic test: any deadline, price or limit that only the client enforces is not enforced." },
      { title: "State machines have gaps", body: "Predict, lock, score is a state machine. Testing what happens when steps arrive late, twice or out of order on trgt is why I look for the same gaps on targets." },
      { title: "Fallbacks are part of the design", body: "Snapshot mode exists because upstreams fail. A system that is only correct when everything else works is not correct." }
    ],
    closing: [
      "trgt is where the portfolio gets loud. The same engineering holds up under a faster, more competitive product.",
      "Next is explainability during the race: why a prediction moved, which events mattered, and what to watch next."
    ]
  },
  {
    slug: "modih-mail",
    title: "Modih Mail",
    label: "The burner post",
    headline: "Disposable email that does not feel disposable.",
    subtitle: "Temporary @modih.in inboxes with OTP extraction, owner tokens, expiry and a developer API.",
    liveUrl: "https://modih.in",
    repoUrl: "https://github.com/Abhinavv-007/modih-email",
    issue: "Mail / Utility / Edge",
    version: "Cloudflare-native",
    accent: "#775d3c",
    stack: ["Cloudflare Pages", "Workers", "Email Routing", "D1", "KV", "Turnstile", "Firebase", "Resend"],
    heroImage: {
      src: "assets/case-studies/modih-mail/temporary-inbox.webp",
      alt: "Poster showing a Modih Mail temporary inbox",
      caption: "The temporary inbox: fast, private, OTP-aware and gone when it expires."
    },
    supportingImages: [
      {
        src: "assets/case-studies/modih-mail/mail-routing.webp",
        alt: "Poster for the Modih Mail routing stack",
        caption: "Email Routing, Workers, D1, KV and Pages as one edge-native system from MX record to screen."
      },
      {
        src: "assets/case-studies/modih-mail/otp-inbox.webp",
        alt: "Poster for OTP extraction in Modih Mail",
        caption: "The one-time code is pulled out of the message and shown first, because that is what most people opened the inbox for."
      },
      {
        src: "assets/case-studies/modih-mail/developer-mailroom.webp",
        alt: "Poster for the Modih Mail developer API",
        caption: "Inbox creation, message access and key management for automated tests."
      }
    ],
    lead: [
      "Modih Mail gives you a temporary @modih.in address in one click. Messages arrive, the one-time code is pulled out and shown first, and everything expires on a schedule.",
      "Most disposable mail tools look temporary in the worst way. Modih Mail is built to feel controlled: owner tokens instead of accounts, sanitised rendering, and a developer API for test automation.",
      "The whole thing runs on Cloudflare, from the MX record to the page."
    ],
    deepDive: [
      "Inbound mail hits Cloudflare Email Routing and lands in a Worker. The Worker parses the message, sanitises the HTML, classifies it, extracts any one-time code and stores the record in D1. KV holds short-lived sessions and owner tokens.",
      "Owner tokens give a person control of an inbox without an account. Each token is scoped to one inbox and expires with it. Turnstile, quotas, API keys and hourly cleanup keep the free tier usable without becoming unmanaged infrastructure.",
      "Every message body is untrusted HTML from a stranger. Sanitising it before render is not a hardening step in Modih Mail; it is the product."
    ],
    blueprint: {
      features: ["Instant inboxes", "OTP extraction", "Owner tokens", "Custom prefixes", "Developer API", "Hourly cleanup"],
      flow: ["Create an inbox", "Receive mail", "Read the code", "Let it expire", "Automate with the API"],
      modules: ["Email Routing", "Inbox Worker", "D1 metadata", "KV sessions", "API keys", "Admin dashboard"]
    },
    anatomy: [
      { title: "Inbound mail", body: "Cloudflare Email Routing receives messages. A Worker parses, sanitises, classifies and stores the record." },
      { title: "Storage", body: "D1 stores message metadata and inbox records. KV holds short-lived access and owner tokens." },
      { title: "Security", body: "Turnstile, owner tokens, Firebase verification for the dashboard, and aggressive cleanup." },
      { title: "Delivery", body: "Pages serves the interface, Workers serve the API, and Resend handles outbound product mail." }
    ],
    challenges: [
      { title: "Control without accounts", problem: "Disposable email needs ownership without a sign-up wall.", solution: "Owner tokens scoped to a single inbox.", result: "Control without killing the instant-use flow." },
      { title: "Untrusted HTML", problem: "Inbound mail is arbitrary markup from arbitrary senders.", solution: "Parse and sanitise before anything is rendered.", result: "Useful content, no script execution." },
      { title: "Free-tier abuse", problem: "Temporary inboxes attract bots and scripted signups.", solution: "Turnstile, quotas, API keys and cleanup jobs.", result: "Open to use, closed to abuse." },
      { title: "Auth at the edge", problem: "Server-side Firebase patterns do not fit Workers.", solution: "Edge-safe token verification boundaries.", result: "Authentication that works in the runtime it runs in." }
    ],
    impact: ["71-test API suite", "MX record to interface on Cloudflare", "Owner-token access model", "OTP extraction in production", "Hourly expiry and cleanup"],
    securityLens: [
      { title: "Rendering untrusted content", body: "Modih Mail is a machine for showing strangers' HTML safely. Every unsafe-rendering pattern I test for elsewhere was something I first had to defend against here." },
      { title: "Scoped tokens", body: "An owner token opens one inbox and nothing else. Scope is the difference between a token and a master key." },
      { title: "Abuse is a design input", body: "Quotas, Turnstile and cleanup were designed in, not bolted on. A free service without limits is an incident waiting to be scheduled." }
    ],
    closing: [
      "Utility software can still be careful. Disposable does not have to mean careless.",
      "Next is deeper developer access: API analytics, team keys and inbox automation."
    ]
  }
];
