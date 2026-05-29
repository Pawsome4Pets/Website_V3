# Pawsome 4 Pets — Vercel deployment guide

End-to-end steps to put the site live on Vercel against your Afrihost MySQL
database. Frontend (React/Vite) and backend (Express + Prisma) deploy together
as a single Vercel project — the Express app is wrapped as a serverless
function at `api/index.js`.

---

## 0. What's already done

The repo is wired for Vercel:

| File | Purpose |
| --- | --- |
| `api/index.js` | Vercel serverless function entry — imports the Express app |
| `server/src/app.js` | Express app factory (no `.listen()`) |
| `server/src/index.js` | Local-dev only — runs the app on `PORT` |
| `vercel.json` | Build command, `dist` output, `/api/*` rewrites |
| `package.json` (root) | All runtime deps mirrored here so Vercel installs them |
| `server/.env.production` | Afrihost MySQL URL + admin/SMTP creds (NOT committed) |

The Afrihost MySQL schema has already been pushed and seeded:

```
DATABASE_URL = mysql://pawsocsu_Pawsome4pets:****@basim.aserv.co.za:3306/pawsocsu_Pawsome4PetsWEB
admin@pawsome4pets.co.za   (seeded)
```

---

## 1. Push the project to GitHub (or GitLab/Bitbucket)

Vercel needs a Git provider to deploy from. From the project root:

```powershell
git init
git add .
git commit -m "Initial commit — ready for Vercel"
gh repo create pawsome4pets --private --source=. --push   # uses gh CLI
# …or manually create a repo on github.com and:
# git remote add origin https://github.com/<you>/pawsome4pets.git
# git branch -M main
# git push -u origin main
```

The `.gitignore` already excludes `.env*` files so your secrets stay local.

---

## 2. Import the project on Vercel

1. Go to https://vercel.com/new
2. Pick the GitHub repo you just pushed
3. Framework Preset → **Vite** (auto-detected)
4. Build Command → leave as **default** (it reads `vercel.json` →
   `npm run vercel-build`)
5. Output Directory → leave as **default** (`dist`)
6. **DON'T click Deploy yet** — add env vars first

---

## 3. Add environment variables on Vercel

In the import screen, expand **Environment Variables** and paste every line
from `server/.env.production`. Apply to **Production**, **Preview**, **Development**.

The minimum set the API needs to boot:

| Key | Value (copy from `server/.env.production`) |
| --- | --- |
| `DATABASE_URL` | `mysql://pawsocsu_Pawsome4pets:Andy%402020@basim.aserv.co.za:3306/pawsocsu_Pawsome4PetsWEB` |
| `JWT_SECRET` | the long hex string |
| `JWT_EXPIRES_IN` | `7d` |
| `BCRYPT_ROUNDS` | `12` |
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | `*` — leave permissive until you attach a custom domain (see step 6) |
| `SMTP_HOST` | `mail.pawsome4pets.co.za` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `noreply@pawsome4pets.co.za` |
| `SMTP_PASS` | the email account's password |
| `MAIL_FROM` | `Pawsome 4 Pets <noreply@pawsome4pets.co.za>` |
| `RESET_URL_BASE` | `https://<your-project>.vercel.app` (you'll know this after the first deploy — set it then redeploy) |

Optional but recommended once you have a custom domain:

| Key | Value |
| --- | --- |
| `CLIENT_ORIGIN` | `https://pawsome4pets.co.za,https://www.pawsome4pets.co.za` |
| `RESET_URL_BASE` | `https://pawsome4pets.co.za` |

---

## 4. Add Vercel Blob (for form file uploads)

Form submissions can include file uploads. On Vercel the filesystem is
ephemeral, so uploads go to Vercel Blob storage instead of local disk.

1. In your Vercel project → **Storage** tab → **Create Database** →
   choose **Blob**.
2. Vercel auto-creates a `BLOB_READ_WRITE_TOKEN` env var and links it to the
   project. No code change needed — `server/src/routes/uploads.js` detects
   that variable and switches from disk storage to blob.
3. If you skip this step, file uploads will fail at runtime with
   `EROFS: read-only filesystem`.

---

## 5. Deploy

Click **Deploy**. The build runs:

```
npm install
npx prisma generate --schema=./server/prisma/schema.prod.prisma
vite build
```

Then Vercel publishes `dist/` to the CDN and turns `api/index.js` into a
serverless function. First-deploy time is ~2 minutes.

When it finishes you'll get a URL like
`https://pawsome4pets-xxxxx.vercel.app`.

### Smoke-test the deploy

```powershell
# Frontend
curl https://<your-project>.vercel.app/

# API health check
curl https://<your-project>.vercel.app/api/health
# → {"ok":true,"time":"…","env":"production"}

# Admin login (replace password)
curl -X POST https://<your-project>.vercel.app/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@pawsome4pets.co.za","password":"Andy@2020"}'
```

---

## 6. (Optional) Attach a custom domain

1. Vercel project → **Settings** → **Domains** → **Add** → `pawsome4pets.co.za`
2. Vercel shows you the DNS records to set. In Afrihost cPanel → **Zone
   Editor** for `pawsome4pets.co.za`, add:
   - **A** record `@` → `76.76.21.21`
   - **CNAME** `www` → `cname.vercel-dns.com`
3. Wait for DNS to propagate (a few minutes to a few hours).
4. Update these env vars in Vercel (Settings → Environment Variables) and
   redeploy:
   - `CLIENT_ORIGIN` = `https://pawsome4pets.co.za,https://www.pawsome4pets.co.za`
   - `RESET_URL_BASE` = `https://pawsome4pets.co.za`

---

## 7. Day-2 operations

### Re-deploying

Every `git push` to the default branch redeploys automatically.
Every other branch / PR gets a preview URL.

### Database migrations

When you change the Prisma schema:

```powershell
# Locally — generate a migration against your dev SQLite db
cd server
npx prisma migrate dev --name "add-something"

# Then sync the same change to prod (Afrihost)
cd ..
npm run prod:db:push
```

Or — if you want versioned migrations against prod:

```powershell
npm run prod:db:deploy
```

### Re-seeding (e.g. add another admin)

Edit `server/.env.production` `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then:

```powershell
npm run prod:db:seed
```

### Inspecting prod data

```powershell
# Open Prisma Studio against the prod MySQL DB
cd server
npm run prod:studio
```

### Reading API logs

Vercel project → **Logs** tab. Each `/api/*` request shows up there with the
full Express log line.

---

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Function invocation failed` on first request | Open Vercel **Logs** — usually a missing env var. Re-check the list in step 3. |
| `PrismaClientInitializationError` | `DATABASE_URL` is wrong/encoded badly. The `@` in your password must be `%40`. |
| Login returns 401 with a known-good password | The seed didn't run, or you seeded against the wrong DB. Re-run `npm run prod:db:seed`. |
| Uploads fail with `EROFS` | You skipped step 4. Create the Blob store. |
| CORS errors in browser | `CLIENT_ORIGIN` doesn't include the domain the browser is on. Set it (or `*`) and redeploy. |
| Password-reset emails not arriving | `SMTP_*` vars missing or wrong. Test locally with `npm --prefix server run mailtest`. |
| Cold-start is slow (~2-3s first hit) | Normal for serverless. Subsequent requests on a warm function are <100ms. Vercel Pro has reduced cold-start. |

---

## 9. Local development still works

Nothing about local dev changed:

```powershell
npm install
npm run server:install
npm run dev   # starts Vite on :5173 and Express on :4000
```

`/api/*` calls are proxied from Vite to the local Express server, just like
before. The dev DB (`server/prisma/dev.db`, SQLite) is untouched by the
production setup.
