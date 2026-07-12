# Deploy: Cloudflare Pages (UI) + Render (API)

GitHub repo: `https://github.com/iqmathanalytics/Certificate_Automation`

| Piece | Platform | URL example |
|-------|----------|-------------|
| UI | Cloudflare Pages | `https://www.iqmath.in/certificates` or `https://certificates.iqmath.in` |
| API | Render Web Service | `https://iqmath-certificates-api.onrender.com` |
| DB | Render MySQL | Internal `DATABASE_URL` |

**Push your latest code to `main` before connecting either service.**

```bash
cd "e:\Certificate Automation\Certificate_Automation"
git add -A
# do not commit api/.env
git status
git push origin main
```

---

## Part A — Render (API + MySQL)

### A1. Create MySQL

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New** → **MySQL**
2. Name: `iqmath-certificates-db`
3. Create and wait until it is **Available**
4. Copy **Internal Database URL** (preferred) or External URL

### A2. Create Web Service (GitHub)

1. **New** → **Web Service** → **Connect GitHub**
2. Authorize Render → select `iqmathanalytics/Certificate_Automation`
3. Settings:

| Field | Value |
|-------|--------|
| Name | `iqmath-certificates-api` |
| Region | Singapore (or closest to you) |
| Branch | `main` |
| Root Directory | `api` |
| Runtime | Node |
| Build Command | `npm install && npx prisma generate && npx prisma db push && npm run build` |
| Start Command | `npm start` |
| Instance | **Standard** or higher (Puppeteer needs RAM; free tier often fails) |

4. **Environment** → add:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<paste Render MySQL Internal URL>
PUBLIC_SITE_URL=https://www.iqmath.in
CLIENT_URLS=https://www.iqmath.in,https://certificates.iqmath.in

ADMIN_EMAIL=contact@iqmath.in
ADMIN_PASSWORD=<strong-password>
AUTH_SECRET=<long-random-32+-chars>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contact@iqmath.in
SMTP_PASS=<gmail-app-password>
SMTP_FROM_NAME=IQmath Technologies
SMTP_FROM_EMAIL=contact@iqmath.in
```

> Render sets `PORT` automatically on some plans. If the service fails to bind, use `PORT` from Render’s docs / logs (often `10000`). Your app already reads `process.env.PORT`.

5. Click **Create Web Service** and wait for the first deploy.
6. Open `https://<your-service>.onrender.com/health` → expect `{"ok":true}`

### A3. Optional custom API domain

1. Render service → **Settings** → **Custom Domains** → `api-certificates.iqmath.in`
2. Add the CNAME Render shows in Cloudflare DNS for `iqmath.in`
3. Use that URL as `VITE_API_URL` on Cloudflare Pages

---

## Part B — Cloudflare Pages (UI)

### B1. Create Pages project (GitHub)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Connect GitHub → select `iqmathanalytics/Certificate_Automation`
3. Build settings:

| Field | Value |
|-------|--------|
| Project name | `certificate-automation` (or similar) |
| Production branch | `main` |
| Root directory | `ui` |
| Framework preset | Vite (or None) |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |

> The build nests the app under `dist/certificates/` so URLs like  
> `/certificates/assets/*.js` resolve correctly (fixes MIME type errors).  
> `prepare-pages.mjs` also copies the React shell to `dist/index.html` + `404.html`  
> and writes `_redirects` so `/certificates/login` loads the app (not a stub page).

4. **Environment variables** (Production):

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://iqmath-certificates-api.onrender.com` |

5. **Save and Deploy**

Test: `https://certificate-automation.pages.dev/certificates/login`

### B2. Put the app on `www.iqmath.in/certificates`

Your main site already uses `www.iqmath.in` on Cloudflare. Add a **Worker** that proxies `/certificates*` to the Pages project.

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Worker**
2. Name: `iqmath-certificates-path`
3. Paste the code from [`ui/cloudflare-worker-certificates.js`](./ui/cloudflare-worker-certificates.js)
4. **Deploy**
5. Worker → **Settings → Domains & Routes → Add route**:
   - Route: `www.iqmath.in/certificates*`
   - Zone: `iqmath.in`
6. Open **https://www.iqmath.in/certificates/login**

Also ensure Render `CLIENT_URLS` includes:

```env
CLIENT_URLS=https://www.iqmath.in,https://certificate-automation.pages.dev
```

### B3. Optional: custom subdomain instead

If you prefer `https://certificates.iqmath.in` (no Worker):

1. Change Vite `base` to `/` and `outDir` to `dist` (simpler root deploy)
2. Pages → Custom domains → `certificates.iqmath.in`

Path-based (`www.iqmath.in/certificates`) is what the Worker above enables.

---

## Part C — After both are live

1. Open UI login → sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
2. Template Editor → confirm background image loads
3. Issue Certificates → upload a small CSV (without email first)
4. Open verify URL from the batch
5. SMTP test from Issue page
6. Issue again with **Send emails** checked

### CORS

`CLIENT_URLS` on Render must include every UI origin you use:

- `https://www.iqmath.in`
- `https://certificates.iqmath.in`
- `https://iqmath-certificates.pages.dev` (preview)

### Auto-deploy

Both platforms redeploy on every push to `main` (GitHub connection).

---

## Checklist

- [ ] Latest code pushed to GitHub `main`
- [ ] Render MySQL created
- [ ] Render Web Service healthy (`/health`)
- [ ] Cloudflare Pages build succeeded
- [ ] `VITE_API_URL` = Render API URL
- [ ] Admin login works
- [ ] PDF generation works (needs enough Render RAM)
- [ ] Email + verify link work
- [ ] `ADMIN_PASSWORD` and `AUTH_SECRET` are strong (not local defaults)

---

## Common failures

| Symptom | Fix |
|---------|-----|
| Pages build OK but blank app / 404 assets | Base path mismatch — use subdomain + `base: "/"` or fix Worker path mapping |
| Login `ERR_CONNECTION_REFUSED` / CORS | Wrong `VITE_API_URL` or missing origin in `CLIENT_URLS` |
| `Can't reach database` | Wrong `DATABASE_URL`; use Render **Internal** URL from same region |
| PDF / Puppeteer crash | Upgrade Render plan; confirm `NODE_ENV=production` |
| Emails fail | Gmail App Password in `SMTP_PASS`; 2FA enabled on Google account |
| Image 401 | Template image route must stay public (already fixed in latest API) |
