# Sanacara Solar CRM

Internal business app for **Sanacara Solar Solutions** (`energy.sanacara.com`): leads → solar sizing →
quotation PDF → project delivery → GST tax invoice → payments, with inventory, expenses and a
cost/profit dashboard. Built with Next.js (App Router), Prisma + PostgreSQL and Tailwind — the same
stack as `garage-billing`, so it deploys the same way.

## What's inside

| Module | What it does |
| --- | --- |
| **Dashboard** | Follow-ups due (call / WhatsApp / snooze), sales funnel, open quotes & win rate, revenue vs cash collected, active projects, quotes to chase, low stock |
| **Leads & Customers** | Lead capture, stages (New → Contacted → Site visit → Quoted → Negotiation → Won/Lost), activity timeline, next follow-up date, EB bill / units / roof details |
| **Pipeline** | Board view of every stage with quote value per column |
| **Solar calculator** | Monthly units or bill → recommended kW, panel count, roof area, generation, PM Surya Ghar + state subsidy, net cost, payback, 25-year savings, CO₂. One click to create a quotation or send a WhatsApp summary |
| **Quotations** | Auto-numbered (`SSS/EPC/26-27/023`), editable BOM / makes / commercials / payment terms. Internal unit costs give a live margin (never printed). PDF follows your existing proposal layout (cover, letter, scope, BOM, makes, commercials, subsidy documents, T&C, bank) plus an optional "Your savings" page |
| **Sites** | Live board of every running job: stage, checklist progress, who is on site today, latest field update, next planned crew, target date, one-tap call / Google Maps directions. Site page has the field log, checklist, crew attendance and crew history |
| **Schedule** | Planning calendar — month grid on PC, day-by-day agenda on phone. Assign several people to a site over a date range (Sundays skippable), see who is free on any day, mark present / absent. Double-booking across sites is caught and reported |
| **Team** | Roster with role, phone, daily wage and today's status; member profile with upcoming plan, full site history, days worked and wage estimate; **Who worked where** report (by person / site / date range) with CSV export |
| **Projects** | Accepted quote → project with checklist, payment milestones, subsidy tracking, stock issued, direct expenses and live margin |
| **Invoices** | GST tax invoices (`SS/26-27/014`) in your existing format: HSN/SAC lines, CGST+SGST or IGST by place of supply, HSN tax summary, amount in words, bank details. Builds from a quotation (splits a GST-inclusive package into 70 % supply @ 5 % / 30 % services @ 18 %, configurable) |
| **Inventory** | Items by category, weighted-average cost on every purchase, suppliers, stock history, low-stock alerts, stock value dashboard, CSV export. Issuing stock to a project charges its cost to that project |
| **Expenses** | Overheads or direct project costs, by category |
| **Cost & Profit** | Revenue, material + direct cost, gross & net profit, 12-month trend, cost breakdown, project profitability, receivables & ageing, GST collected by rate, CSV exports (GST sales register, payments, expenses, stock) |
| **Settings** | Company/GSTIN/bank, numbering (continue your paper series), calculator & subsidy rules, GST split, default quotation terms, staff accounts (admin / staff) |

## Run locally

```bash
cd solar-crm
npm install
cp .env.example .env            # set DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy       # or `migrate dev` while changing the schema
npm run db:seed                 # admin login + settings (SEED_DEMO=true adds fictional demo data)
npm run dev
```

Sign in at http://localhost:3000 with the admin printed by the seed script
(default `admin@sanacara.com` / `changeme123`) and **change the password** under *My account*.

The seed continues your existing series: the next quotation is `SSS/EPC/26-27/023` and the next
invoice `SS/26-27/014`. Change this any time in *Settings → Document numbering*.

## Deploy (Vercel + Postgres)

1. Create a Postgres database (Neon / Supabase / Vercel Postgres) and import this repo as a Vercel
   project with **Root Directory = `solar-crm`**.
2. Set env vars: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`).
3. Migrations run automatically during the Vercel build (`vercel-build`) whenever `DATABASE_URL` is set — use the
   provider's **direct (non-pooled)** connection string. Then run `npm run db:seed` once from your machine
   (with `ADMIN_EMAIL` / `ADMIN_PASSWORD` set and `DATABASE_URL` pointing at production) to create the first admin.
4. Add the domain `energy.sanacara.com` (or a sub-path/sub-domain such as `crm.sanacara.com` if
   `energy.sanacara.com` is already serving your website) in Vercel → Domains.

### Crew logins (phones)

Create a user with the **Field crew** role (Settings → Staff accounts) and link it to the team member
(Team → member → *Phone login*). Crew land on **My jobs** — today's site with address, directions,
customer call button and "I'm on site" — and can only open *My jobs*, *Sites* and *Schedule*. They can
post site updates, tick the checklist and mark attendance, but **never see quotations, invoices,
payments, costs, customers or settings** (enforced in `src/proxy.ts` and again in every server action).

Every page and API route requires a login (`src/proxy.ts`); there is no public access and no
self-signup. PDFs are also behind login — download and send them (WhatsApp buttons open the
customer's chat with a pre-filled message).

## How the numbers work

- **Calculator:** required kW = monthly units × offset ÷ (yield × 30), rounded up to the next 0.5 kW;
  panels = ceil(kW ÷ panel Wp); savings are capped at the customer's own consumption and grow with
  tariff escalation and shrink with panel degradation. Defaults (₹7/unit, 4 kWh/kW/day, 580 Wp,
  ₹74,300/kW) are in *Settings*.
- **Subsidy:** ₹30,000/kW for the first 2 kW + ₹18,000 for the 3rd kW (max ₹78,000), plus a flat
  ₹22,000 state amount from 3 kW — this reproduces your 5 kW proposal (₹3,71,500 − ₹1,00,000 =
  ₹2,71,500). **Check these against the current scheme rules**; every figure is editable per quotation.
- **Revenue** = taxable value of non-cancelled tax invoices (an estimate from the contract value
  until an invoice exists). **Cost** = stock issued to projects at average cost + project expenses.
  **Overheads** = expenses with no project. Net = revenue − cost − overheads.
- **GST reports** show output tax only; input tax credit on purchases is not tracked.

## Data model

`prisma/schema.prisma`: `Customer`/`Activity` (CRM), `TeamMember`/`Assignment` (one row per person per site per day)/`SiteUpdate` (field team), `Quote`/`QuoteLine`, `Project`/`ProjectTask`,
`Invoice`/`InvoiceLine`, `Payment`, `Item`/`StockMovement`/`Supplier`, `Expense`, `User`, `Setting`
(JSON), `Counter` (per-financial-year numbering).
