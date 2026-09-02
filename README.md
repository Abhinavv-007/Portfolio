# abhnv.in — The Build Journal

The personal site of **Abhinav Raj**, security researcher and product builder.
Security research on Bugcrowd programs since March 2026 (global Top 50 in June
and July 2026). Builder of Clex, Clex AI, Driped, trgt and Modih Mail.

Live: https://abhnv.in

## What is here

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `index.html` | Profile: who I am, timeline, focus, the five products |
| `/security` | `security.html` | Research areas, the authorization lab, methodology, report format, disclosure |
| `/work` | `work.html` | Builds archive and research papers |
| `/work/<slug>/` | `work/*/index.html` | Case studies (rendered from `case-studies.js` + `case-studies-extras.js`) |
| `/credentials` | `credentials.html` | Skills and 27 verified certificates |
| `/api` | `api.html` + `functions/api/*` | Read-only JSON API and its documentation |
| `/contact` | `contact.html` | Contact form (Resend, via `functions/api/contact.js`) |
| `/terminal` | `terminal.html` | Command desk. The same engine opens on every page with `/` or Ctrl/Cmd+K |
| `/research/paper*/` | `research/` | Pre-built research papers (React bundles) |
| `/.well-known/security.txt` | `.well-known/security.txt` | Security contact (RFC 9116) |

Everything user-facing reads from **one file: `data.js`**. It is a UMD module,
so the browser gets `window.PORTFOLIO` and the Pages Functions import the same
object. Change a product, a credential or a research area there and both the
pages and the API update.

## Stack

Static HTML, one stylesheet, vanilla JavaScript, no build step. Hosted on
Cloudflare Pages with Pages Functions for `/api/*`. Security headers live in
`_headers`, redirects in `_redirects`.

## Run it locally

The site uses clean URLs (`/work`, not `/work.html`) and the `/api` routes need
Pages Functions, so run it with Wrangler:

```bash
npx wrangler pages dev . --ip 127.0.0.1 --port 8788
open http://127.0.0.1:8788/
```

The contact form needs `RESEND_API_KEY` (and optionally `CONTACT_TO_EMAIL`,
`CONTACT_FROM_EMAIL`) as Pages environment variables. Locally, put them in
`.dev.vars`. Without them the form returns a friendly "not available" message.

## Editing

- Copy and data: `data.js`
- Case studies: `case-studies.js` (structure) and `case-studies-extras.js` (direction, lessons, pull quote)
- Behaviour: `app.js` (shared), `api-page.js` (API docs page)
- Styles: `styles.css` (new work is appended under "Pass 57")
- Security contact: `.well-known/security.txt` (the `Expires` line must be refreshed before September 2027)

## Products

[clex.in](https://clex.in) · [ai.clex.in](https://ai.clex.in) · [driped.in](https://driped.in) · [trgt.in](https://trgt.in) · [modih.in](https://modih.in)
