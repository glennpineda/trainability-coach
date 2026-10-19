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

Run 1's mediums (Glenn, 19 Oct 2026: "Let's go through the mediums next"). Ids are Run 1's.

- **A program keeps reading a client after they leave (B-2, privacy).** An old
  program still loads the client's newest 1RMs and limitations
  (`programs.full`), can be edited, and Billy lists it. Read them only while the
  client is still the trainer's, or freeze it.
- **Linking a Coach account doubles "Where I usually train" (B-6).**
  `accounts.link` moves places without merging; Tess now has three of the same
  name. Merge, or rename.
- **Metric trainer sees "20 kg" on the day but "45 lb" in its box (B-7)**, and
  the hint says "In your units."
- **Coach IQ's rep check against a %1RM reads only "N" or the bottom of "N–M"
  (B-8).** At 75%: "12" warns; "10-12", "8–12", "11", "12 each side", "12 reps",
  "AMRAP" don't.
- **Loads it can't read as a percentage pass silently (B-9).** "0%", "1000%",
  "3x75%", "75-80%", "~75%", "75%+", "75% e1RM"; "0.5%" gives "about 1 lb".
- **A load over 100%, or a % with no 1RM, isn't flagged where it's typed
  (U-12).** The hint stays grey ("…about 250 lb." / "In your units."); the
  warning only comes in Coach IQ's check.
- **The 1RM warning asks the impossible for the trainer's own exercises
  (B-10)**: "Add one in their Fitness tests" — a 1RM can only be recorded for a
  library exercise.
- **The printed or sent program shows a bare "75%" when there is no 1RM
  (B-11)**, with no reminder to the trainer.
- **"Start designing" does nothing with no level chosen (B-12).** No message,
  no highlight.
- **Progress photo links die while the page stays open (A-9)**, after 1–2 h:
  full size gives a JSON 404. Refetch on focus or when a picture fails.
  (From the code.)
- **Taking an exercise out has no confirm or undo (U-7)**; taking a day out is
  a browser confirm ("with its 1 exercises"). Use the in-app confirm, or an
  Undo bar.
- **Sending a program takes six taps, and isn't checked first (U-8).** No
  "Send to Riley" beside Print for the client; empty days and "stop" points go
  unremarked.
- **A client's page has no programs (U-9, I-8).** No list, no "New program for
  Riley"; Today links client → program but not back.
- **A Coach account sees doors to nowhere (U-10).** Today's card says "once
  linked" forever; Home advertises Messages; the app switcher's Studio goes to
  the live trainabilitystudio.com (hard-coded, even in a test copy). Hide or
  label them for Coach accounts.
- **Billy still says clients are Studio's (U-11, M-22).** His opening ("that is
  Studio's job") and his prompt's rule ("Coach does not keep clients…") are out
  of date; manual 6.5 too.
- **Coach IQ's check is noisy on one exercise (U-13).** Five lines on one
  squat; "Ask first: Resistance bands" vs the dialog's "Nobody has said whether
  … has resistance bands." Group by exercise; word it as the dialog does.
- **Nothing shows where an added exercise went (U-14).** Scroll to it and
  highlight it.
- **Tab rows are built four ways, none Studio's (D-3).** The client record,
  Today and Active/Archived use Studio's filter look (the record's tabs should
  be the accent look); Review and Equipment places use round chips that wrap on
  a phone; none has arrow keys (Studio's `SegRow`); the picked chip is 1.2:1
  against its track.
- **White on the cerulean fails in dark purple, orange and green (D-4)**,
  3.88–4.22:1: initials, Equipment chips and Yes, Review chips, Designer and
  ExerciseDialog chips, LibraryEditor, ExercisesTab, Limitations. Use
  `--fill-cerulean`, as FitnessTests does.
- **The lit tab's white icon is faint at the sky end (D-5)**, 1.75–2.64:1 where
  icons need 3.
- **Programs and Messages are narrower than the other pages (D-6)** (`max-w-3xl`
  against `5xl`), so the left edge jumps between tabs and wide screen doesn't
  widen them; Installation is `max-w-2xl`, left-aligned.
- **Archive is a link and acts at once (D-7).** Studio's is a quiet icon that
  opens a confirmation. "{first} no longer agrees", which deletes every photo,
  is a small accent link right under Take progress photos (also U-21).
- **A cancelled session's words fail contrast (D-8)**: the row is faded to 0.6
  (2.47:1). Studio uses iron words.
- **Chart text grows with the window (D-9)**: about 9.5 px on a phone (series
  labels 8 px), 16 px on desktop; wide screen leaves half the card empty; the
  ten measure chips wrap to three lines on a phone. The body drawing's
  Front/Back labels the same.
- **Touch targets under 44 px (D-10)**: client record tabs (28), Swap (48×16),
  Equipment Yes/No (50×28), the 20 px text links (All programs, Print for the
  client, Ask Billy about it…), "no longer agrees".
- **Speed: the message list scans whole tables (O-1, O-2).** Two queries per
  conversation with no index: 1.3–2.2 s at 12,000 messages, 7 ms with an index
  on `coach_messages(conversation_id, created_at)` and
  `coach_attachments(message_id)`. The schema has no secondary indexes at all
  (`client_id`, `program_id`, `day_id`, `trainer_id`, `message_id`); add an
  `INDEXES` list to `migrate()`.
- **Speed: Studio is asked again on every request, often twice or more
  (O-3).** `/auth/me` and `/clients` each time; adding a client is six Studio
  calls; a master downloads the whole business list. Remember per request,
  cache briefly with Studio's ETag.
- **Speed: message polling (O-4).** An open thread reloads every 15 s and pulls
  the list again; nothing pauses when the tab is hidden; ~18 Studio calls a
  minute per open thread; 56 KB each time (video stills inline); a database
  write each poll.
- **Speed: other (O-5 to O-10).** Today asks Studio for the whole calendar
  (pass `from`/`before`); unsent attachments and their files are never cleaned
  (no delete, no sweep; photos copied, not linked); nothing gzipped and built
  files not cached (542 KB → 143 KB; copy Studio's `json-gzip.js`; split the
  Primary-only screens); photo thumbnails load full 1200×1600 pictures; Billy
  re-sends ~4,000 tokens of prompt and tools each round with no prompt caching;
  the program check is worked out again per call (111 queries for Billy's
  my_programs, N+1 history).


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

- **Manual (M-1 to M-37, A-11, A-12).** All six pictures are build 1.0.0
  (retake with `npm run screenshots`; `check-docs` only checks they exist).
  Not updated for Coach accounts: the opening, chapter 1, 2.1, 2.3, 3.2, 6.5,
  the Words table (Temporary password, Version, Archived client, Studio,
  Account menu; "Coming soon" never shows) and chapter 9 (the email message,
  the Coach lock-out, a missing client). Wrong or missing words: 3.4 (Today's
  line, cancelled not counted, load error), 3.5 (order, the list, "measurements
  due off"), 3.6 (print not black on white), 4.2 (empty-list words, no archived
  clients), 4.5, 4.6 (browser's "Please fill out this field."; the "already a
  client" line), 4.8, 4.10 ("Which table"), 5.1, 5.2/5.3 ("Change the
  exercise"), 5.4 (a Billy paragraph split by the gym one), 5.5, 6.3, 7.2, 7.3's
  title, Billy's errors, missing words (Coach account, Primary Master,
  Settings, Wide screen, Today, Superset, Place), and a "what each account can
  do" chapter like Studio's. Each with its corrected text in the report.
- **"Use a different email" keeps the old address (M-7)**, so typing adds to
  it. The forgotten-password screen says "It works in Studio and Coach." (not
  for a Coach account, M-8).
- **Wording (B-15, U-19).** "a upper body day"; "1 reps"; "(trx)" and no "and"
  in equipment lists; programs dated "10/19/2026" against "Oct 19, 2026"
  elsewhere (B-19); phone numbers as typed ("5550001111").
- **Odd entries go through (B-16, B-17)**: tempo "3-1-1", reps "-5", a carry
  suggested at "1–3 × 8–12".
- **Billy's my_programs gives kg to a pounds trainer (B-13)**; a program by
  name can find the wrong one ("Block" → "Next block", B-14).
- **Today shows "Client" with no name** for someone not on your list (B-18).
- **The temporary password is written in the server log** when email isn't set
  up (B-21).
- **Step test bands (A-13)**: 65 falls in 56–65 while "65+" starts at 66;
  women 56–65 Average and Below average overlap (a misprint?).
- **Coach IQ ignores the client's tests (U-15)**: a 1.26 × body weight squat
  still gets Bodyweight squat at beginner. The 1RM search lists banded and
  goblet squats before the barbell (U-16); "1RM 208.1 lb" and "Worked out from
  83.9 kg × 5" for 185 lb typed (U-17).
- **The printed program is written for the trainer (U-18)**: "75% (155 lb)",
  the primary/secondary line, "Nothing yet." days, no trainer name.
- **Casey's account button is named only "CD" (U-20).** Save their agreement is
  greyed with no reason (U-21).
- **"No sessions yet" on the client while Home shows them trained today (U-22,
  D-16)**: maybe the stand-in Studio; check against the fixture.
- **Design polish (D-11 to D-16).** Accent 4.44:1 on the page and 4.15 on its
  pale ground; plain "Loading…" ×20 and three kinds of empty state (Studio's
  LoadingLine and EmptyState); the main button in a different place on each
  tab and add-buttons of uneven width; Tests' group headings; the wide-screen
  button covers 6 px of content; Equipment's picked "No" barely shows; its note
  placeholder cut on a phone; a sent picture's print page says "This page is
  for ." and "Invalid Date"; measurement labels 450 px from their values on
  desktop; the browser's square focus ring round the tab pill.
- **Speed, smaller (O-11 to O-14).** Signed message file links change every
  call, so nothing is cached (round the expiry as photos do); the client
  page refetches each tab; Shell refetches clients and messages on every tab
  change; video stills kept as base64 in the database.

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
