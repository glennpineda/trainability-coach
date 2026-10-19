# Brainstorm

Glenn's scratch space. Half-formed ideas, things to do later, questions to come
back to. Nothing here is a commitment and nothing here is agreed.

**Next up is a working queue.** Saying **"brainstorm"** means: read Next up and
work through it. Claude also checks at natural points — starting a session,
finishing a task — and says what it found first rather than silently starting.
Anything destructive or ambiguous gets confirmed before it happens.

**Ideas, Questions and Parked are left alone.** Move something into Next up
when it is ready, so a half-written thought at the bottom of the file never
turns into a commit.

Finished items move straight to [NEURALBRAIN.md](NEURALBRAIN.md#completed-brainstorm),
under **Completed brainstorm**, with a note on how they were done. Nothing
finished stays here.

---

## Next up

_Things actually ready to do._

Nothing waiting.

## Found in testing

_Problems a test run turned up. Recorded, not yet fixed — move one into Next
up to have it done. Each says which run found it. Once fixed, it goes straight
to [NEURALBRAIN.md](NEURALBRAIN.md#test-run-fixes) under **Test Run Fixes**,
in that run's write-up._

### Run 1 (19 Oct 2026, build 1.0.81)

Six agents, each on its own copy of the app: two feature testers (A: clients
and their records; B: programs, sign-in, menus and Billy) and four audits
(D: design; U: ease of use; M: the manual; O and I: speed and ideas). Each
item keeps the ids of the reports that found it. How the run was done is in
[NEURALBRAIN.md](NEURALBRAIN.md#test-run-fixes), Run 1.

**Low**

- **The manual's pictures (M-1), Glenn's to do.** All six are build 1.0.0.
  `npm run screenshots` works again (build 1.0.144); run it on the Mac against
  Studio's fixture with SHOT_EMAIL and SHOT_PASSWORD in server/.env, then
  `npm run check-docs`. The rest of the manual points are done.
- **"No sessions yet" on the client while Home shows them trained today (U-22,
  D-16)**: maybe the stand-in Studio; check against the fixture.

**Questions for Glenn**

- **When a client stops agreeing, their photos stay in messages (A-14).** Any
  one of their trainers deletes every set, but copies already sent stay
  readable to trainer and client. As recorded; still right?
- **Ideas from the run (I-1 to I-14).** Measurements due on Today and Home
  (I-1) and as a filter (I-2); last values in the measurement form (I-3);
  offer photos after measurements (I-4); measurements beside Compare two days
  (I-5); "Since Jul 20: −4.2 lb over 13 weeks" under each chart (I-6); a retest
  reminder for fitness tests (I-7); a Message button on the client page (I-9);
  tap a muscle on the body drawing to add an exercise for it (I-10); use the
  room in wide screen (I-11); height, BMI and a body-fat estimate (I-12); one
  progress report to send (I-13); logging what was actually done in a session
  (I-14, large).

## Ideas

_Not thought through yet._

- **What goes on the home screen.** (16 Oct 2026) The four cards are
  placeholders, each marked Coming soon, so the shape could be judged before
  any of it is built: **Today** (the day's sessions), **Clients** (who you
  coach, goals and progress), **Programs** (workouts and plans you build and
  assign), **Messages** (check-ins and notes with clients). Which come first,
  and whether these are even the right four, is open.

- **One sign-in across both apps.** (16 Oct 2026) Today the email and password
  are shared but the sessions are not: signing in to Studio does not sign you
  in to Coach. Real single sign-on would need Studio to issue a session Coach
  can use on its own domain (trainabilitycoach.com is a different site from
  trainabilitystudio.com, so a shared cookie is out). A "Continue as Glenn"
  hand-off from Studio is the likely shape. Needs Studio changes.

- **Studio's wordmark font.** (16 Oct 2026; from the logo kit's README) The
  Coach wordmark is set in Poppins Bold as a stand-in. Swap in Studio's
  wordmark font before release so the two apps match, then regenerate the
  lockup SVGs and PNGs in `brand/lockup/`.

- **Bring more of Studio's look across.** (16 Oct 2026) Coach copied Studio's
  token names (`--ink`, `--paper`, `--chalk`, `--iron` …) so components can
  move between the apps. Studio's bottom nav, toasts and dialogs are the
  obvious next pieces once Coach has more than one screen.

## Questions

_To decide before building._

- **Should Studio trust the address Coach forwards?** Studio limits failed
  sign-ins per IP address as well as per email. Every request relayed through
  Coach arrives from Coach's server, so that per-IP budget is shared by
  everybody signing in to Coach. Fine at today's numbers. The fix is for Studio
  to trust `X-Forwarded-For` from Coach alone (a shared secret on the relay),
  which is a Studio change — worth deciding before Coach has many users.

## Parked

_Deliberately not doing, and why — so it doesn't get re-litigated._

- **Coach under Studio's domain at `/coach`.** (16 Oct 2026) The first plan,
  which would have shared Studio's session cookie for free. Set aside when
  Glenn chose a separate repository ("can we use a different repo?"), and
  Coach got its own GoDaddy app and domain, trainabilitycoach.com. The relay
  in `server/index.js` replaced it.
