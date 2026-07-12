# Certificate Automation — IQmath Technologies

Bulk certificate generation for [IQmath Technologies](https://www.iqmath.in).

**Live paths (production):**

| URL | Purpose |
|-----|---------|
| `www.iqmath.in/certificates/login` | Admin sign-in |
| `www.iqmath.in/certificates/issue` | Bulk certificate issuance |
| `www.iqmath.in/certificates/template` | Template editor |
| `www.iqmath.in/certificates/IQ-FSD-82732` | Public certificate verification |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Cloudflare + API hosting.

## Features

- **Template editor** — Multiple templates, Canva-style layout, issue date on certificate
- **Bulk issuance** — CSV upload, custom ID prefix (e.g. `IQ-FSD-82732`), auto-increment
- **Email delivery** — PDF + verify link from `contact@iqmath.in`
- **Admin login** — Protected issue/template pages
- **Public verification** — `/certificates/{id}`

## Quick start (local)

### 1. Database

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
# Set DATABASE_URL, ADMIN_PASSWORD, SMTP_PASS
npm install
npm run db:push
npm run dev
```

API: http://localhost:3002

### 3. UI

```bash
cd ui
cp .env.example .env
npm install
npm run dev
```

UI: http://localhost:5174/certificates/login

Default admin (set in `api/.env`): `ADMIN_EMAIL` / `ADMIN_PASSWORD`

## CSV format

```csv
Name,Email
Priya Sharma,priya@example.com
```

## Certificate ID format

Prefix + incrementing number, e.g. `IQ-FSD-82732`, `IQ-FSD-82733`.

## Email

See [api/SMTP_SETUP.md](./api/SMTP_SETUP.md) for Gmail / Google Workspace setup.
