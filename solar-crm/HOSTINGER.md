# Deploying on Hostinger (Node.js hosting)

Works on Hostinger plans that include **Node.js apps** (Business / Cloud web hosting, or a VPS with Node).
Ordinary PHP-only shared hosting cannot run this app.

## 1. Upload
hPanel → **Websites → Add website → Node.js App → Upload your website files** → upload `solar-crm-hostinger.zip`
(or connect GitHub: repo `tigersrini/share`, branch `ccr-301ee8a7-vajius` / `main`, **root directory `solar-crm`**).

## 2. Build settings
| Setting | Value |
| --- | --- |
| Node.js version | 22.x (20.9+ works) |
| Install command | `npm install` |
| Build command | `npm run vercel-build` |
| Start command | `npm start` |
| Entry / root | the folder containing `package.json` |

`vercel-build` = generate Prisma client → create/upgrade database tables → (optional first-time seed) → `next build`.
It needs no SSH.

## 3. Environment variables (Node.js app → Environment variables)
| Name | Value |
| --- | --- |
| `DATABASE_URL` | your Postgres URL, e.g. Neon's **direct (non-pooled)** string ending `?sslmode=require` |
| `AUTH_SECRET` | any long random string (`openssl rand -base64 32`) — signs login cookies |
| `NODE_ENV` | `production` |

First deploy only (creates the admin login, optionally demo data):

| Name | Value |
| --- | --- |
| `SEED_ON_BUILD` | `true` (set to `false` or delete after the first successful build) |
| `ADMIN_EMAIL` | e.g. `admin@sanacara.com` |
| `ADMIN_PASSWORD` | a strong password |
| `SEED_DEMO` | `true` only if you want fictional demo data; leave unset for a clean start |
| `DEMO_CREW_PASSWORD` | only needed with `SEED_DEMO=true` (password for the sample crew login) |

The database must be PostgreSQL (Neon, Supabase, Railway…). Hostinger's built-in MySQL will not work.

## 4. Domain & HTTPS
Attach `crm.sanacara.com` (or your domain) to the Node.js app in hPanel; SSL is issued automatically.

## 5. After first deploy
Sign in, change the admin password under *My account*, set `SEED_ON_BUILD=false`, redeploy once.

## VPS alternative (SSH)
```bash
# Ubuntu 22/24 VPS, as root
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs nginx git certbot python3-certbot-nginx
npm i -g pm2
git clone https://github.com/tigersrini/share.git && cd share/solar-crm
cat > .env <<ENV
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
AUTH_SECRET="$(openssl rand -base64 32)"
ENV
npm ci && npx prisma migrate deploy && npm run build
ADMIN_EMAIL=admin@sanacara.com ADMIN_PASSWORD='choose-a-strong-one' npm run db:seed
pm2 start npm --name solar-crm -- start && pm2 save && pm2 startup
# nginx: proxy_pass http://127.0.0.1:3000; then: certbot --nginx -d crm.sanacara.com
```
