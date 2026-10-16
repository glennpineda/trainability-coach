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

### Coach IQ ideas audit: all 25 to build

_From the ideas audit of Coach IQ (16 Oct 2026). Glenn went through all 25 one
by one the same day: all 25 to build, none parked or dropped. Numbers are the
audit's; sizes are the auditor's (S an hour or two, M a day or so). Grouped
into batches in building order; each item is struck from here as it is built.
Batch A (1, 2, 5, 7, 9 to 14, 17, 25) is built: build 1.0.4. Batch B (6, 18,
19, 20) is built: build 1.0.5._

**Record ids, Studio's way.** Every new record id is a 3-letter tag, 3 digits,
3 letters, 3 digits, lowercase (Studio's `server/db.js`, `newId`), with the tag
Glenn's to choose and never invented. His tags, 16 Oct 2026: **exr** an
exercise (a trainer's private exercise shares it), **exf** an exercise family,
**eqp** an equipment answer (replacing the made-up `eq_` ids), **exx** a
trainer's own name for an exercise, **tpl** a trainer's own place, **lim** a
client's limitation. Any other new kind means asking him first.

Batch C — library content (a starter set now; the books refine it):

15. **For people with limitations** (M), leaning to the groups Glenn sees:
    older adults, injury and post-rehab, pregnancy and postpartum, chronic
    conditions. Chair-based work, balance, getting up from the floor,
    step-downs, rotator cuff, breathing and pelvic floor, tibialis raises.
16. **Mainstream gaps** (M): kettlebell skills (Turkish get-up, clean,
    snatch, goblet carry), cardio away from machines (outdoor walk and run,
    jump rope, battle ropes, sprints, agility), loaded glute bridge, upright,
    landmine and T-bar rows, decline press, stretching, Pilates and yoga,
    isometrics.
8. **What each exercise is for** (M): purposes (strength, power, muscle
   building, endurance, mobility, balance and fall prevention, conditioning,
   control) and a usual role (warm-up, main lift, accessory, finisher,
   cool-down); the words settled with the first book.

Batch D — safety and trust:

21. **A table Glenn approves linking conditions to what to avoid** (M):
    condition → facts or joints → avoid, modify or refer on, applied in code;
    new facts: kneeling, deep hip bending and crossing the legs, sudden head
    movement, maximal effort, pressure in the belly.
22. **Client limitations** (S to decide, M to build): kept (lim…) in plain
    everyday terms tied to the facts, never diagnoses; which trainer wrote
    each; deletable; **seen by all of the client's trainers** (Glenn: "Yes,
    all their trainers"), each showing who wrote it. Billy is sent only what
    a task needs: not clients' email, phone or birthday when he doesn't.
23. **Scanned documents are read, never obeyed** (S); nothing from a scan
    reaches a trainer's memory without them confirming it on screen.

Batch E — names and Billy's tools:

3. **Trainers' own names and invented exercises** (M): own names (exx…) in
   the trainer's memory; an "unmatched" list from scans, linked to the
   library or kept as a private exercise (exr…); a way to suggest one to
   Glenn for the shared library.
4. **Billy's library tools, filtering in code** (M): "find this exercise"
   (any name, alias, former name or trainer's own name) and "find
   alternatives" (an exercise plus the client's equipment, level and
   limitations; only options that pass come back). Alternatives look in the
   family first, and widen to the movement pattern and main muscles when the
   family has nothing suitable (the second half of 14).

Batch F — review:

24. **A review page for the Primary Master** (M): one family at a time as
    cards, Approve and Flag, a comment box, a progress count; feeds idea 10's
    mark, and is the future home of the in-app book upload. Its records will
    need tags from Glenn when it is built.

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
