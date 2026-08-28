# Bulk SMS Sender

A small Next.js (TypeScript) platform for sending bulk SMS through Africa's Talking:
paste or upload your recipient numbers, write a message, hit send.

## 1. Install dependencies

```bash
npm install
```

## 2. Configure credentials

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:

| Variable | Meaning |
|---|---|
| `AT_USERNAME` | Your Africa's Talking username (`sandbox` for the test app) |
| `AT_API_KEY` | Your Africa's Talking API key |
| `AT_ENV` | `sandbox` while testing, `production` to send real SMS to any number |
| `AT_SENDER_ID` | Optional. Your approved alphanumeric Sender ID / shortcode. Leave blank to use AT's default |
| `NEXT_PUBLIC_DEFAULT_COUNTRY_CODE` | Country code (no `+`) used to expand numbers typed as `07xxxxxxxx`. Defaults to `254` (Kenya) |

`.env.local` is gitignored — your keys never get committed.

## 3. Run it

```bash
npm run dev
```

Open http://localhost:3000. Paste numbers (one per line, or comma-separated) into the
Recipients box, or click **Upload CSV / TXT** to pull numbers out of an exported file —
it scans every column/line for phone-like tokens, so a name/email/phone export works fine.
Write your message, then click **Send**.

## Sandbox vs. production

While `AT_ENV=sandbox`, Africa's Talking only delivers to phone numbers you've registered
as simulator recipients in your sandbox app on the AT dashboard — this mirrors the
`sms_sandbox_test.py` behavior already in this project. Switch `AT_ENV=production` and use
your live username/API key once you're ready to send to real numbers.

## How sending works

- All numbers are normalized and de-duplicated server-side before sending.
- One message + recipient list is sent to Africa's Talking's bulk messaging endpoint
  (`POST /version1/messaging`) directly, in batches of 100 numbers per request, so a
  large list doesn't become one oversized call.
- Credentials stay server-only (`lib/africastalking.ts`, used only from the
  `app/api/send-sms` route handler) — they're never sent to the browser.
- The results table after sending reflects Africa's Talking's actual per-number
  delivery status/cost/message ID.

## TLS note

Africa's Talking's API servers require legacy TLS renegotiation, which OpenSSL 3.0+
(bundled with both modern Node.js and modern Python) disables by default — this is the
same issue your `sms_live_send.py` / `sms_sandbox_test.py` scripts patch around with
`ssl.OP_LEGACY_SERVER_CONNECT`. `lib/africastalking.ts` applies the equivalent fix on the
Node side (`crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT`), so you shouldn't need to
touch this — it's just here so future-you knows why it's there if a TLS error shows up
after a Node/OpenSSL upgrade.

## Known dependency note

`npm audit` will flag the postcss version vendored *inside* `next`'s own build tooling
(a transitive dependency, not this project's own postcss). Fixing it requires upgrading
to Next.js 16, which has App Router breaking changes. The flagged issues concern
processing untrusted CSS input, which doesn't apply here since only this project's own
Tailwind config is processed — low real-world risk for now, but worth revisiting on a
future Next.js major upgrade.

## Project structure

```
app/
  page.tsx              Main UI (recipients, message, send, results)
  api/send-sms/route.ts API route that batches and sends via Africa's Talking
lib/
  africastalking.ts     Server-only Africa's Talking REST client (credentials, TLS fix)
  phone.ts              Shared number parsing/validation + SMS segment estimate
```
