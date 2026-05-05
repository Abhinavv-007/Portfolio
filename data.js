window.PORTFOLIO = {
  profile: {
    name: "Abhinav Raj",
    publication: "The Build Journal",
    email: "hello@abhnv.in",
    summary: "Full-stack developer focused on AI products, privacy-minded tools, and clear digital experiences."
  },
  marquee: [
    "Let's create something together. Email me"
  ],
  skills: [
    {
      group: "Languages",
      items: ["JavaScript", "TypeScript", "Python", "Dart", "HTML", "CSS", "SQL", "Bash"]
    },
    {
      group: "Frameworks & Runtime",
      items: ["React", "Next.js", "Flutter", "Node.js", "Express", "Tailwind CSS", "Vite"]
    },
    {
      group: "AI & Data",
      items: ["OpenAI / Anthropic / Gemini APIs", "LangChain", "Vector DBs", "Prompt design", "Retrieval (RAG)", "Agents & tools"]
    },
    {
      group: "Cloud & DevOps",
      items: ["Cloudflare Pages", "Cloudflare Workers", "KV / R2", "Vercel", "Resend", "GitHub Actions", "Docker"]
    },
    {
      group: "Design & Tools",
      items: ["Figma", "Photoshop", "Editorial typography", "Motion / CSS animation", "Git", "Linear / Notion"]
    }
  ],
  socials: [
    { label: "LinkedIn", url: "https://www.linkedin.com/in/abhnv07/" },
    { label: "GitHub", url: "https://github.com/Abhinavv-007" },
    { label: "Instagram", url: "https://www.instagram.com/abhinavv.007/" },
    { label: "X", url: "https://x.com/Abhnv8" }
  ],
  projects: [
    {
      title: "CLEX",
      slug: "clex",
      label: "Private file workflows",
      shortImage: "assets/projects/short/clex.webp",
      detailedImage: "assets/projects/detailed/clex.webp",
      logo: "assets/logos/clex.svg",
      caseStudyUrl: "work/clex/",
      liveUrl: "https://clex.in",
      repoUrl: "https://github.com/Abhinavv-007/clex",
      url: "work/clex/",
      type: "Secure file workflows",
      description: "A privacy-first file workspace for moving files between people without default server storage.",
      detail: "CLEX is built for people who need to move files quickly without turning every transfer into a permanent cloud copy. The workspace keeps the send, fallback, and status flow visible so the handoff stays simple.",
      tags: ["Privacy", "File Movement", "WebRTC"],
      points: ["Private transfer flow for direct file movement", "No default server storage for normal handoffs", "Drive fallback when the direct path is not enough", "Simple sender-to-receiver workspace", "Local-first queue handling and packaging", "Clear status for every handoff"]
    },
    {
      title: "CLEX AI",
      slug: "clex-ai",
      label: "One endpoint for models",
      shortImage: "assets/projects/short/clex-ai.webp",
      detailedImage: "assets/projects/detailed/clex-ai.webp",
      logo: "assets/logos/clex.svg",
      caseStudyUrl: "work/clex-ai/",
      liveUrl: "https://ai.clex.in",
      repoUrl: "https://github.com/Abhinavv-007/clex-ai",
      url: "work/clex-ai/",
      type: "AI model gateway",
      description: "An OpenAI-compatible gateway that routes every model through one clean developer endpoint.",
      detail: "CLEX AI reduces provider switching into one predictable API surface. It is meant for builders who want routing, keys, usage visibility, and quick model testing without rewriting the app each time the model changes.",
      tags: ["AI", "Gateway", "Platform"],
      points: ["One endpoint for model providers", "API keys and routing in one place", "Usage visibility for builders and teams", "Playground for quick model tests", "OpenAI-style request shape", "Provider switching without app rewrites"]
    },
    {
      title: "DRIPED",
      slug: "driped",
      label: "Receipt-based spend clarity",
      shortImage: "assets/projects/short/driped.webp",
      detailedImage: "assets/projects/detailed/driped.webp",
      logo: "assets/logos/driped.svg",
      caseStudyUrl: "work/driped/",
      liveUrl: "https://driped.in",
      repoUrl: "https://github.com/Abhinavv-007/DRIPED-Web",
      url: "work/driped/",
      type: "Subscription and spend tracker",
      description: "An AI subscription manager that reads receipts, not bank accounts, to reveal recurring spend.",
      detail: "DRIPED looks at the inbox trail instead of asking for bank access. It turns scattered renewal receipts into a cleaner spend view, with enough structure to catch subscriptions before they quietly renew.",
      tags: ["Finance", "Inbox AI", "Flutter"],
      points: ["Receipt-based spend clarity", "Subscription renewal tracking", "Inbox parsing without bank access", "Cleaner monthly finance view", "Spend categories from real receipts", "Alerts before renewals slip by"]
    },
    {
      title: "TRGT",
      slug: "trgt",
      label: "Race context in real time",
      shortImage: "assets/projects/short/trgt.webp",
      detailedImage: "assets/projects/detailed/trgt.webp",
      logo: "assets/logos/trgt.svg",
      caseStudyUrl: "work/trgt/",
      liveUrl: "https://trgt.in",
      repoUrl: "https://github.com/Abhinavv-007/f1",
      url: "work/trgt/",
      type: "F1 intelligence platform",
      description: "Formula 1 race intelligence, prediction lockouts, AI insights, badges, and leaderboard logic.",
      detail: "TRGT brings race context, predictions, and fan competition into one race-weekend surface. The system is tuned for fast sessions, locked picks, explainable signals, and a scoreboard that keeps the product moving.",
      tags: ["Realtime", "Sports", "AI"],
      points: ["Race context in real time", "Prediction lockouts and scoring", "AI insight layer for quick context", "Badges and leaderboard logic", "Session data in one view", "Built for race-weekend decisions"]
    },
    {
      title: "MODIH Mail",
      slug: "modih-mail",
      label: "Disposable mail, cleaned up",
      shortImage: "assets/projects/short/modih.webp",
      detailedImage: "assets/projects/detailed/modih.webp",
      logo: "assets/logos/modih.svg",
      caseStudyUrl: "work/modih-mail/",
      liveUrl: "https://modih.in",
      repoUrl: "https://github.com/Abhinavv-007/modih-email",
      url: "work/modih-mail/",
      type: "Premium disposable email",
      description: "A premium disposable email system at @modih.in with OTP extraction, API access, and edge-native mail routing.",
      detail: "MODIH Mail takes the disposable inbox idea and gives it a cleaner product surface. It is built for fast signups, OTP capture, testing flows, and throwaway inboxes that still feel controlled.",
      tags: ["Mail", "Cloudflare", "Utility"],
      points: ["Disposable inboxes that feel polished", "OTP extraction and API access", "Edge-native mail routing", "Fast cleanup for throwaway signups", "Short-lived addresses for testing", "Inbox flow without account clutter"]
    }
  ],
  researchPapers: [
    {
      title: "DATA FOR SALE",
      label: "The invisible economy.",
      shortImage: "assets/projects/short/data-for-sale.webp",
      detailedImage: "assets/projects/detailed/data-for-sale.webp",
      logo: "assets/logos/data-for-sale.svg",
      url: "https://www.abhnv.in/research/paper",
      type: "Research on data markets",
      description: "A research paper on personal data markets, hidden incentives, and the economy built from user behavior.",
      tags: ["Research", "Privacy", "Writing"]
    },
    {
      title: "THE GLASS BALLOT",
      label: "Transparency. Privacy. Trust.",
      shortImage: "assets/projects/short/glass-ballot.webp",
      detailedImage: "assets/projects/detailed/glass-ballot.webp",
      logo: "assets/logos/glass-ballot.svg",
      url: "https://www.abhnv.in/research/paper3",
      type: "Research on digital voting",
      description: "The Glass Ballot explores transparency, privacy, and trust in digital voting.",
      tags: ["Research", "Civic Tech", "Trust"]
    }
  ],
  certifications: [
    {
      title: "Gemini Certified Educator",
      issuer: "Google for Education",
      url: "https://edu.google.accredible.com/f4ac1b13-b273-4d5a-b99a-4dc08c3b1f24",
      tags: ["AI", "Education"]
    },
    {
      title: "Cryptography I",
      issuer: "Stanford University",
      url: "https://coursera.org/verify/68X34EAOUTGZ",
      tags: ["Cryptography", "Security"]
    },
    {
      title: "Entrepreneurship",
      issuer: "Wharton Online",
      url: "https://coursera.org/verify/specialization/9ZVCVEY4IL0A",
      tags: ["Specialization", "Business"]
    },
    {
      title: "Introduction to Augmented Reality and ARCore",
      issuer: "Google",
      url: "https://coursera.org/verify/RZRMAXMZ6JF0",
      tags: ["AR", "Mobile"]
    },
    {
      title: "Decentralized Finance (DeFi): The Future of Finance",
      issuer: "Duke University",
      url: "https://coursera.org/verify/specialization/QCJKZ0828MR9",
      tags: ["Specialization", "Web3", "Finance"]
    },
    {
      title: "Introduction to Psychology",
      issuer: "Yale University",
      url: "https://coursera.org/verify/T5LFR8551QNE",
      tags: ["Humanities"]
    },
    {
      title: "Blockchain Basics",
      issuer: "University at Buffalo",
      url: "https://coursera.org/verify/YRQDRYVTPE6T",
      tags: ["Web3", "Blockchain"]
    },
    {
      title: "Introduction to Applied Cryptography",
      issuer: "University of London",
      url: "https://coursera.org/verify/HYQB0ZG2VEAC",
      tags: ["Cryptography", "Security"]
    },
    {
      title: "AI Foundations for Everyone",
      issuer: "IBM",
      url: "https://coursera.org/verify/specialization/HLLF7L2BHM8E",
      tags: ["Specialization", "AI"]
    },
    {
      title: "Global Diplomacy: The United Nations in the World",
      issuer: "University of London",
      url: "https://coursera.org/verify/6866MOD89SQ3",
      tags: ["Humanities", "Policy"]
    },
    {
      title: "Financial Markets",
      issuer: "Yale University",
      url: "https://coursera.org/verify/16N19GG1SQRJ",
      tags: ["Finance"]
    },
    {
      title: "Generative AI Fundamentals",
      issuer: "IBM",
      url: "https://coursera.org/verify/specialization/5Z7BSFCR8TZ3",
      tags: ["Specialization", "AI", "Generative"]
    },
    {
      title: "Google Cybersecurity",
      issuer: "Google",
      url: "https://coursera.org/verify/professional-cert/AOHLGIZVO0HM",
      tags: ["Professional Cert", "Cybersecurity"]
    },
    {
      title: "Deep-dive into ChatGPT and other AI tools",
      issuer: "Newton School of Technology",
      url: "https://my.newtonschool.co/course/yubnkx5qb3s7/certificate/3hppu3jaatch/verify/",
      tags: ["AI", "Productivity"]
    },
    {
      title: "CS50's Introduction to Artificial Intelligence with Python",
      issuer: "Harvard University",
      url: "https://cs50.harvard.edu/certificates/b2a3a725-fafe-4a0e-bb10-7e7f55433bc7",
      tags: ["AI", "Python"]
    },
    {
      title: "Intro to AI",
      issuer: "Newton School of Technology",
      url: "https://my.newtonschool.co/course/yubnkx5qb3s7/certificate/744iiktw86iz/verify/",
      tags: ["AI"]
    },
    {
      title: "Cybersecurity Fundamentals",
      issuer: "IBM",
      url: "https://www.credly.com/badges/20def4c9-8b04-4fa0-ac5f-30e42802f0b0",
      tags: ["Cybersecurity"]
    },
    {
      title: "CS50's Introduction to Programming with Python",
      issuer: "Harvard University",
      url: "https://cs50.harvard.edu/certificates/f45543c6-4430-4399-b015-e4f0a19118dc",
      tags: ["Programming", "Python"]
    },
    {
      title: "CS50x: Introduction to Computer Science",
      issuer: "Harvard University",
      url: "https://cs50.harvard.edu/certificates/62867486-5c48-4ef8-8c93-c01c59f27dca",
      tags: ["Computer Science"]
    },
    {
      title: "Ethics of AI",
      issuer: "University of Helsinki",
      url: "https://certificates.mooc.fi/validate/lassvl2cm4",
      tags: ["AI", "Ethics"]
    },
    {
      title: "Elements of AI",
      issuer: "University of Helsinki",
      url: "https://certificates.mooc.fi/validate/v3u4c9jcesr",
      tags: ["AI"]
    },
    {
      title: "The Introduction to the Internet of Things",
      issuer: "University of Helsinki",
      url: "https://courses.mooc.fi/certificates/validate/vqgbszbeu79jare",
      tags: ["IoT", "Systems"]
    },
    {
      title: "AI in Society: Introduction",
      issuer: "University of Helsinki",
      url: "https://courses.mooc.fi/certificates/validate/vh4r8mxx7y4j3nd",
      tags: ["AI", "Society"]
    },
    {
      title: "AI in Society: AI and One Health",
      issuer: "University of Helsinki",
      url: "https://courses.mooc.fi/certificates/validate/k5ikuyi9xvnxffu",
      tags: ["AI", "Society"]
    },
    {
      title: "AI in Society: AI and Justice",
      issuer: "University of Helsinki",
      url: "https://courses.mooc.fi/certificates/validate/sgnqdw3z98dnm9a",
      tags: ["AI", "Society"]
    },
    {
      title: "AI in Society: AI and Discrimination",
      issuer: "University of Helsinki",
      url: "https://courses.mooc.fi/certificates/validate/2jhkpufuytud4pd",
      tags: ["AI", "Society"]
    },
    {
      title: "AI in Society: AI and Democracy",
      issuer: "University of Helsinki",
      url: "https://courses.mooc.fi/certificates/validate/4c6wbs6v6k7mt9g",
      tags: ["AI", "Society"]
    }
  ],
  notes: [
    {
      number: "01",
      title: "AI-powered workflows",
      body: "Building practical automations, LLM workflows, and systems that make repetitive work easier to manage."
    },
    {
      number: "02",
      title: "Research and writing",
      body: "Writing about data, privacy, product systems, and the trust questions behind everyday technology."
    },
    {
      number: "03",
      title: "Product interfaces",
      body: "Designing interfaces with clear flows, quick feedback, and motion that supports the task."
    }
  ]
};
