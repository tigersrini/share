# Sparks Racing & Garage — Inventory & Billing

A billing and inventory system for a motorcycle service garage: scan spare
parts into stock, look customers up by phone number, run job cards while
mechanics work on a bike, and generate a final bill you can send straight
to WhatsApp.

Built with Next.js (App Router), Prisma + SQLite, and Tailwind CSS.

## Features

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
  charges can be added too.
- **Billing** — generate the final bill from a job card's parts + labor,
  with optional tax % and discount. Send it to the customer over WhatsApp
  with one tap (opens WhatsApp with the itemized bill pre-filled via a
  `wa.me` deep link).

## Getting started

```bash
npm install
cp .env.example .env   # or create .env with DATABASE_URL="file:./dev.db"
npx prisma migrate dev
npm run db:seed        # optional: adds demo spare parts + a demo customer
npm run dev
```

Open http://localhost:3000.

## Notes on things that are best-effort by design

- **Online product lookup** (`src/lib/productLookup.ts`) calls a free,
  keyless UPC lookup API as a convenience. Niche motorcycle spare parts are
  rarely listed in general product databases, so this is expected to miss
  often — the inventory form always lets you type the details in manually
  when it does.
- **WhatsApp sending** uses a `wa.me` deep link with the bill pre-filled as
  the message text — it opens WhatsApp (web or app) for you to hit send,
  no API keys required. For fully automatic sending (no manual tap, sent
  from your own business number), wire up the
  [WhatsApp Business Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
  or a provider like Twilio in `WhatsAppSendButton.tsx` /
  `src/app/api/jobcards/[id]/bill/route.ts`.
- **Barcode scanning** uses the device camera via `html5-qrcode` in the
  browser (works for 1D barcodes and QR codes). It requires camera
  permission and HTTPS (or localhost) to work; manual barcode entry is
  always available as a fallback everywhere a scanner appears.

## Data model

See `prisma/schema.prisma` — `SparePart` / `InventoryTxn` for stock,
`Customer` / `Vehicle` for the customer database, `JobCard` /
`JobCardPart` / `JobCardLabor` for the garage workflow, and `Bill` for the
generated invoice.
