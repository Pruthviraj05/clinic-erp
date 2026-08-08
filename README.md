# Clinicore

Enterprise, multi-branch **Clinic Management System (ERP)** for offline clinics — appointments,
EMR, prescriptions, billing (GST), inventory, disease-wise patient lists, consent workflow and
analytics, built with **Next.js 15**, **React 19** and **TypeScript**.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app boots in **demo data mode** — no
database needed. `/login` shows a role switcher (Admin / Doctor / Receptionist / Patient); pick a
role to open its workspace.

## Scripts

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build — typechecks + lints
npm start        # serve the production build
npm test         # vitest unit + action tests
npm run lint     # eslint
```

> Don't run `npm run build` while `npm run dev` is active against the same checkout — both write to
> `.next` and will corrupt each other's manifests. Stop `dev` first, or build in a separate clone.

## Configuration

Copy [`.env.example`](.env.example) to `.env` and adjust. Everything works with **zero
configuration** in demo mode. See [`docs/02-architecture.md`](docs/02-architecture.md) for the
MongoDB migration path and [`docs/05-roadmap.md`](docs/05-roadmap.md) for what's next.

## Documentation

- [`docs/01-prd.md`](docs/01-prd.md) — Product/Business/Functional requirements
- [`docs/02-architecture.md`](docs/02-architecture.md) — Technical architecture & DB design
- [`docs/03-workflows.md`](docs/03-workflows.md) — User journeys & screen inventory
- [`docs/04-permissions.md`](docs/04-permissions.md) — Role permission matrix
- [`docs/05-roadmap.md`](docs/05-roadmap.md) — Roadmap & testing strategy
- [`AGENTS.md`](AGENTS.md) — Engineering guide (stack conventions, gotchas)
- [`HANDOVER.md`](HANDOVER.md) — Session handover / current state

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Base UI) ·
Recharts · Vitest. Data layer is a swappable storage port — demo in-memory today, MongoDB-ready
(see `src/server/repositories/`).

## Deploy

Deploys cleanly to [Vercel](https://vercel.com/new) (zero-config — no environment variables
required for demo mode) or any Node host via `npm run build && npm start`.
