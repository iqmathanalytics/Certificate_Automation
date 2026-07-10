# Certificate Automation — IQmath Technologies

Bulk certificate generation system for [IQmath Technologies](https://www.iqmath.in).

## Features

- **Template editor** — Upload certificate design, set static description, fonts, and drag-to-position text blocks
- **Bulk issuance** — Upload CSV (Name, Email) → auto-generate PDFs with incrementing certificate numbers (`IQ-XXX-XXXXX`)
- **Email delivery** — Professional HTML emails with PDF attachment and verify link
- **Public verification** — `www.iqmath.in/certificate/IQ-XXX-XXXXX`

## Quick start

### 1. Database (MySQL)

```bash
docker run -d --name cert-automation-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=certificate_automation \
  -p 3307:3306 mysql:8
```

### 2. API

```bash
cd api
cp .env.example .env
# Edit DATABASE_URL and SMTP settings
npm install
npm run db:push
npm run dev
```

API runs at http://localhost:3001

### 3. UI

```bash
cd ui
cp .env.example .env
npm install
npm run dev
```

UI runs at http://localhost:8080

## Workflow

1. **Template Editor** (`/template`) — Upload your IQmath certificate background image and configure the static description, fonts, and text positions. Save.
2. **Issue Certificates** (`/issue`) — Upload a CSV with `Name` and `Email` columns, pick the issue date, and click Generate. Certificates are created with IDs like `IQ-001-00001`, `IQ-001-00002`, etc.
3. **Emails** — If SMTP is configured, each student receives their certificate PDF with a verify link.
4. **Verification** — Students and employers can verify at `/certificate/IQ-XXX-XXXXX`.

## CSV format

```csv
Name,Email
Priya Sharma,priya@example.com
Rahul Kumar,rahul@example.com
```

## Certificate number format

`IQ-XXX-XXXXX` where:
- `XXX` = batch number (001, 002, …) — increments per CSV upload
- `XXXXX` = student sequence within batch (00001, 00002, …)

## Email configuration

Add to `api/.env`:

```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME=IQmath Technologies
SMTP_FROM_EMAIL=certificates@iqmath.in
PUBLIC_SITE_URL=https://www.iqmath.in
```

## Production deployment (iqmath.in)

Deploy the UI so these routes are available on your domain:

| Route | Purpose |
|-------|---------|
| `/issue` | Admin: bulk certificate issuance |
| `/template` | Admin: template editor |
| `/certificate/:id` | Public: certificate verification |

Point `VITE_API_URL` to your deployed API. Set `PUBLIC_SITE_URL=https://www.iqmath.in` on the API for correct verify links in emails.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/certificate-config` | Load template config |
| PUT | `/api/certificate-config` | Save template config |
| POST | `/api/certificate-config/image` | Upload template image |
| POST | `/api/certificate-config/preview-pdf` | Download sample PDF |
| POST | `/api/batches` | Upload CSV and start generation |
| GET | `/api/batches` | List recent batches |
| GET | `/api/batches/:id` | Batch status and student list |
| POST | `/api/batches/:id/send-emails` | Resend emails for a batch |
| GET | `/api/verify/:credentialId` | Public certificate lookup |

## PDF generation

Requires Chrome for Puppeteer in development:

```bash
cd api
npx puppeteer browsers install chrome
```
