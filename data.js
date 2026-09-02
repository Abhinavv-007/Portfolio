/*
  Single source of truth for everything on abhnv.in.

  The browser loads this as a classic <script> and reads window.PORTFOLIO.
  Cloudflare Pages Functions import the same file (functions/api/_data.js),
  so the public API and the pages can never disagree.

  Product names are fixed: Clex, Clex AI, Driped, trgt, Modih Mail.
*/
(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = data;
  } else {
    root.PORTFOLIO = data;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return {
    profile: {
      name: "Abhinav Raj",
      role: "Security Researcher & Product Builder",
      publication: "The Build Journal",
      email: "hello@abhnv.in",
      site: "https://abhnv.in",
      location: "India",
      summary: "Security researcher and product builder. I test how web applications and APIs enforce authorization, authentication and business rules, and I ship products of my own: Clex, Clex AI, Driped, trgt and Modih Mail.",
      researchSince: "March 2026",
      bugcrowd: {
        url: "https://bugcrowd.com/h/abhnv8",
        handle: "abhnv8",
        ranks: [
          { label: "Global Top 50", period: "June 2026" },
          { label: "Global Top 50", period: "July 2026" }
        ]
      },
      openTo: [
        "Security research collaborations",
        "Product security reviews before launch",
        "Product and engineering roles",
        "Building with teams who ship"
      ]
    },

    marquee: [
      "Have a system worth testing or a product worth building? Email me"
    ],

    skills: [
      {
        group: "Security testing",
        items: [
          "Authorization and access control",
          "IDOR / BOLA",
          "Authentication and sessions",
          "OAuth 2.0 / OIDC",
          "API testing",
          "Business logic",
          "SSRF",
          "XSS and unsafe rendering",
          "Source-code review"
        ]
      },
      {
        group: "Languages",
        items: ["JavaScript", "TypeScript", "Python", "Dart", "SQL", "Bash", "HTML", "CSS"]
      },
      {
        group: "Frameworks and runtime",
        items: ["React", "Next.js", "Svelte", "Flutter", "Node.js", "Express", "Tailwind CSS", "Vite"]
      },
      {
        group: "Applied AI",
        items: [
          "OpenAI, Anthropic and Gemini APIs",
          "Cloudflare Workers AI",
          "Streaming proxies",
          "Retrieval",
          "Prompt design",
          "Agents with verification steps"
        ]
      },
      {
        group: "Cloud and delivery",
        items: [
          "Cloudflare Pages and Workers",
          "D1, KV, R2, Durable Objects",
          "Email Routing and Turnstile",
          "Firebase",
          "Vercel",
          "Resend",
          "GitHub Actions",
          "Docker"
        ]
      },
      {
        group: "Design and tools",
        items: ["Figma", "Photoshop", "Editorial typography", "CSS motion", "Git", "Linear / Notion"]
      }
    ],

    socials: [
      { label: "LinkedIn", url: "https://www.linkedin.com/in/abhnv8/" },
      { label: "GitHub", url: "https://github.com/Abhinavv-007" },
      { label: "Instagram", url: "https://www.instagram.com/abhnv08/" },
      { label: "X", url: "https://x.com/Abhnv8" }
    ],

    timeline: [
      {
        when: "Now",
        title: "Security research",
        body: "Testing authorization, authentication, OAuth, API and business-logic controls on Bugcrowd programs. Reports are written to be reproduced and fixed, not just triaged."
      },
      {
        when: "June and July 2026",
        title: "Bugcrowd global Top 50",
        body: "Ranked among Bugcrowd's global Top 50 researchers in both months."
      },
      {
        when: "March 2026",
        title: "First program",
        body: "Started security research. The first months were spent on one question: what does the server actually check before it acts?"
      },
      {
        when: "Before that",
        title: "Five products",
        body: "Clex, Clex AI, Driped, trgt and Modih Mail. Each one has its own users, edge cases and security surface, and each one taught me something I now test for."
      }
    ],

    notes: [
      {
        number: "01",
        title: "Authorization first",
        body: "Most of what I report is a server acting on an identifier without checking who owns it. I start every target there."
      },
      {
        number: "02",
        title: "Reports that get fixed",
        body: "A report is a reproduction, an impact statement and a fix. I write for the engineer who has to ship the patch."
      },
      {
        number: "03",
        title: "Security in the build",
        body: "What I learn on programs goes back into Clex, Modih Mail and the rest: scoped tokens, ownership checks, sanitised rendering."
      }
    ],

    principles: [
      {
        title: "Read before you test",
        body: "Documentation, JavaScript bundles and API responses show how a system thinks about identity. I map that before sending anything unusual."
      },
      {
        title: "Prove the minimum",
        body: "One request that shows the flaw is enough. I use my own accounts and invented data, and I stop where the impact is clear."
      },
      {
        title: "Leave it as I found it",
        body: "Any state I change during testing gets restored. A finding should never cost a program cleanup work."
      },
      {
        title: "AI with a fallback",
        body: "Where a product of mine uses a model, deterministic code handles the common path and the model handles the tail. Outputs stay editable."
      }
    ],

    projects: [
      {
        title: "Clex",
        slug: "clex",
        label: "Private file movement",
        shortImage: "assets/projects/short/clex.webp",
        detailedImage: "assets/projects/detailed/clex.webp",
        logo: "assets/logos/clex.svg",
        caseStudyUrl: "work/clex/",
        liveUrl: "https://clex.in",
        repoUrl: "https://github.com/Abhinavv-007/clex",
        url: "work/clex/",
        type: "File workspace",
        description: "A browser workspace that moves files directly between people. Nothing is stored on a server by default.",
        detail: "Files are prepared on the device, then sent over WebRTC, the local network, or an encrypted relay when the direct path fails. A public hash chain records that a transfer happened without holding the file.",
        securityNote: "Keys are generated on the device and the chain stores hashes, never payloads. Building it is where I first had to reason about what a server should be allowed to see.",
        tags: ["Privacy", "WebRTC", "Cloudflare"],
        points: [
          "Direct WebRTC transfer with local-network and relay fallbacks",
          "Compress, convert, merge and zip on the device before sending",
          "Encrypted Vault for notes and view-once links",
          "Transfer proof through hashes, never file contents",
          "Web, Android and iOS",
          "Keys generated on the device"
        ]
      },
      {
        title: "Clex AI",
        slug: "clex-ai",
        label: "One endpoint for many models",
        shortImage: "assets/projects/short/clex-ai.webp",
        detailedImage: "assets/projects/detailed/clex-ai.webp",
        logo: "assets/logos/clex.svg",
        caseStudyUrl: "work/clex-ai/",
        liveUrl: "https://ai.clex.in",
        repoUrl: "https://github.com/Abhinavv-007/clex-ai",
        url: "work/clex-ai/",
        type: "Model gateway",
        description: "An OpenAI-compatible gateway that routes one request shape to OpenAI, Anthropic, Gemini, NVIDIA and other providers.",
        detail: "Change the base URL and keep the SDK. Keys, usage and a playground live in one dashboard. Prompts and outputs are not retained.",
        securityNote: "Dashboard identity and API keys are separate systems on purpose. A leaked key should never become a dashboard session.",
        tags: ["Applied AI", "Gateway", "API"],
        points: [
          "OpenAI-shaped requests with streaming passed through untouched",
          "Provider routing behind one key",
          "Usage visibility per key",
          "Playground for latency and output checks",
          "Dashboard identity kept separate from API keys",
          "No prompt or output retention"
        ]
      },
      {
        title: "Driped",
        slug: "driped",
        label: "Subscriptions, found in receipts",
        shortImage: "assets/projects/short/driped.webp",
        detailedImage: "assets/projects/detailed/driped.webp",
        logo: "assets/logos/driped.svg",
        caseStudyUrl: "work/driped/",
        liveUrl: "https://driped.in",
        repoUrl: "https://github.com/Abhinavv-007/DRIPED-Web",
        url: "work/driped/",
        type: "Spend tracker",
        description: "Finds recurring charges by reading the receipts already in your inbox. No bank connection.",
        detail: "Deterministic parsing handles most receipts on the device. A model on Cloudflare Workers AI takes only the low-confidence ones, and only a trimmed slice of the message leaves the phone.",
        securityNote: "The Gmail scope is read-only and as narrow as the feature allows. What leaves the device is the decision I spent the longest on.",
        tags: ["Finance", "Applied AI", "Flutter"],
        points: [
          "Gmail receipt scanning with the narrowest read scope",
          "Merchant, amount and billing-cycle extraction",
          "Reminders before a renewal charges",
          "Category and forecast views",
          "Web and Android",
          "Model fallback only when confidence is low"
        ]
      },
      {
        title: "trgt",
        slug: "trgt",
        label: "Race-weekend intelligence",
        shortImage: "assets/projects/short/trgt.webp",
        detailedImage: "assets/projects/detailed/trgt.webp",
        logo: "assets/logos/trgt.svg",
        caseStudyUrl: "work/trgt/",
        liveUrl: "https://trgt.in",
        repoUrl: "https://github.com/Abhinavv-007/f1",
        url: "work/trgt/",
        type: "Formula 1 platform",
        description: "Formula 1 session data, podium predictions with server-side lockouts, and AI race notes in one place.",
        detail: "Predictions lock when a session starts and score when it ends. Snapshot mode keeps pages working when the upstream feed stalls.",
        securityNote: "The lockout is enforced on the server, not in the client. A prediction game is only fair if the deadline cannot be argued with.",
        tags: ["Realtime", "Sports", "Applied AI"],
        points: [
          "Live session state and circuit context",
          "Predictions locked server-side at session start",
          "Badges and leaderboard scoring",
          "Gemini race notes built from session snapshots",
          "Snapshot mode for unstable feeds",
          "Cloudflare D1 with Prisma"
        ]
      },
      {
        title: "Modih Mail",
        slug: "modih-mail",
        label: "Disposable email, done properly",
        shortImage: "assets/projects/short/modih.webp",
        detailedImage: "assets/projects/detailed/modih.webp",
        logo: "assets/logos/modih.svg",
        caseStudyUrl: "work/modih-mail/",
        liveUrl: "https://modih.in",
        repoUrl: "https://github.com/Abhinavv-007/modih-email",
        url: "work/modih-mail/",
        type: "Disposable email",
        description: "Temporary @modih.in inboxes with OTP extraction, owner tokens, automatic expiry and a developer API.",
        detail: "Inbound mail arrives through Cloudflare Email Routing, is parsed and sanitised in a Worker, and is stored in D1 and KV until it expires. Turnstile and quotas keep the free tier usable.",
        securityNote: "Every message body is sanitised before it is rendered, and owner tokens are scoped to one inbox. Untrusted HTML is the whole product, so rendering it safely is the whole job.",
        tags: ["Email", "Cloudflare", "API"],
        points: [
          "Instant inbox creation",
          "OTP pulled out of the message body",
          "Owner tokens instead of accounts",
          "HTML mail sanitised before render",
          "Hourly cleanup of expired mail",
          "API keys for automated testing"
        ]
      }
    ],

    researchPapers: [
      {
        title: "Data for Sale",
        slug: "data-for-sale",
        label: "The invisible trade in personal data",
        shortImage: "assets/projects/short/data-for-sale.webp",
        detailedImage: "assets/projects/detailed/data-for-sale.webp",
        logo: "assets/logos/data-for-sale.svg",
        url: "https://abhnv.in/research/paper/",
        type: "Research paper",
        description: "How personal data is collected, packaged and sold, who buys it, and what the trade costs the people it is about.",
        tags: ["Privacy", "Data markets", "Research"]
      },
      {
        title: "The Hidden Watts of Attention",
        slug: "hidden-watts",
        label: "The energy cost of behavioural surveillance",
        shortImage: "assets/projects/detailed/hidden-watts.svg",
        detailedImage: "assets/projects/detailed/hidden-watts.svg",
        logo: "assets/logos/hidden-watts.svg",
        url: "https://abhnv.in/research/paper2/",
        type: "Research paper",
        description: "An estimate of the electricity consumed by the recommendation and ad-targeting inference running behind everyday feeds.",
        tags: ["Energy", "Surveillance", "Research"]
      },
      {
        title: "The Glass Ballot Box",
        slug: "glass-ballot-box",
        label: "Verifiable voting without giving up the secret ballot",
        shortImage: "assets/projects/short/glass-ballot.webp",
        detailedImage: "assets/projects/detailed/glass-ballot.webp",
        logo: "assets/logos/glass-ballot.svg",
        url: "https://abhnv.in/research/paper3/",
        type: "Research paper with prototype",
        description: "A blockchain-backed voting architecture where every step leaves evidence, with a working prototype you can try.",
        tags: ["Civic tech", "Cryptography", "Research"]
      }
    ],

    security: {
      since: "March 2026",
      intro: [
        "I test web applications and APIs on Bugcrowd programs. Most of my findings are about trust: a server that acts on an identifier without checking who owns it, a flow that can be reordered, a login that links identities too loosely.",
        "Every test runs between accounts I created, with data I invented, and stops at the smallest request that proves the problem. Whatever I change, I put back."
      ],
      areas: [
        {
          id: "authorization",
          title: "Authorization",
          short: "Who is allowed to do this?",
          what: "Endpoints that act on an object without confirming the caller owns it, roles enforced in the interface but not on the server, and privilege that leaks through secondary routes such as exports, search or bulk actions.",
          why: "Authorization bugs look like features to a scanner. They are found by understanding the data model, and they usually expose other people's data.",
          how: "Two controlled accounts, my own objects, and one request that demonstrates the cross-account read or write."
        },
        {
          id: "idor",
          title: "IDOR / BOLA",
          short: "Object references without ownership checks",
          what: "Sequential or guessable identifiers, identifiers exposed by one response and accepted by another, and the same object reachable through several routes with different checks.",
          why: "One missing ownership check turns every user's record into a public one.",
          how: "I swap identifiers between my own accounts only. I never enumerate real users."
        },
        {
          id: "authentication",
          title: "Authentication",
          short: "Identity, sessions and recovery",
          what: "Password reset and verification flows, session lifetime after logout or a password change, multi-factor steps that can be bypassed through an alternate flow, and tokens that outlive their purpose.",
          why: "Recovery flows are written once and rarely revisited. They are where the strongest login gets undone.",
          how: "Own accounts, own tokens, own devices. Nothing is tested against an account I do not hold."
        },
        {
          id: "oauth",
          title: "OAuth 2.0 / OIDC",
          short: "Delegated login and account linking",
          what: "Redirect URI validation, state and PKCE handling, scope escalation, and how an application links a third-party identity to a local account.",
          why: "A loose link between identity providers can hand over an account without a password ever being wrong.",
          how: "Test applications and test identities that I control on both sides of the flow."
        },
        {
          id: "api",
          title: "APIs",
          short: "The contract behind the interface",
          what: "Hidden or older versioned routes, mass assignment, differences between the mobile and web APIs, rate limits that exist only in the client, and error messages that reveal internals.",
          why: "The interface is one client. The API is the product, and it is usually more permissive than the screens suggest.",
          how: "Read the client first, then the API. Rate-limit checks stay far below anything that could affect service."
        },
        {
          id: "logic",
          title: "Business logic",
          short: "Steps that can be skipped, repeated or reordered",
          what: "Payments, coupons, quotas, invitations, approvals, and anything with a state machine that assumes users follow the intended order.",
          why: "Logic flaws pass every automated check because every request is valid on its own.",
          how: "Smallest quantities, my own balance, and reversal of anything I change."
        },
        {
          id: "ssrf",
          title: "SSRF",
          short: "Servers fetching user-chosen URLs",
          what: "URL importers, webhooks, link previewers and file fetchers that let a user decide where the server connects.",
          why: "A server that follows user-supplied URLs can reach networks and metadata that the user never could.",
          how: "Requests point at endpoints I control. Internal ranges are checked only where the program permits it, and never read past proof."
        },
        {
          id: "xss",
          title: "XSS and unsafe rendering",
          short: "Untrusted content becoming HTML",
          what: "Rich text, file names, markdown, email bodies, templates and postMessage handlers: every place where user content is rendered as markup.",
          why: "Script in another user's browser is an account takeover with extra steps.",
          how: "Harmless proof markers on my own accounts. Nothing persistent is left where another user could see it."
        },
        {
          id: "code",
          title: "Source-code review",
          short: "Reading the function that should contain the check",
          what: "Open-source components, exposed JavaScript bundles and public repositories, read for authorization checks, secrets handling and unsafe defaults.",
          why: "The fastest way to find a missing check is to read the code that should contain it.",
          how: "Static reading and local reproduction against my own instance."
        }
      ],
      method: [
        { title: "Careful scoping", body: "I read the program's scope and rules before anything else. Out-of-scope assets are never touched, and ambiguous ones get a question, not a test." },
        { title: "Controlled accounts", body: "Every test runs between accounts I created for it. No real user, customer or employee is ever the other side of a request." },
        { title: "Synthetic data", body: "The names, files, payments and messages in my tests are invented. Nothing personal from the target is copied, and nothing real is uploaded." },
        { title: "Minimum-impact proof", body: "The proof is the smallest request that shows the flaw. No mass reads, no automation against production data, no denial of service, no lateral movement." },
        { title: "State restoration", body: "Anything I changed gets reverted: settings, memberships, uploads, test orders. A program should not need to clean up after a report." },
        { title: "Clear reproduction", body: "Reports carry the exact requests, the accounts used, expected versus actual behaviour, and what was checked to rule out a false positive." },
        { title: "Root-cause analysis", body: "I explain why the bug exists, not just where: the missing check, the wrong trust boundary, the assumption baked into the flow." },
        { title: "Actionable remediation", body: "Each report ends with a fix an engineer can ship, and a note on where else the same pattern is likely to live." }
      ],
      patterns: [
        {
          cls: "IDOR / BOLA",
          title: "Object reference without an ownership check",
          found: "An endpoint returned a record by its identifier and validated only that the caller was logged in.",
          proof: "Two test accounts. Account A requested its own record, then Account B's identifier. One request, one response.",
          fix: "Resolve records through the caller's ownership relation instead of the raw identifier, and apply the same check on export and search routes."
        },
        {
          cls: "Authorization",
          title: "Role enforced in the interface only",
          found: "Administrative controls were hidden from regular users, but the API behind them accepted the same requests from any session.",
          proof: "One request from a non-admin test account.",
          fix: "A server-side role check on every mutating route. The interface is a convenience, not a control."
        },
        {
          cls: "Authentication",
          title: "Reset flow trusted client-supplied identity",
          found: "A password-reset step took the account to change from the request body instead of from the verified token.",
          proof: "Own accounts only: the token from A, the identifier from B.",
          fix: "Bind the account to the token when it is issued and ignore any identity carried in the request."
        },
        {
          cls: "OAuth / OIDC",
          title: "Redirect validated by prefix",
          found: "An authorization callback accepted any redirect URI beginning with the registered origin, including paths under a user-controllable route.",
          proof: "A test application I registered. The token was delivered to a page I control.",
          fix: "Exact-match redirect URIs, with state and PKCE on every flow."
        },
        {
          cls: "Business logic",
          title: "Step skipped in a multi-stage flow",
          found: "A checkout could reach confirmation with the payment step replayed from an earlier, cheaper order.",
          proof: "My own cart and the smallest amounts. The order was cancelled and refunded after proof.",
          fix: "Tie each step's token to the current order and re-validate totals on the server at confirmation."
        },
        {
          cls: "SSRF",
          title: "Server fetched a user-chosen URL",
          found: "An import feature fetched a user-supplied URL with no allow-list and followed redirects.",
          proof: "The server made one request to an endpoint I control.",
          fix: "An allow-list of hosts, no redirects into private ranges, and a separate egress identity with no internal reach."
        },
        {
          cls: "XSS",
          title: "Stored content rendered without encoding",
          found: "Display names were inserted into a template without escaping.",
          proof: "A harmless marker on my own profile, visible only to my own second account.",
          fix: "Contextual output encoding plus a Content Security Policy that blocks inline script."
        }
      ],
      report: [
        { field: "Title", value: "Cross-account read of invoices through /api/v2/invoices/{id}" },
        { field: "Severity", value: "High. Any authenticated user can read any other user's invoice." },
        { field: "Asset", value: "[in-scope host, redacted here]" },
        { field: "Accounts used", value: "researcher-a@… and researcher-b@…, both created for this test." },
        { field: "Steps", value: "1. As A, create invoice INV-A. 2. As B, request GET /api/v2/invoices/{INV-A}. 3. Observe 200 with A's invoice body." },
        { field: "Impact", value: "Customer names, amounts and addresses of every user are readable with one request per identifier." },
        { field: "Root cause", value: "The handler loads the invoice by id and checks only that a session exists. Ownership is never compared." },
        { field: "Remediation", value: "Load the invoice through the caller's account relation. Add the same check to /export and /search. Add a regression test with two accounts." },
        { field: "Cleanup", value: "Test invoices deleted. No other user's data was accessed or retained." }
      ],
      builds: [
        { slug: "clex", title: "Clex", note: "Keys generated on the device. The chain stores hashes, not files. The question 'what should the server be allowed to see?' started here." },
        { slug: "clex-ai", title: "Clex AI", note: "Dashboard identity and API keys are separate systems. A leaked key cannot become a dashboard session." },
        { slug: "driped", title: "Driped", note: "The narrowest read-only Gmail scope the feature allows, and only a trimmed slice of a message ever leaves the phone." },
        { slug: "trgt", title: "trgt", note: "Prediction lockouts are enforced on the server. A deadline the client controls is not a deadline." },
        { slug: "modih-mail", title: "Modih Mail", note: "Every message body is sanitised before render and owner tokens are scoped to one inbox." }
      ]
    },

    certifications: [
      { title: "Google Cybersecurity", issuer: "Google", url: "https://coursera.org/verify/professional-cert/AOHLGIZVO0HM", tags: ["Security", "Professional certificate"] },
      { title: "Cybersecurity Fundamentals", issuer: "IBM", url: "https://www.credly.com/badges/20def4c9-8b04-4fa0-ac5f-30e42802f0b0", tags: ["Security"] },
      { title: "Cryptography I", issuer: "Stanford University", url: "https://coursera.org/verify/68X34EAOUTGZ", tags: ["Cryptography", "Security"] },
      { title: "Introduction to Applied Cryptography", issuer: "University of London", url: "https://coursera.org/verify/HYQB0ZG2VEAC", tags: ["Cryptography", "Security"] },
      { title: "CS50's Introduction to Artificial Intelligence with Python", issuer: "Harvard University", url: "https://cs50.harvard.edu/certificates/b2a3a725-fafe-4a0e-bb10-7e7f55433bc7", tags: ["AI", "Python"] },
      { title: "CS50's Introduction to Programming with Python", issuer: "Harvard University", url: "https://cs50.harvard.edu/certificates/f45543c6-4430-4399-b015-e4f0a19118dc", tags: ["Programming", "Python"] },
      { title: "CS50x: Introduction to Computer Science", issuer: "Harvard University", url: "https://cs50.harvard.edu/certificates/62867486-5c48-4ef8-8c93-c01c59f27dca", tags: ["Computer science"] },
      { title: "Gemini Certified Educator", issuer: "Google for Education", url: "https://edu.google.accredible.com/f4ac1b13-b273-4d5a-b99a-4dc08c3b1f24", tags: ["AI", "Education"] },
      { title: "Generative AI Fundamentals", issuer: "IBM", url: "https://coursera.org/verify/specialization/5Z7BSFCR8TZ3", tags: ["AI", "Specialization"] },
      { title: "AI Foundations for Everyone", issuer: "IBM", url: "https://coursera.org/verify/specialization/HLLF7L2BHM8E", tags: ["AI", "Specialization"] },
      { title: "Elements of AI", issuer: "University of Helsinki", url: "https://certificates.mooc.fi/validate/v3u4c9jcesr", tags: ["AI"] },
      { title: "Ethics of AI", issuer: "University of Helsinki", url: "https://certificates.mooc.fi/validate/lassvl2cm4", tags: ["AI", "Ethics"] },
      { title: "AI in Society: Introduction", issuer: "University of Helsinki", url: "https://courses.mooc.fi/certificates/validate/vh4r8mxx7y4j3nd", tags: ["AI", "Society"] },
      { title: "AI in Society: AI and One Health", issuer: "University of Helsinki", url: "https://courses.mooc.fi/certificates/validate/k5ikuyi9xvnxffu", tags: ["AI", "Society"] },
      { title: "AI in Society: AI and Justice", issuer: "University of Helsinki", url: "https://courses.mooc.fi/certificates/validate/sgnqdw3z98dnm9a", tags: ["AI", "Society"] },
      { title: "AI in Society: AI and Discrimination", issuer: "University of Helsinki", url: "https://courses.mooc.fi/certificates/validate/2jhkpufuytud4pd", tags: ["AI", "Society"] },
      { title: "AI in Society: AI and Democracy", issuer: "University of Helsinki", url: "https://courses.mooc.fi/certificates/validate/4c6wbs6v6k7mt9g", tags: ["AI", "Society"] },
      { title: "Intro to AI", issuer: "Newton School of Technology", url: "https://my.newtonschool.co/course/yubnkx5qb3s7/certificate/744iiktw86iz/verify/", tags: ["AI"] },
      { title: "Deep-dive into ChatGPT and other AI tools", issuer: "Newton School of Technology", url: "https://my.newtonschool.co/course/yubnkx5qb3s7/certificate/3hppu3jaatch/verify/", tags: ["AI"] },
      { title: "The Introduction to the Internet of Things", issuer: "University of Helsinki", url: "https://courses.mooc.fi/certificates/validate/vqgbszbeu79jare", tags: ["IoT", "Systems"] },
      { title: "Introduction to Augmented Reality and ARCore", issuer: "Google", url: "https://coursera.org/verify/RZRMAXMZ6JF0", tags: ["AR", "Mobile"] },
      { title: "Blockchain Basics", issuer: "University at Buffalo", url: "https://coursera.org/verify/YRQDRYVTPE6T", tags: ["Blockchain", "Web3"] },
      { title: "Decentralized Finance (DeFi): The Future of Finance", issuer: "Duke University", url: "https://coursera.org/verify/specialization/QCJKZ0828MR9", tags: ["Finance", "Web3", "Specialization"] },
      { title: "Financial Markets", issuer: "Yale University", url: "https://coursera.org/verify/16N19GG1SQRJ", tags: ["Finance"] },
      { title: "Entrepreneurship", issuer: "Wharton Online", url: "https://coursera.org/verify/specialization/9ZVCVEY4IL0A", tags: ["Business", "Specialization"] },
      { title: "Introduction to Psychology", issuer: "Yale University", url: "https://coursera.org/verify/T5LFR8551QNE", tags: ["Humanities"] },
      { title: "Global Diplomacy: The United Nations in the World", issuer: "University of London", url: "https://coursera.org/verify/6866MOD89SQ3", tags: ["Humanities", "Policy"] }
    ]
  };
}));
