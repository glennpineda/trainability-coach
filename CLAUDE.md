# Working on Trainability Coach

Rules for Claude, read in every session, local or cloud. They are kept here
because a cloud session sees only this repository, not the memory on Glenn's
Mac. The project's history lives in `NEURALBRAIN.md`. The app itself is
described in `README.md`.

## What Coach is

- The coaching app in the Trainability family, alongside Trainability Studio
  (`glennpineda/trainability-studio`). Live at trainabilitycoach.com on GoDaddy
  Airo. The start command is `npm start`, which builds and then serves.
- **Two kinds of account.** Trainability's own trainers sign in with their
  Studio account: `server/index.js` relays five routes (`/api/auth/door`,
  `login`, `me`, `logout`, `forgot-password`) to Studio's API at
  `STUDIO_ORIGIN`, the same password as Studio but a separate session, and
  their clients are kept in Studio, through its API, with nothing on screen
  saying so. Any other trainer can make a **Coach account**
  (`server/accounts.js`, `coach_accounts`, ids `usr…`, Glenn's tag; Glenn, 18
  Oct 2026), kept in Coach's database, answered before the relay (`cx_session`
  cookie), with its clients kept in Coach too (`server/coach-clients.js`,
  `coach_clients`, ids `cli…`, Glenn's tag), in the same shape as Studio's so
  every screen works alike. A Coach account is linked to a Studio account
  (`accounts.link`: same email at sign-in, or the account menu's Link your
  Trainability account) and becomes it, its data re-keyed to the Studio user;
  its clients stay in Coach until the trainer moves them
  (`/api/clients/move`), since the business can see Studio's clients. Still
  to come: password reset by email (BRAINSTORM, Next up). Most Coach work should need no change to
  Studio. If one seems needed, say so and ask first.
- The stack matches Studio's: React 18, Vite 8, Tailwind 4 (CSS-first: no tailwind.config.js), lucide icons and
  Express. So does the look: Roboto for text and headings (500, 0.01em),
  Quicksand 600 for "Trainability" written as text (`cx-wordmark`, standing
  in for the logo's licensed Katahdin Round; no other fonts), all imported
  once at the top of `src/index.css`; Studio's heading sizes, and its button
  levels in Coach's colors (`src/index.css`, "buttons"; Studio's
  CONTRIBUTING.md, "Buttons and links"). `npm run check-ui` checks them. The color tokens use Studio's names in `src/index.css`: Cerulean
  `#007BA7` (main), Sky `#4FA8DC`, Navy `#172A3A`. The wordmark is
  TRAINABILITY® (not ™).

## Studio is the template

- **Before building anything new, look in Studio first** (Glenn, 18 Oct
  2026: "Whenever we create new functionalities, let's use Studio as a
  template and check if that exists already that we can replicate"). If
  Studio already does it (a screen, a form, a rule, a message, a server
  check), copy its way: the same steps, fields, wording, limits and look, in
  Coach's colours. Read its code, not only its manual: main, and any branch
  with newer work (its `account-menu` branch held the account menu's role
  badge). Say what was copied and from where. Only where Studio has nothing,
  or Glenn asks for something different, design it fresh.

## BRAINSTORM.md is the working queue

- The single word **"brainstorm"** (or "next up") means: read **Next up** and
  work through it.
- Also check Next up at natural points: when a session starts and after a task
  is finished. Say what you found before starting; never begin silently.
  Confirm first if an item is ambiguous or destructive.
- **Only Next up is a queue.** Leave Found in testing, Ideas, Questions and
  Parked alone until Glenn moves an item up. An unfinished thought elsewhere in
  the file must never turn into a commit.
- When an item is done, move it out of BRAINSTORM.md, straight to the top of
  `NEURALBRAIN.md` → **# Completed brainstorm**. Nothing finished stays in
  BRAINSTORM.md. If an item is Glenn's to do (on the host, or with his own
  account), say so and wait for him to report back.

## NEURALBRAIN.md is memory

- **Before asking Glenn something again or re-deriving it from git, search
  NEURALBRAIN.md.** It records every finished item and test run, with how each
  was done and why.
- **Record finished work there straight away.** Newest first, at the top of
  its section. Write it in full and summarise nothing; the detail is the point.
  The entry format is a bold title, then (date; Glenn: "his own words"), then
  how it was done: the approach, what turned out differently from expected,
  files, and commits.
- Test runs go under **# Test Run Fixes**. Problems a run finds but doesn't fix
  wait in BRAINSTORM.md under Found in testing. The first run writes out its
  full method under its own heading.
- Its last part is a generated copy of the manual. Never edit that copy.

## The manual

- There is one `MANUAL.md`, written the Studio way. It is for someone who is
  not comfortable with computers: numbered steps, **tap** also means click,
  page breaks between chapters, a contents list, and the exact words on the
  buttons and in the messages, checked against the code. Do not make trainer,
  quickstart or client editions, or PDFs, unless Glenn asks.
- Bring it up to date once per pull request, as the last step before opening
  it, not on every commit.
- After editing it, run `npm run manual` (refreshes the copy in NEURALBRAIN),
  then `npm run check-docs` (fails if the copy is behind or a picture is
  missing). `npm run screenshots` retakes the pictures from the running app.

## Versions

- `package.json` holds `version` and `codename`. **1.0 is "Caesious".**
- Every minor version (1.0 → 1.1) gets a name that Glenn chooses. **Ask him for
  it before changing anything, and never invent one.** A minor bump changes
  `version`, `codename` and a new `## 1.1 <Name>` heading in CHANGELOG.md.
  Build numbers get no name.
- **Every commit bumps the build number** (Glenn: "We bump the build number
  whenever we commit"). The build is the last part of `version` (1.0.1 →
  1.0.2): run `npm version patch --no-git-tag-version` and commit
  `package.json` and `package-lock.json` with the change. So a piece of work
  is one commit, with its NEURALBRAIN entry in it naming the build ("build
  1.0.2") rather than a hash. The manual's version examples are examples and
  are not changed each time.

## Testing and safety

- **Never test against the live Studio** (trainabilitystudio.com) or with a
  real person's account. Sign-in is tested against Studio's throwaway fixture
  database: `npm run fixture` in the Studio repo (port 4700), then
  `npm run server` and `npm run dev` here. See the README.
- A cloud session has only this repository, so it cannot run Studio's fixture
  and cannot test sign-in end to end. Build, run `npm run check-docs`, and check
  the pages that don't need a session. Say plainly what went untested.
- **In a cloud session, show Glenn screenshots** of anything on screen that
  was built or changed (Glenn, 18 Oct 2026: "Make sure you show me
  screenshots when I'm asking on cloud environment"): take them in the
  session's Chromium (phone width, and desktop where it matters) and send them
  to him with the report, not only look at them. He can't open the cloud's
  copy of the app himself.
- Local settings live in `server/.env` (as in Studio). It is never committed. A
  cloud session won't have it; it gets what it needs from the environment's
  variables.
- Commit finished work on `main`, but don't push on your own. **When Glenn
  says "push", push `main` to GitHub** (`git push`), then confirm it landed by
  checking `git ls-remote origin main` matches the local commit. Never force
  push. If GitHub refuses (it has commits this copy lacks), fetch and show
  Glenn what is there before merging anything.
