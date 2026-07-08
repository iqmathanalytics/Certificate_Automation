# Certificate Automation

Standalone certificate template editor and PDF generation, extracted from the Nexperts Exam Portal `feature/certificate-template-editor` work.

This repository contains **only** the certificate automation code — not the full exam portal.

## What's included

- **UI** (`ui/`) — drag-and-drop certificate template editor with live preview (same as `/admin/certificate-template`)
- **API** (`api/`) — save template config, upload background image, generate certificate PDFs via Puppeteer

## Quick start

### 1. API

```bash
cd api
cp .env.example .env
# Set DATABASE_URL in .env
npm install
npm run db:push
npm run dev
```

API runs at http://localhost:3001

### 2. UI

```bash
cd ui
cp .env.example .env
npm install
npm run dev
```

UI runs at http://localhost:8080

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/certificate-config` | Load saved template config |
| PUT | `/api/certificate-config` | Save template config + layout positions |
| POST | `/api/certificate-config/image` | Upload new background template (multipart `image`) |
| POST | `/api/certificate-config/preview-pdf` | Generate a sample PDF |

## PDF generation

Requires Chrome for Puppeteer in development:

```bash
cd api
npx puppeteer browsers install chrome
```

## Source

Extracted from [Nexperts-Exam-Portal](https://github.com/iqmathanalytics/Nexperts-Exam-Portal) commit `320de2f` (Add admin certificate template editor).
