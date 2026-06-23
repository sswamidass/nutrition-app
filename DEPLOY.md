# Deploy NutriTrack to Vercel + Turso

Paste this entire file as a prompt into Claude Code on your computer.

---

## Prompt for Claude Code

I have a Next.js nutrition tracking app at this repo that I need to deploy so I can use it from my phone. The app is already built and ready — you just need to provision the database, deploy it, and seed it with sample data.

**Repo:** `sswamidass/nutrition-app`  
**Branch:** `claude/nutrition-mcp-personal-nmnexv`

**Stack:**
- Next.js 15 (frontend + API routes)
- `@libsql/client` for the database — works locally as a SQLite file and in production pointed at Turso
- Vercel for hosting
- Turso for the hosted SQLite database

**Required env vars the app needs:**
- `DATABASE_URL` — libsql URL from Turso, e.g. `libsql://nutrition-xxxxx.turso.io`
- `DATABASE_AUTH_TOKEN` — auth token from Turso
- `APP_PASSWORD` — a password of your choosing; gates the whole app so only I can access it

---

### What I need you to do

**1. Clone and install**
```bash
git clone https://github.com/sswamidass/nutrition-app.git
cd nutrition-app
git checkout claude/nutrition-mcp-personal-nmnexv
npm install
```

**2. Provision Turso database**

Check if the Turso CLI is installed (`turso --version`). If not, install it:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Then:
```bash
turso auth login          # opens browser to authenticate
turso db create nutrition
turso db show nutrition   # copy the URL (looks like libsql://nutrition-xxxxx.turso.io)
turso db tokens create nutrition  # copy the token
```

**3. Create a `.env.local` for local use (optional but useful)**
```
DATABASE_URL=libsql://nutrition-xxxxx.turso.io
DATABASE_AUTH_TOKEN=<token>
APP_PASSWORD=<pick a password>
```

**4. Seed the hosted database with sample data**
```bash
DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run seed
```

**5. Deploy to Vercel**

Check if the Vercel CLI is installed (`vercel --version`). If not:
```bash
npm install -g vercel
```

Then deploy:
```bash
vercel
```

When prompted:
- Link to existing project? **No** (create new)
- Project name: `nutrition-app` (or anything)
- Which directory: `.` (current)
- Override settings? **No**

After the first deploy, set the environment variables:
```bash
vercel env add DATABASE_URL production
vercel env add DATABASE_AUTH_TOKEN production
vercel env add APP_PASSWORD production
```

Then redeploy to pick them up:
```bash
vercel --prod
```

**6. Verify**

The final output will print a URL like `https://nutrition-app-xxx.vercel.app`. Open it — it should redirect to `/login`, accept the password, and show the diary with seeded data.

**7. Tell me the URL when done** so I can open it on my phone.

---

### If anything goes wrong

- **Build fails on Vercel:** check that all 3 env vars are set — the app will crash on startup without `DATABASE_URL`
- **Login page but password rejected:** double-check `APP_PASSWORD` matches exactly what you set
- **Empty diary:** run the seed command again pointing at the production database URL
- **Turso CLI not found after install:** restart your terminal or run `source ~/.bashrc`
