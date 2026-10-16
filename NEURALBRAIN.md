# TRAINABILITY COACH - NEURAL BRAIN

Where finished work from [BRAINSTORM.md](BRAINSTORM.md) is kept, in three parts:

- [Completed brainstorm](#completed-brainstorm): every item that left Next up, with the note on
  how it was done. An item moves here as soon as it is finished.
- [Test Run Fixes](#test-run-fixes): every test run, with what it found and
  how each problem was fixed. Each fix is written up here as soon as it is
  made, under its run.
- [User Manual](#user-manual): a copy of the whole manual, MANUAL.md,
  as it stands now. `npm run manual` refreshes it, and `npm run check-docs`
  fails when it falls behind. Edit MANUAL.md, never the copy.

Nothing is summarised on the way in. The notes arrive exactly as they were
written, because the reason for keeping them is the detail, not the fact that
something happened.

**Newest first**, in the first two parts. New arrivals go on top, so reading
downwards means going backwards in time.

---

# Completed brainstorm

- **The user manual, written the Studio way** (16 Oct 2026; Glenn: "Let's do the same way we write Manuals on Studio as well, but in this, we only have one manual for now (no need to create trainer, quicktstart etc)"). `MANUAL.md`, in Studio's voice: for somebody not comfortable with computers, every task numbered step by step, **tap** meaning click as well, page breaks between chapters so it prints, a table of contents, and the exact words on the buttons and in the messages, checked against the code (Studio's own error texts for archived, locked and too many tries; the 30-day and one-day session lengths from Studio's auth.js). Five chapters for what exists: before you start (one account for every Trainability app, but separate sign-ins), signing in, the home screen, words, and when something goes wrong. Studio's `<!-- only:managers -->` edition markers are left out, since there is one manual. A temporary password is finished in Studio (2.4), because Coach has no screen to choose a new one; changing it there ends Coach's session too, as Studio ends every other session on a password change, so the box goes once you sign in again. Tooling copied from Studio and cut down: `npm run screenshots` (puppeteer-core with the installed Chrome, phone size 440×940 at 1.5×, light mode, reduced motion so the hexagons hold still, CPU rasteriser; signs in with `SHOT_EMAIL` and `SHOT_PASSWORD` from `server/.env`, the fixture account) takes `docs/images/01-login.png` and `02-home.png`; `npm run manual` copies MANUAL.md under **# User Manual** at the bottom of this file with every heading one level down, as Studio's `brainWithManual` does; `npm run check-docs` fails if that copy is behind or a pictured file is missing. The home picture's date and greeting change with the day it is taken.

- **BRAINSTORM.md and NEURALBRAIN.md, kept the Studio way** (16 Oct 2026; Glenn: "model the same brainstorm.md and neuralbrain.md here as well, same as Studio, same methods and storing information like it does at Studio"). Both files copy Studio's headers and sections word for word where the words still fit: BRAINSTORM has Next up (the queue), Found in testing, Ideas, Questions and Parked; this file has Completed brainstorm, Test Run Fixes and User Manual, newest first. Seeded from the day's work rather than left empty: the two things still open on the live site went into Next up, the home screen's four placeholders, single sign-on, the wordmark font and Studio's look into Ideas, the shared per-IP sign-in budget into Questions, and the abandoned `/coach` plan into Parked. Studio's method also lives in two Claude memories, `brainstorm-queue` and `neuralbrain-is-memory`; Coach got its own copies in its project memory, and this file is indexed into memsearch's Coach collection (`ms_trainabilitycoach1_a681c7ef`) as Studio's is into its own. Coach has no manual yet, so User Manual says so rather than holding a copy, and there is no `trainer-manual`-style script to refresh it.

- **Coach live on GoDaddy at trainabilitycoach.com** (16 Oct 2026; Glenn: "app is created on GoDaddy, and trainabilitycoach.com is connected as the apps domain"). Checked from outside: `/api/health` answers on both `trainabilitycoach.com` and `www.` with `"studio":"https://www.trainabilitystudio.com"`, the page and a deep link (`/clients`) both return 200, and `/api/auth/me` comes back with Studio's own `{"error":"Not signed in"}`, so the relay reaches Studio's API. Glenn asked whether `STUDIO_ORIGIN` takes several addresses ("https://www.xxx.com, https://xxx.com etc"): one only, since it is the single address Coach calls rather than a list of allowed ones, and it must be one that answers without a redirect because the relay uses `redirect: "manual"` and would hand a 301 back as the answer. Both Studio addresses answered 200, and Glenn had set the `www.` one. Still open (Next up): `TRUST_PROXY=1`, and a sign-in with a real account.

- **The local .env, in server/ as in Studio** (16 Oct 2026; Glenn: "where is our local .env? I liked having that on Studio so I can reference back to it", then "yeah, we have .env in the server/ folder"). There was none: only `.env.example`, and the server read nothing from disk. Now `server/.env` holds the local settings (`STUDIO_ORIGIN=http://localhost:4700`, `PORT=4800`), the fixture test account, and the live Airo settings for reference. `server/index.js` loads it with Node's own `process.loadEnvFile`, found from the file's location rather than the working directory, and checked first that it never overrides a variable already set, so Airo's settings win over a stray file. It went to the repo root first and moved to `server/` on Glenn's word; `.gitignore`'s `.env*` keeps it out of git either way. The test account's password moved out of `.env.example`; it is still in the first commit on GitHub, which is harmless since that account exists only in Studio's throwaway fixture database. Commits `0dfc5af`, `2531546`.

- **Its own repository: glennpineda/trainability-coach** (16 Oct 2026; Glenn: "can we use a different repo?", then "commit only, I have a private repo ready"). The first plan had Coach built into Studio's repo and served at `/coach` on Studio's domain, sharing Studio's session cookie; Studio runs on GoDaddy Airo as one Node process whose catch-all sends every non-`/api` path to Studio's own `index.html`, so it would have needed a route added to Studio. With a repository of its own, Coach needed a server of its own instead: `server/index.js` serves the built page and relays exactly four routes to Studio's API (`/api/auth/login`, `/me`, `/logout`, `/forgot-password`); anything else under `/api` is a JSON 404. Only Studio's `ts_session` cookie is passed upstream, and Studio's `Set-Cookie` comes back with any `Domain` stripped, so the session belongs to Coach's domain alone. Same email and password as Studio, separate sessions: the copy that said "logging out here logs you out of Studio too" came out. Known limit, now in Questions: Studio's per-IP sign-in budget is shared by everyone coming through Coach. `vite.config.js` lost its `/coach/` base and now proxies `/api` to Coach's server on 4800 in development. `package.json` moved the build tools into dependencies, as Studio has them, because Airo's `npm start` builds after a plain install. The push was first refused: GitHub's starter commit held only a README reading "# trainability-coach", so it was merged in (`--allow-unrelated-histories`, keeping Coach's README) rather than force-pushed. Commits `1c55d2f`, then the merge `d5b87c9`.

- **TRAINABILITY® instead of ™** (16 Oct 2026; Glenn: "can you change the TM on the Trainability wordmark to a (R) registered trademark"). The wordmark in the lockup SVGs is outlines, not text, so there was no character to swap: one path of 19 shapes, the last two being the T and M. Those two came out, and the ® was built from the wordmark's own R (shapes 1 and 2) scaled into a ring 0.555 of the cap height across, so it matches the letterforms exactly. The ® is narrower than the ™ was, so the whole word moved 7.67 units right to stay centred. Same geometry in all three lockups (light, dark, dark on navy), so one script did all three; the PNGs (600, 1500 and 3000 wide, and 1500 on navy) were re-rendered from the new SVGs with headless Chrome at their original sizes on a transparent background. The header's own TRAINABILITY text got a ® too, pulled in by `-0.1em` because the letter spacing left it floating. `brand/README.txt` now says TRAINABILITY(R) COACH.

- **The sign-in and home screens** (16 Oct 2026; Glenn: "Let's start building the design of this app, modeled after Trainability Studio as they are going to be hosted at the same place, GoDaddy. Authentication (login) should be universal for all Trainability apps, so the e-mail/password used at Studio should work for Coach as well. The main color is cerulean. I attached the logo kit. Let's just start basic, with just having the login screen and the home screen."). Studio's own stack, so pieces can move between the two: React 18, Vite 5, Tailwind 3, lucide icons. Colors from the logo kit: Cerulean `#007BA7` for buttons and the sign-in wash, Sky `#4FA8DC` for COACH and links on dark, Navy `#172A3A` for the header and words; set once as tokens in `src/index.css` under Studio's names, with a dark version (navy ground, sky links, since cerulean is too dark to read on navy). The sign-in screen follows Studio's: a cerulean-to-navy gradient, three of the badge's rounded hexagons drifting out of step behind it (still when the device asks for less motion), a white card with the lockup, "Keep me logged in", "Forgot password?" asking Studio to email a temporary password, and the "came over from the old app" notice when Studio answers `password_migrated`. Like Studio, a name typed without an @ becomes a trainabilitystudio.com address. One screen with both boxes rather than Studio's email-first door, because Studio's door sends clients to a code sign-in Coach does not have. The home screen: a navy header with the badge and an account menu (name, email, role, Open Studio, Log out), a cerulean band with the date and "Good afternoon, Casey", then four placeholder cards (now in Ideas), plus a notice to choose a password in Studio when signed in with a temporary one. Tested against Studio's throwaway fixture API (`npm run fixture`, port 4700) because port 4242 was held by another Studio dev server on its own temp database, which was left alone: a wrong password showed Studio's own "That email and password don't match.", the right one landed on home, a reload stayed signed in, and Log out returned to sign-in. Checked at phone width and in dark mode.

---

# Test Run Fixes

Every full or scoped test run of the app, newest first: how it was tested,
what it found, and how each problem was fixed. A new run gets its own heading
at the top of this section when it starts, and each fix is written up under it
as soon as it is made. Problems not yet fixed wait in BRAINSTORM.md under
**Found in testing**. There are no separate test-run documents; this is the
one place they live.

No runs yet. The first one should write its method in full under its own
heading (how the app was tested, and how to run another), as Studio's run 1
does, so later runs can point back to it.

---

# User Manual

## Trainability Coach
### User manual

Everything you need to use the app, one task at a time.

You do not need to know anything about computers to use this manual. Every task
is written out step by step. Where a step says **tap**, you can also click with a
mouse — they mean the same thing here.

Coach is new, and so is this manual. It covers what the app does today:
signing in and the home screen. Each new part of the app gets its own chapter
here as it arrives.

---

#### Contents

1. [Before you start](#1-before-you-start)
2. [Signing in](#2-signing-in)
   - [2.1 Signing in](#21-signing-in)
   - [2.2 Staying signed in](#22-staying-signed-in)
   - [2.3 If you have forgotten your password](#23-if-you-have-forgotten-your-password)
   - [2.4 Signed in with a temporary password](#24-signed-in-with-a-temporary-password)
   - [2.5 Signing out](#25-signing-out)
3. [The home screen](#3-the-home-screen)
   - [3.1 Reading the screen](#31-reading-the-screen)
   - [3.2 Your account menu](#32-your-account-menu)
   - [3.3 Going to Studio](#33-going-to-studio)
   - [3.4 Light or dark](#34-light-or-dark)
4. [Words this app uses](#4-words-this-app-uses)
5. [When something goes wrong](#5-when-something-goes-wrong)

<div style="page-break-after: always;"></div>

---

### 1. Before you start

#### What this app is for

Trainability Coach is the coaching app in the Trainability family, alongside
**Trainability Studio**, the app the business runs its schedule and billing
in. Coach is where your coaching will live: your day, your clients, the
programs you build for them, and your messages with them. Those parts are
still being built — the home screen shows them as **Coming soon** (3.1).

#### One account for every Trainability app

You do not need a new account for Coach. **The email and password you use for
Trainability Studio work here too.** There is only one list of accounts, kept
by Studio, so:

- If you change your password, it changes for both apps.
- If you are sent a temporary password, it works in both.
- If your account is archived or locked in Studio, it cannot sign in to Coach
  either.

> **Signed in to one is not signed in to the other.** The password is shared,
> but each app keeps its own sign-in. Signing in to Coach does not sign you in
> to Studio in another tab, and signing out of one leaves the other as it was.

#### What you need

- The email address you use for Trainability Studio.
- Your Studio password.
- A web browser on your phone, tablet or computer. Coach is at
  **trainabilitycoach.com**.

<div style="page-break-after: always;"></div>

---

### 2. Signing in

#### 2.1 Signing in

![The sign-in screen](docs/images/01-login.png)

*The sign-in screen*

1. Open **trainabilitycoach.com** in your web browser.
2. You will see a white box in the middle of a blue screen, with the Coach
   logo at the top: a hexagon with a **C** in it, and **TRAINABILITY®** and
   **COACH** underneath. Under the logo it says *Use the same email and
   password as Trainability Studio.*
3. Tap the **Email** box and type your email address. With a
   @trainabilitystudio.com address you can type just the part before the @ —
   the app adds the rest when you log in.
4. Tap the **Password** box and type your password.
5. If this is your own phone or computer, tick **Keep me logged in**. Leave it
   unticked on a shared machine — see 2.2.
6. Tap the blue **Log in** button. It says **Signing in…** for a moment while
   the app checks.

You are now signed in, and you land on the home screen (chapter 3).

If the email and password do not match, the box says *That email and password
don't match.* in red under **Keep me logged in**, and nothing else happens.
Check both and try again. The message is the same whether the email or the
password is wrong — it will not tell a stranger which addresses have an
account.

#### 2.2 Staying signed in

**Keep me logged in** decides what happens the next time you open the app.

| | What happens |
|---|---|
| **Ticked** | You stay signed in for up to 30 days, even after closing the browser. |
| **Not ticked** | You stay signed in until you close the browser, or for a day at most. |

> **On a shared computer, leave it unticked.** Unticked, closing the browser
> signs you out, so the next person to use it cannot open Coach as you.

When you are still signed in, opening Coach goes straight to the home screen.

#### 2.3 If you have forgotten your password

1. On the sign-in screen, tap **Forgot password?** underneath the Log in button.
2. Type your email address into the **Email** box. If you had already typed it
   on the sign-in screen, it is there already.
3. Tap **Send temporary password**. The screen says the same thing whether or
   not that address has an account — it will not tell a stranger who has one —
   and the password itself only ever arrives by email.
4. Check your email. It may take a minute to arrive; look in the junk folder
   before trying again, because each try replaces the last password sent.
5. Tap **Back to login** and sign in with the temporary password.

The temporary password works in Coach and in Studio. See 2.4 for what to do
next.

#### 2.4 Signed in with a temporary password

A temporary password is meant to be used once and then replaced with your own.
When you sign in to Coach with one, the home screen shows a box at the top:
*You're signed in with a temporary password.*

1. Tap **Studio** in that box. Studio opens.
2. Sign in to Studio with the same temporary password.
3. Studio asks you to choose your own password. Type it into **New password**
   and again into **Confirm new password** — at least 8 characters — and tap
   **Set password & continue**.

Your new password now works in both apps. The box in Coach goes away the next
time you sign in to Coach.

> **An account that came over from the old app.** If your account was moved
> across from the old Trainability app and has not been given a password yet,
> trying to sign in shows **Check your email.** instead of an error, and a
> temporary password is sent to that address. Sign in with it, then follow the
> steps above.

#### 2.5 Signing out

1. Tap your initials (or your photo) in the top right corner.
2. Tap **Log out**.

You are back on the sign-in screen. Signing out of Coach does not sign you out
of Studio.

<div style="page-break-after: always;"></div>

---

### 3. The home screen

#### 3.1 Reading the screen

![The home screen](docs/images/02-home.png)

*The home screen*

From top to bottom:

- **The dark bar across the top.** The Coach logo and the words
  **TRAINABILITY® COACH** on the left; your initials (or your photo) on the
  right, which opens your account menu (3.2).
- **The blue band.** Today's date, and a greeting with your first name:
  **Good morning** until noon, **Good afternoon** until 5 PM, and
  **Good evening** after that.
- **Four cards**, one for each part of Coach being built:

| Card | What it will be for |
|---|---|
| **Today** | Your sessions for the day, at a glance. |
| **Clients** | Everyone you coach, with their goals and progress. |
| **Programs** | Workouts and plans you build and assign. |
| **Messages** | Check-ins and notes between you and your clients. |

Each card is marked **Coming soon** for now, and tapping it does nothing yet.

#### 3.2 Your account menu

1. Tap your initials (or your photo) in the top right corner.
2. A small panel opens with your name, your email address and what kind of
   account you have: **Trainer**, **Admin**, **Master** or **Front desk** —
   the same as in Studio.
3. Under that are **Open Studio** (3.3) and **Log out** (2.5).

To close the panel without choosing anything, tap anywhere outside it, or
press Esc on a keyboard.

#### 3.3 Going to Studio

Tap your initials, then **Open Studio**. Studio opens at
trainabilitystudio.com. If you are not signed in there, sign in with the same
email and password.

You can also get there from the sign-in screen: **Open Studio** is under the
white box, after *Part of the Trainability family*.

#### 3.4 Light or dark

Coach follows your phone or computer. If your device is set to dark mode,
Coach is dark too — a navy background with white and light blue words —
and light otherwise. There is nothing to set in the app.

<div style="page-break-after: always;"></div>

---

### 4. Words this app uses

| Word | What it means |
|---|---|
| **Coach** | This app, Trainability Coach, at trainabilitycoach.com. |
| **Studio** | Trainability Studio, the business's scheduling and billing app, at trainabilitystudio.com. Your account lives there. |
| **Temporary password** | A password emailed to you when yours is reset or forgotten. Use it once, then choose your own in Studio (2.4). |
| **Keep me logged in** | The tick box that keeps you signed in for up to 30 days on this device (2.2). |
| **Coming soon** | A part of Coach that is planned but not built yet. |

<div style="page-break-after: always;"></div>

---

### 5. When something goes wrong

**"That email and password don't match."**
One of them is wrong. Check the email for a typing mistake, and that Caps Lock
is off for the password. It is the same password as Studio — if it works there,
it works here. If you cannot remember it, use **Forgot password?** (2.3).

**"Too many failed sign-in attempts. Try again in … minutes."**
After several wrong passwords in a row, signing in is paused for a few
minutes to stop anybody guessing. Wait the number of minutes it says, then try
again — or use **Forgot password?** (2.3) instead of guessing.

**"This account has been archived. Ask a manager to restore it."**
Your account was archived in Studio, usually because you no longer work there.
A manager can restore it in Studio; until then it cannot sign in to either app.

**"This account is locked. Ask a manager to unlock it."**
A manager has locked the account in Studio. Ask them to unlock it.

**"Trainability isn't answering right now, so signing in may not work."**
This appears at the top of the sign-in box when Coach cannot reach Studio,
where accounts are kept. It is not something you did. Wait a minute and reload
the page.

**"Couldn't reach Trainability. Check your connection and try again."**
The sign-in did not get through. Check that your phone or computer is
connected to the internet, then tap **Log in** again.

**The temporary password email never came.**
Look in the junk or spam folder first. Each request replaces the last password
sent, so use only the newest email. If nothing arrives after a few minutes,
make sure the address is the one you use for Studio.
