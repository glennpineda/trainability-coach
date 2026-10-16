# Trainability Coach

The coaching app in the Trainability family. Built on the same stack and
patterns as Trainability Studio (React 18, Vite, Tailwind, lucide icons, a
small Express server) and hosted on GoDaddy like Studio, as its own app from
its own repository.

So far: the sign-in screen and the home screen.

## One sign-in for every Trainability app

Coach keeps no accounts. Every Trainability account lives in Studio's
database, and Coach's server (`server/index.js`) relays exactly four routes to
Studio's API: `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` and
`/api/auth/forgot-password`. So:

- the email and password that work in Studio work in Coach, and a password
  changed or reset in one is changed in both;
- Studio did not have to change. The browser only ever talks to Coach's own
  domain, so there is no CORS or cross-site cookie work;
- each app holds its own session. Signing in to Coach does not sign you in to
  Studio's tab, and logging out of one leaves the other alone.

Known limit: Studio counts failed sign-ins per IP address as well as per
email. Relayed requests all come from Coach's server, so that per-IP budget is
shared by everybody signing in through Coach. Fine at today's numbers; the fix,
when it matters, is for Studio to trust a forwarded address from Coach alone.

## Running it locally

Three terminals. Studio's API on its throwaway fixture database, so nothing
touches the live one:

```bash
cd ../TrainabilityWeb3 && npm run fixture
```

```bash
npm run server
```

```bash
npm run dev
```

Then open http://localhost:5174. Local settings and the test account are in `server/.env`, as in Studio (copy `.env.example` there on a new machine; it is never committed).

## Manual and notes

As in Studio:

- **`MANUAL.md`** — the user manual, step by step. After editing it, run
  `npm run manual` to refresh its copy at the bottom of `NEURALBRAIN.md`;
  `npm run check-docs` fails if the copy is behind or a picture is missing.
  `npm run screenshots` retakes its pictures from the running app.
- **`CHANGELOG.md`** — what changed in each release, under its version and
  name (1.0 is Caesious).
- **`BRAINSTORM.md`** — the working queue. Saying "brainstorm" means work
  through **Next up**.
- **`CLAUDE.md`** — the working rules Claude follows here, in this repo so a
  cloud session follows them too.
- **`NEURALBRAIN.md`** — every finished item and test run, with how it was
  done, newest first.

## Deploying (GoDaddy Airo)

Like Studio: push the repository to GitHub, point an Airo app at it, set the
start command to `npm start` (it builds, then serves), and set
`STUDIO_ORIGIN=https://www.trainabilitystudio.com` and `TRUST_PROXY=1` in
its environment variables. Live at https://trainabilitycoach.com;
https://trainabilitycoach.com/api/health reports which Studio it relays to.

## Brand

`brand/` is the logo kit. The wordmark reads TRAINABILITY® (changed from ™ on
16 Oct 2026; SVGs and PNGs regenerated). Colors: Cerulean `#007BA7` (main),
Sky `#4FA8DC`, Navy `#172A3A`, defined once as CSS tokens in `src/index.css`
with a dark version for devices set to dark mode. The wordmark is set in
Poppins Bold as a stand-in until Studio's wordmark font is swapped in (see
`brand/README.txt`).
