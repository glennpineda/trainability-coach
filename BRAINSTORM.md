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

- **The library in the app, not the code** (Glenn, 17 Oct 2026: asked "So we
  have to keep committing here to update the library? … Is there another way
  so it's app controlled?", then "Yes, use LIH" for the tag). Coach IQ's
  exercise library and conditions table move from `coach-iq/exercises.json`
  and `conditions.json` into Coach's own database, loaded from the files once;
  after that the database is the library and the files stay as the starting
  copy and a backup. The review page becomes an editor too: fix a name, a
  level or the muscles, add a version or a family, accept a trainer's
  suggestion in one tap. Every change keeps who, when and what it was before,
  as a library history record with Glenn's tag **lih** (in place of git's
  history, so a mistake can be undone). The checks `npm run check-iq` runs now
  run in the app on every save, and a change that would break the library is
  refused with a plain reason. An Export button gives a snapshot file. Book
  reading (Coach IQ's README, "Reading a book in the app") then writes here
  too. A change to the library's *shape* (a new kind of attribute) is still
  code; its content is not. Any other new kind of record still needs a tag
  from Glenn.

## Found in testing

_Problems a test run turned up. Recorded, not yet fixed — move one into Next
up to have it done. Each says which run found it. Once fixed, it goes straight
to [NEURALBRAIN.md](NEURALBRAIN.md#test-run-fixes) under **Test Run Fixes**,
in that run's write-up._

Nothing yet. Coach has not had a test run.

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
