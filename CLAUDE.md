# Working on Trainability Coach

Rules for Claude, read in every session, local or cloud. They are kept here
because a cloud session sees only this repository, not the memory on Glenn's
Mac. The project's history lives in `NEURALBRAIN.md`. The app itself is
described in `README.md`.

## What Coach is

- The coaching app in the Trainability family, alongside Trainability Studio
  (`glennpineda/trainability-studio`). Live at trainabilitycoach.com on GoDaddy
  Airo. The start command is `npm start`, which builds and then serves.
- **Coach keeps no accounts.** `server/index.js` relays four routes
  (`/api/auth/login`, `me`, `logout`, `forgot-password`) to Studio's API at
  `STUDIO_ORIGIN`. A user signs in with the same password as Studio but gets a
  separate session. Most Coach work should need no change to Studio. If one
  seems needed, say so and ask first.
- The stack matches Studio's: React 18, Vite 8, Tailwind 4 (CSS-first: no tailwind.config.js), lucide icons and
  Express. The color tokens use Studio's names in `src/index.css`: Cerulean
  `#007BA7` (main), Sky `#4FA8DC`, Navy `#172A3A`. The wordmark is
  TRAINABILITY® (not ™).

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

## Testing and safety

- **Never test against the live Studio** (trainabilitystudio.com) or with a
  real person's account. Sign-in is tested against Studio's throwaway fixture
  database: `npm run fixture` in the Studio repo (port 4700), then
  `npm run server` and `npm run dev` here. See the README.
- A cloud session has only this repository, so it cannot run Studio's fixture
  and cannot test sign-in end to end. Build, run `npm run check-docs`, and check
  the pages that don't need a session. Say plainly what went untested.
- Local settings live in `server/.env` (as in Studio). It is never committed. A
  cloud session won't have it; it gets what it needs from the environment's
  variables.
- Commit finished work on `main`, but don't push on your own. **When Glenn
  says "push", push `main` to GitHub** (`git push`), then confirm it landed by
  checking `git ls-remote origin main` matches the local commit. Never force
  push. If GitHub refuses (it has commits this copy lacks), fetch and show
  Glenn what is there before merging anything.
