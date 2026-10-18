# Trainability Coach

The coaching app in the Trainability family. Built on the same stack and
patterns as Trainability Studio (React 18, Vite, Tailwind, lucide icons, a
small Express server) and hosted on GoDaddy like Studio, as its own app from
its own repository.

So far: the sign-in screen, the home screen and the trainer's client list.

## One sign-in for every Trainability app

Coach keeps no accounts. Every Trainability account lives in Studio's
database, and Coach's server (`server/index.js`) relays exactly five routes to
Studio's API: `/api/auth/door` (the sign-in screen's first question, which way
in an email takes), `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` and
`/api/auth/forgot-password`. So:

- the email and password that work in Studio work in Coach, and a password
  changed or reset in one is changed in both;
- Studio did not have to change. The browser only ever talks to Coach's own
  domain, so there is no CORS or cross-site cookie work;
- each app holds its own session. Signing in to Coach does not sign you in to
  Studio's tab, and logging out of one leaves the other alone.

Trainers who aren't on Trainability's team can make a **Coach account**,
kept in Coach's own database (`server/accounts.js`): `coach_accounts` (ids
`usr…`, email kept lowercase, the password as Studio keeps it: scrypt, N 16384,
r 8, p 1, compared in constant time) and `coach_sessions` (only the SHA-256 of
the random token in the HttpOnly `cx_session` cookie; a month with Keep me
logged in, otherwise a day and the browser's session). `/api/auth/door`,
`login`, `me`, `logout` and `forgot-password` look for a Coach account first
and fall through to Studio when there is none; `/api/auth/signup` makes one
(not for an email Studio says is a team account). Tries are limited: ten per
email and fifty per address in fifteen minutes.

A Coach account's clients are kept in Coach too (`server/coach-clients.js`,
`coach_clients`, ids `cli…`), with Studio's rules (the four required fields,
a complete email, a phone that can take texts) and in the same shape as the
Studio clients `myClients` returns, so `/api/clients`, its edit and archive
routes, limitations, programs and Billy work the same for both kinds of
account. One account's clients are never another's.

A Coach account is **linked** to a Studio account when its email turns out to
have one (`/api/auth/door` says "link"; Studio's password at
`/api/auth/login` links them) or from the account menu (`/api/auth/link`, a
Studio sign-in with another email). `accounts.link` moves everything the
account made (places and equipment, programs, private exercises, own names
and settings, where the Studio user has none of the same, limitations it
wrote, and its clients) to the Studio user's id, marks the account linked
(`studio_user_id`), and ends its sessions; it signs in with Studio's password
from then on. Its clients stay in Coach, listed with the Studio clients
(`myClients`), until the trainer moves them with `POST /api/clients/move`:
each through Studio's own add steps (`studioAdd`), archived there if archived
here, with programs and limitations re-pointed to Studio's id; one Studio
won't take stays and is named.

Clients work the same way. Coach keeps no copy: `GET /api/clients` on
Coach's server asks Studio's own `/api/clients` and `/api/auth/me` with the
same session, keeps only the clients on the signed-in account's own list (a
master or admin is otherwise sent everybody they manage), and passes on only
what the Clients screen shows — name, pronouns, email, phone, birthday, the
day they joined the list, last and next session dates, archived, and how many
other trainers they share. No card, notes, address or message settings reach
the browser. Studio did not have to change for this either.

A client added in Coach (`POST /api/clients`) is added in Studio the way
Studio's own Add client does it, with the trainer's session: Studio's
`/api/clients/match` first; somebody it already has by the same email is put
on the trainer's list with `/api/clients/:id/link`; a phone-only match is
refused with the name, for the trainer to sort out; anybody else is made with
`POST /api/clients` on the trainer's list. A client's details are changed
with Studio's `PATCH /api/clients/:id`, and archived or put back with its
`POST /api/clients/:id/archive`, both only for a client on the trainer's own
list. Coach still keeps no copy, and its screens never say where clients are
kept (Glenn: "seemless").

Known limit: Studio counts failed sign-ins per IP address as well as per
email. Relayed requests all come from Coach's server, so that per-IP budget is
shared by everybody signing in through Coach. Fine at today's numbers; the fix,
when it matters, is for Studio to trust a forwarded address from Coach alone.

## Billy

Billy, Studio's assistant, is in Coach too: his face is the button beside the
badges in the header, and his panel hangs under it. He knows the signed-in
trainer's own clients (through the same `/api/clients` path the Clients tab
uses, with the same session, so he sees nothing they can't), and he reads a
photo or a PDF given to him. He looks exercises up in Coach IQ's library and
finds alternatives through `server/library.js`, which filters them in code by
the place's equipment, the level and the client's limitations, so he only
ever sees options that pass. He reads Coach IQ's principles before advising
on reps, sets, load, tempo, rest or planning (`server/principles.js`): only
the topics the Primary Master has approved. He changes nothing but the trainer's equipment
answers and names for exercises, from their own words.

`server/billy.js` asks Claude through Anthropic's SDK; the key stays on the
server, and the conversation is kept by the browser tab and sent whole with
each question, so Coach stores none of it. Set up like Studio's, with the same
names:

| Variable | What it does |
|---|---|
| `ANTHROPIC_API_KEY` | Unset, Billy is not offered: no button, and `/api/assistant` answers 503. |
| `ASSISTANT_MODEL` | Which model answers. Unset: `claude-sonnet-5-5`; `claude-opus-5-5` is stronger and twice the price. |
| `ASSISTANT_TRACE` | Logs each turn while debugging. Leave off: the questions are about real clients. |
| `BOOK_MODEL` | Which model reads a book on Review Coach IQ → Books (`server/books.js`), with the same key. Unset: `claude-opus-5-5` (Glenn: a book is read once, and what it becomes is Coach IQ). |
| `ASSISTANT_API_BASE` | Never on a host. Points Billy at a stand-in on this machine for testing; only `http://localhost` or `http://127.0.0.1` with a port is taken. |

A photo is shrunk in the browser to 1600 pixels on its longest side and sent
as a JPEG (a GIF goes as it is); a PDF goes as it is, up to 15 MB. His route
takes up to 32 MB, Claude's own limit for one request; every other route keeps
its 20 kB limit.

## Programs

The Programs tab (`src/tabs/ProgramsTab.jsx`, `src/programs/`) is the program
designer: a trainer's own programs (`prg…`), each for one client of theirs at
one of their places, made of days (`prd…`) and exercises on them (`pre…`),
where only the exercise is needed. `server/programs.js` keeps them, checks
the whole program against Coach IQ in code on every change (the place's
equipment, the client's limitations, their level, and the principles' ranges
for reps, rest, sets per session and tempo, each point naming its source),
suggests what could come next on a day from the library, and finds swaps.
Nobody but the trainer who wrote a program can read it; Billy reads it through
his `my_programs` tool and changes nothing. `/print/program/<id>` is the page
printed for the client.

## Coach's database

Coach keeps its own data (each trainer's equipment, names for exercises and
own exercises, clients' limitations, Coach IQ's library and principles with
their history, and the books read into it; `coach-iq/README.md`) in a database of
its own, never Studio's (`server/db.js`). On the host, GoDaddy gives the app a
new, empty MariaDB and names it with `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER` and `DB_PASSWORD`; `DB_SSL=true` if the server asks for TLS.
Anywhere those are not set (a Mac, a cloud session) Coach uses a SQLite file,
`server/coach.sqlite` or `COACH_SQLITE_PATH`, never committed. The tables are
made on start and every one is named `coach_…`. `/api/health` says which
(`"database": "mysql"` or `"sqlite"`).

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

## Email

Coach sends one email so far: a Coach account's temporary password, when
Forgot password? is used (`server/accounts.js`, `resetPassword`). It is sent
by `server/email.js`, Studio's own mailer cut down, with Studio's settings:

| Setting | |
|---|---|
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (`SMTP_PORT`, 465 by default) | A mail server, where the host lets a process reach one. |
| `EMAIL_GATEWAY=on` (and `EMAIL_GATEWAY_FROM`) | GoDaddy Node.js Hosting's own gateway, for a host that routes no SMTP; as Studio's. |
| `EMAIL_ALLOWLIST` | While set, only these addresses are emailed (testing). |
| `MESSAGES_OFF=on` | Nothing is sent. |
| `APP_ORIGIN` | The address put in the email, e.g. `https://trainabilitycoach.com`; the request's own if unset. |

With none set, as with Studio, the temporary password is written to the
server's log instead, since only its hash is kept.

## Deploying (GoDaddy Airo)

Like Studio: push the repository to GitHub, point an Airo app at it, set the
start command to `npm start` (it builds, then serves), and set
`STUDIO_ORIGIN=https://www.trainabilitystudio.com` and `TRUST_PROXY=1` in
its environment variables. Live at https://trainabilitycoach.com;
https://trainabilitycoach.com/api/health reports which Studio it relays to.

Airo unpacks each deploy over the last one without emptying `/app` first
(its log says `cleanAppDirBeforeExtract: false`), so a file deleted from the
repository can stay on the host. `vite.config.js` sets PostCSS itself, empty,
for that reason: 0.1.0's `postcss.config.js`, still on the host, broke the
first deploy of 1.0.12.

### Where files are saved

As in Studio (`server/durable-home.js`): the host rebuilds the app's folder,
`/app`, on every deploy, and keeps only its Private Storage, `/private`. Where
the app runs from `/app` and `/private` can be written to, Coach saves its
files in `/private/trainability-coach`; anywhere else, in
`~/trainability-coach`. The Primary Master can name another folder under
Installation → **Where files are saved** (`GET`/`PUT /api/storage`, kept in
`coach_settings` as `storage_folder`, read at most once a minute). A folder is
tried before it is accepted and refused if it is inside the app's folder.
`COACH_FILES_DIR` on the host wins over both, and the screen says so. Files
are not moved on a change.

## Brand

`brand/` is the logo kit. The wordmark reads TRAINABILITY® (changed from ™ on
16 Oct 2026; SVGs and PNGs regenerated). Colors: Cerulean `#007BA7` (main),
Sky `#4FA8DC`, Navy `#172A3A`, defined once as CSS tokens in `src/index.css`
with a dark version for devices set to dark mode. The wordmark is set in
Poppins Bold as a stand-in until Studio's wordmark font is swapped in (see
`brand/README.txt`).
