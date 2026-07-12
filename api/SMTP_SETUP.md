# Email Setup for Certificate Emails (IQmath)

Certificates are emailed from the API. **On Render Free, use Resend** — free web services [block outbound SMTP](https://render.com/docs/free) on ports 25 / 465 / 587, so Gmail SMTP will hang with `Connection timeout`.

| Environment | Recommended |
|-------------|-------------|
| **Render (production)** | `RESEND_API_KEY` (HTTPS API) |
| **Local development** | Resend **or** Gmail SMTP |

---

## A. Resend (production on Render Free)

1. Create an account at [resend.com](https://resend.com).
2. **Domains** → add `iqmath.in` and add the DNS records Resend shows (SPF/DKIM).
3. **API Keys** → create a key → copy `re_...`.
4. Set on Render (and optionally in `api/.env`):

```env
RESEND_API_KEY=re_xxxxxxxx
SMTP_FROM_NAME=IQmath Technologies
SMTP_FROM_EMAIL=contact@iqmath.in
PUBLIC_SITE_URL=https://www.iqmath.in
```

> Until the domain is verified, you can test with `SMTP_FROM_EMAIL=onboarding@resend.dev` (Resend’s sandbox sender).

5. Redeploy / restart the API.
6. Issue Certificates → **Email test** → send to yourself.

When `RESEND_API_KEY` is set, the API uses Resend and **ignores** SMTP host settings.

---

## B. Gmail SMTP (local / paid Render only)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contact@iqmath.in
SMTP_PASS=your-16-char-google-app-password
SMTP_FROM_NAME=IQmath Technologies
SMTP_FROM_EMAIL=contact@iqmath.in
PUBLIC_SITE_URL=https://www.iqmath.in
```

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | Mail provider SMTP server |
| `SMTP_PORT` | Usually `587` (STARTTLS) or `465` (SSL — set `SMTP_SECURE=true`) |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 |
| `SMTP_USER` | SMTP login (usually full email) |
| `SMTP_PASS` | App-specific password |
| `SMTP_FROM_EMAIL` | "From" address |
| `SMTP_FROM_NAME` | Display name |
| `PUBLIC_SITE_URL` | Used in verify links |

### Gmail / Google Workspace (`contact@iqmath.in`)

1. Enable **2-Step Verification**.
2. Create an **App Password** (Mail → Other).
3. Paste into `SMTP_PASS` (not your normal password).

### Other providers

- Zoho: `smtp.zoho.in` / `smtp.zoho.com`, port `587`
- Microsoft 365: `smtp.office365.com`, port `587`

---

## Test

1. Open **Issue Certificates**.
2. **Email test** panel → enter your address → **Test**.
3. Or:

```bash
curl -X POST http://localhost:3002/api/email/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"you@example.com"}'
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Connection timeout` on Render | Stop using Gmail SMTP; set `RESEND_API_KEY` |
| `Resend failed (403)` / domain | Verify `iqmath.in` in Resend, or use `onboarding@resend.dev` for tests |
| `PDF not found` on resend | Instance restarted (ephemeral disk); use **Resend Emails** — API regenerates missing PDFs |
| Local SMTP auth failed | App Password + 2FA; no spaces in `SMTP_PASS` |
