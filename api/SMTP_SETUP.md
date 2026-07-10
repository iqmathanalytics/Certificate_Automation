# SMTP Setup for Certificate Emails (IQmath)

Certificate emails are sent from the API using **Nodemailer** and your SMTP provider. Configure these variables in `api/.env`, then restart the API server.

## 1. Edit `api/.env`

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
| `SMTP_HOST` | Your mail provider's SMTP server |
| `SMTP_PORT` | Usually `587` (STARTTLS) or `465` (SSL — set `SMTP_SECURE=true`) |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 |
| `SMTP_USER` | SMTP login (usually full email address) |
| `SMTP_PASS` | Mailbox password or app-specific password |
| `SMTP_FROM_EMAIL` | "From" address shown to recipients |
| `SMTP_FROM_NAME` | Display name (e.g. IQmath Technologies) |
| `PUBLIC_SITE_URL` | Used in verify links inside emails |

## 2. Gmail / Google Workspace (`contact@iqmath.in`)

1. Sign in to the Google account for **contact@iqmath.in** (Google Workspace admin or mailbox owner).
2. Turn on **2-Step Verification** for that account:
   - [Google Account → Security](https://myaccount.google.com/security)
3. Create an **App Password**:
   - Security → 2-Step Verification → App passwords
   - App: **Mail**, Device: **Other** (e.g. "Certificate Automation")
   - Copy the 16-character password (no spaces)
4. Paste it into `SMTP_PASS` in `api/.env` (not your normal Gmail password).
5. Settings:
   - Host: `smtp.gmail.com`
   - Port: `587`, `SMTP_SECURE=false`
   - User: `contact@iqmath.in`
   - From: `contact@iqmath.in`

### Other providers (optional)

#### Zoho Mail

- Host: `smtp.zoho.in` or `smtp.zoho.com`
- Port: `587`, `SMTP_SECURE=false`

#### Microsoft 365 / Outlook

- Host: `smtp.office365.com`
- Port: `587`, `SMTP_SECURE=false`

## 3. DNS (deliverability)

For `contact@iqmath.in` to reach inboxes reliably, ensure your domain has:

- **SPF** — authorizes your SMTP server to send for `iqmath.in`
- **DKIM** — signs outgoing mail (configure in Zoho/Google admin)
- **DMARC** — policy record (optional but recommended)

Your email host's admin panel usually provides the exact DNS records.

## 4. Restart the API

```bash
cd api
npm run dev
```

## 5. Test from the app

1. Open **Issue Certificates** in the UI.
2. In the **SMTP / Email Test** panel, enter your email and click **Test**.
3. Or call the API directly:

```bash
curl -X POST http://localhost:3001/api/email/test \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"you@example.com\"}"
```

## 6. Issue certificates with email

1. Configure SMTP (steps above).
2. On **Issue Certificates**, check **Send certificate emails automatically**.
3. Upload CSV and generate — each student receives a PDF attachment and verify link.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `SMTP not configured` | Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL` in `.env` |
| Authentication failed | Wrong password; use app password if 2FA is enabled |
| Connection timeout | Firewall blocking port 587/465; try alternate port |
| Emails in spam | Add SPF/DKIM in Google Workspace; send from `contact@iqmath.in` |
| Verify link wrong | Set `PUBLIC_SITE_URL=https://www.iqmath.in` |

**Security:** Never commit `api/.env` to git. Use production secrets only on the server.
