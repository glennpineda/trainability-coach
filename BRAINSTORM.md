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

Nothing waiting. Run 1's findings are all fixed, decided or moved to Ideas
(NEURALBRAIN.md, Test Run Fixes, Run 1).

## Ideas

_Not thought through yet._

- **Health trackers, starting with Oura.** (21 Oct 2026; Glenn: "With the
  measurements, let's integrate with health tracker devices such as Oura,
  Whoop, and Fitbit. Let's go with them one by one and see what's possible.
  Primarily, to see if we can connect their health data to the time of their
  personal training session and the session they set. Let's start with Oura
  first.", then "Yes put it under ideas") One tracker at a time; Whoop and
  Fitbit to be looked at the same way. **Oura**, read from its API
  specification (openapi 1.42, cloud.ouraring.com/v2/docs, 22 Oct 2026; the
  cloud environment's allowed domains now include cloud.ouraring.com and
  api.ouraring.com):
  - **Access**: OAuth2 only (personal access tokens retired December 2025);
    the client consents to each kind of data (scopes `daily`, `heartrate`,
    `workout`, `session`, `spo2`, `personal`, `email`, `tag`,
    `heart_health`). An app is limited to **10 users until Oura approves
    it**. The client needs an **active Oura Membership**: lapsed, Oura answers
    403. Refresh tokens rotate.
  - **Heart rate** (`/v2/usercollection/heartrate`, any start and end time):
    **5-minute increments**, each sample a time, bpm and a source (`awake`,
    `workout`, `rest`, `sleep`, `live`, `session`). A 60-minute session is
    about 12 samples: an average, a peak and roughly the time spent hard, not
    set by set. Samples marked `workout` when the client starts a workout on
    the ring.
  - **Workouts** (`/workout`): start and end, activity, calories, distance,
    intensity (easy, moderate, hard), and source (`manual`, `autodetected`,
    `confirmed`, `workout_heart_rate`, `live_oura_heart_rate`,
    `live_third_party_heart_rate`). **Sessions** are Oura's breathing,
    meditation, nap and rest moments, not workouts.
  - **Daily readiness**: a score with its contributors (previous night,
    HRV balance, resting heart rate, recovery index, sleep balance, body
    temperature, activity balance …); also sleep, activity, stress, SpO2,
    VO2 max, resilience, cardiovascular age.
  - **Webhooks** (recommended by Oura) for workouts, readiness, sleep, daily
    activity and more, about 30 seconds after the phone syncs; **not heart
    rate**, which is asked for by time. Sleep arrives only once the client
    opens the Oura app. Rate limits per token and per app.
  - **A sandbox** (`/v2/sandbox/usercollection/…`, any bearer token) with
    made-up data (one heart-rate sample a day, so no help with intervals),
    enough to build against before an app is registered.
  - **What it gives Coach**: (1) a personal-training session's heart rate,
    from Studio's session time and length, once the ring has synced; (2)
    **readiness before the session** on Today ("Readiness 58 · HRV balance
    low · slept 5h 40m"), the strongest use; (3) the workouts the client does
    on their own, on their page.
  - **How a client connects**: a **Connect Oura** link the trainer sends from
    the client's page (Coach has no client sign-in yet; later from /me); the
    client signs in to Oura and agrees; disconnecting deletes what Coach
    kept. Coach's server holds the app's keys; health data needs its own
    consent words.
  - **Glenn's to do before real clients**: register the app on Oura's
    developer portal for its keys, and ask Oura for approval before the
    eleventh client.

- **Add-ons, starting with Programs.** (20 Oct 2026; Glenn: "I want to offer a paid
  subscription service to our members on Studio (members that goes to our
  gym). This monthly subscription allows them to receive up to 2 programs a
  month created on Coach. The trainers that creates these programs are either
  part of the Team on Studio or an online trainer. The trainer can use Coach
  IQ to create a program but needs to be verified by them before they send
  it.", then: "Can we call these subscriptions “add-on” services? Is this
  something we tack on a bill for one amount to Studio clients or
  separate?", and "Yes, update them") The plan talked through with Glenn, in
  two phases:
  - **Add-ons**: monthly services bought on top of a membership or training,
    by gym members and personal-training clients alike; **Programs** (2 a
    month) is the first, others may follow (nutrition, check-ins).
  - **Studio sells and bills them, each on its own**, copying its own
    memberships' billing (a monthly charge on the card it keeps, retries at
    3, 5 and 7 days, cancelling at the end of the paid month). Not folded into
    another bill: the CRM bills most memberships (adding to its bill means
    writing to the CRM), training clients have no monthly bill (they buy
    packages), and a failed add-on must never touch a membership or a session
    balance. **One charge where Studio bills both**: where it sells the
    membership itself, the add-on goes on the membership's day as one
    payment, the receipt listing each. **Your plans** on /me shows the
    membership and the add-ons together, so it reads as one account. Coach
    never touches money.
  - **A member asks; nobody is assigned.** *Request a program* on Studio's /me,
    one question at a time, asking what Coach's steps ask (focus, anything
    else, days a week, minutes, where they train and with what, anything the
    trainer should know, a trainer they'd like). Each request uses one of the
    month's two. Requests wait in a **queue in Coach**; a trainer takes one,
    and Coach IQ builds from the member's answers (`build`, with the steps
    filled in), which the trainer then works on.
  - **The trainer verifies before it can go**: *I've reviewed this program*,
    not offered while Coach IQ has a point to stop at, recording who and when;
    the member sees *Reviewed by Alex*. The Primary Master could check an
    online trainer's first few.
  - **Delivered on Studio's /me**, a new Programs tab, with a text or email
    when it is ready; the same route carries any program a team trainer sends
    to a client they train in Studio.
  - **Two kinds of trainer, one queue**: team trainers by their Studio sign-in;
    online trainers by their Coach accounts, seeing only what a request
    carries. Paid a fee per approved program: team trainers on Studio's
    balance ledger; online trainers settled by hand until phase two pays them
    through Stripe Connect.
  - **Phase one** is team trainers only; **phase two** online trainers and
    their payouts.
  - **Studio's half first**, asked for in six prompts Glenn gives to a Studio
    session, in order: [docs/STUDIO-PROMPTS.md](docs/STUDIO-PROMPTS.md) (a
    key for Coach to call Studio, add-ons with Programs first, requests and the queue,
    programs on /me, paying the trainer, later paying online trainers).
    Coach's half after each: the queue, taking a request into the steps, the
    approval, sending to Studio.

- **/me for Coach's own clients.** (20 Oct 2026; Glenn: "We also need to enable
  /me for Coach clients as well.") Clients kept in Coach (a Coach account's,
  ids `cli…`) aren't in Studio, and Studio's notes say people outside the
  business must never reach it, so they get Coach's own /me at
  trainabilitycoach.com/me, copied from Studio's (its server/client-portal.js
  and MANUAL-CLIENT.md): sign in with a six-digit code by text or email, no
  password, its own cookie and session table apart from trainers', the code
  hashed and spent after five wrong tries, nothing saying whether an address
  is known, ninety days from the last visit. To start: their programs (the
  same tab Studio's /me gets), and perhaps their Messages, which today can't
  reach a client kept in Coach. A client a team trainer trains in Studio, and
  every gym member, keeps Studio's /me. Studio first for every screen and
  message.

- **Retest reminders for fitness tests (Run 1, I-7).** (19 Oct 2026; Glenn:
  "Keep it in Ideas") A **Retest every** setting, off by default, like
  Measurements every: "Tests due" on the client as measurements due works,
  and a Coach IQ note on a load worked out from a 1RM older than that.

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

- **Who joins the pool of trainers who verify Programs add-on requests**
  (20 Oct 2026; Glenn: "I need to decide who can join this pool of trainers
  that can verify programs"). Glenn's to decide before Studio's prompt 3 (a
  per-trainer setting, kept by a master) is given. To settle: who may join
  (any team trainer or only some; for online trainers, a certification,
  insurance, experience?); how they are let in (switched on by a master,
  perhaps after a trial program or two Glenn reviews); how quality is kept
  (the Primary Master checking their first few; taken out of the pool for
  late programs or complaints); and what they may write for (beginners only
  at first? nobody with limitations until proven?). Also on hold until then:
  rewriting prompt 6 around Stripe's Global Payouts, which can pay
  individuals in the Philippines in PHP by wire with an email and a name
  (Connect can't, the Philippines not being a Stripe account country);
  monthly batches, a W-8BEN from each, and which Stripe balance pays.

- **The Programs add-on: Glenn's to decide** (20 Oct 2026, from the
  plan in Ideas). The price, and who sets it (a master, as the business's own
  plans?). The two programs: by billing month or calendar month, and do
  unused ones expire? The turnaround promised (3 working days?). Does a member
  pick their trainer, or the queue decide? The trainer's fee per program, and
  whether it differs for online trainers. A program not delivered in time: a
  refund, or the request given back? Studio's prompts ask most of these again
  where they are built.

- **Studio 2's old measurements (`Measurements_T`): remind Glenn when he is
  on his Mac.** (19 Oct 2026; Glenn: "remind me again later, I'm on cloud
  right now") He wants to see what the old app kept, matched to today's
  clients through Studio's `migrated_ids`, shown only, nothing written. A
  cloud session can't read live (no credentials, and it was refused), and
  Studio's migration never read this table (not in docs/OLD-SCHEMA.md). On
  the Mac, read-only: in Studio 2's data database `SHOW COLUMNS FROM
  Measurements_T;`, `SELECT COUNT(*) FROM Measurements_T;`, `SELECT * FROM
  Measurements_T ORDER BY 1 DESC LIMIT 20;` and the whole table as a CSV; in
  Studio's database `SELECT old_id, new_id, kind FROM migrated_ids;` as a
  CSV. With those files: what it measured and in what units, how many rows,
  clients and days, how many match a client today and which don't, and how
  each would map onto Coach's measurements. Then Glenn decides on an import.

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
