# Sparks Racing & Garage — Inventory & Billing

A billing and inventory system for a motorcycle service garage: scan spare
parts into stock, look customers up by phone number, run job cards while
mechanics work on a bike, and generate a final bill you can send straight
to WhatsApp. Built to be hosted online and used from a phone with a login.

Built with Next.js (App Router), Prisma + PostgreSQL, and Tailwind CSS.

## Features

- **Login** — every page and API route requires signing in (email +
  password). No public access; data only ever lives in your hosted
  database.
- **Inventory** — scan a barcode (camera scanner in the browser, or type it
  in) to receive stock. If the barcode already exists it adds to the
  existing quantity; if not, it tries a best-effort online product lookup
  and otherwise lets you type in name, make, cost/selling price and
  quantity. Covers everything from screws to oil, brake shoes, calipers,
  engine parts and pistons — there's no fixed part taxonomy.
- **Customers** — every customer and their vehicles are stored with full
  history. Look a customer up by typing their phone number (partial match
  works) to raise a new job card for them in seconds.
- **Job cards** — when a bike comes in, open a job card against the
  customer + vehicle with their complaint. As mechanics work, they scan a
  part's barcode to add it straight to that job card — inventory is
  deducted automatically and a running total builds up. Labor/service
  charges can be added too, along with vehicle photos (resized/compressed
  in the browser before upload, stored in Vercel Blob). Progression is
  tracked as Waiting → In Service → Ready for Pickup → Delivered.
- **Billing** — generate the final bill from a job card's parts + labor,
  with optional tax % and discount, rendered as a properly formatted PDF
  invoice. Send it over WhatsApp with one tap: the PDF downloads to the
  device and WhatsApp opens directly on that customer's chat (via a
  `wa.me` deep link) with the amount pre-filled — no searching their phone
  number — ready for a single tap to attach the file that just downloaded.
- **Staff & roles** — admins manage staff accounts (`/staff`): create,
  change role, deactivate, reset password. Any signed-in user can change
  their own password at `/account`.
- **Reports** — revenue by day, best-selling parts, and a low-stock list
  with CSV export, at `/reports`.
- **OEM make/model picker** — Make/Model fields show tappable color badges
  for common Indian motorcycle OEMs, ranked by this garage's own real usage
  first (falls back to a static reference list). Still plain text
  underneath, so a rare/custom make can always just be typed.
- **Mobile-first** — a fixed bottom tab bar and full-width touch targets on
  phones, a full top nav on tablets/desktop, and card-based lists (instead
  of wide tables) on small screens. See [Mobile & tablet](#mobile--tablet).

## Getting started

You need a PostgreSQL database (a local one for development, or any hosted
one — see [Hosting](#hosting)).

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy   # or `migrate dev` locally when changing the schema
npm run db:seed             # creates the admin login + demo spare parts/customer
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. The seed
script prints the admin login it created (default
`admin@sparksgarage.com` / `changeme123` unless you set `ADMIN_EMAIL` /
`ADMIN_PASSWORD` env vars before seeding). **Change that password** (or
re-seed with your own) before putting this online.

## Hosting

This is a standard Next.js + Postgres app, so any host that runs Node.js
works:

- **Vercel + a managed Postgres** (Neon, Supabase, Railway, etc.) — set
  `DATABASE_URL` and `AUTH_SECRET` as environment variables, run
  `prisma migrate deploy` against the hosted DB (e.g. via a build step or
  once from your machine), then deploy.
- **A VPS / Docker / Fly.io / Railway app server** — same idea, point
  `DATABASE_URL` at a Postgres instance (managed or self-hosted) and run
  the app with `npm run build && npm run start`.

Generate a real `AUTH_SECRET` for production with `openssl rand -base64
32` — this signs the login session cookie, so treat it like a password.

Vehicle photos need a Vercel Blob store: create one and connect it to the
project (Vercel dashboard → Storage → Create Database → Blob), which
auto-injects `BLOB_READ_WRITE_TOKEN`. Without it, photo uploads will fail
but everything else works fine.

Because auth is required on every route (via `src/proxy.ts`), the app is
safe to put on the public internet — only people with a login (created via
the seed script or directly in the `User` table) can see anything.

## Mobile & tablet

- On phones (`< 640px`) the primary navigation is a fixed bottom tab bar
  (Dashboard / Inventory / Customers / Job Cards / New), and the top bar
  collapses to just the logo and an account menu.
- On tablets and desktops (`>= 640px`) the top bar shows the full nav
  inline instead.
- Tables that don't fit a phone screen (like the inventory list) switch to
  a stacked card layout below the `sm` breakpoint instead of forcing
  horizontal scrolling.
- All forms use full-width, large tap targets, and inputs use appropriate
  `inputMode`/`type` so phones show the right keyboard (numeric, tel,
  email, etc.).

## Notes on things that are best-effort by design

- **Online product lookup** (`src/lib/productLookup.ts`) calls a free,
  keyless UPC lookup API as a convenience. Niche motorcycle spare parts are
  rarely listed in general product databases, so this is expected to miss
  often — the inventory form always lets you type the details in manually
  when it does.
- **WhatsApp sending** has no way to pre-attach a file through a `wa.me`
  link (WhatsApp doesn't support that), and the Web Share API's native
  share sheet can't target a specific contact either — it just hands off
  to WhatsApp's own picker, leaving staff to search the customer's number
  by hand. So instead we download the PDF straight to the device, then
  open a `wa.me/<phone>` link, which *does* jump directly to that exact
  customer's chat with the message pre-filled; the just-downloaded PDF is
  then one 📎 tap away to attach. It's two taps total (open chat, attach
  file) instead of a manual contact search. For fully automatic sending
  with zero taps, from your own business number, wire up the
  [WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
  or a provider like Twilio in `src/lib/shareFile.ts`.
- **OEM badges** are generated color/initials chips, not real brand
  logos — we don't have licensed image assets for motorcycle OEM
  trademarks. Swap `src/lib/oemBadges.ts` for real logo images if you
  license them.
- **Barcode scanning** uses the device camera via `html5-qrcode` in the
  browser (works for 1D barcodes and QR codes). It requires camera
  permission and HTTPS (or localhost) to work; manual barcode entry is
  always available as a fallback everywhere a scanner appears.

## Auth model

Single `User` table with bcrypt-hashed passwords (`src/app/api/auth/login`,
`src/lib/auth.ts`). Logging in sets a signed, HttpOnly JWT cookie
(`sparks_session`, via `jose`); `src/proxy.ts` checks it on every request
and redirects unauthenticated page requests to `/login` (or returns 401 for
API requests). There's no self-signup — add staff accounts by running the
seed script with different `ADMIN_EMAIL`/`ADMIN_PASSWORD` values, or insert
rows into the `User` table directly (hash passwords with bcrypt, cost 10+).

## Data model

See `prisma/schema.prisma` — `User` for logins, `SparePart` / `InventoryTxn`
for stock, `Customer` / `Vehicle` for the customer database, `JobCard` /
`JobCardPart` / `JobCardLabor` for the garage workflow, and `Bill` for the
generated invoice.
