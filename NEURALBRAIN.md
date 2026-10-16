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

- **Coach IQ ideas audit, and all 25 ideas decided** (16 Oct 2026; Glenn: "Can an ideas auditor go through this feature we just built to see if there's anything we forgot or can improve early in this stage?", then "Ok let's go through them one by one and ask" me). Done the way Studio runs its ideas audits (found in Studio's NEURALBRAIN, Run 15 onward: numbered ideas, sized S or M, gone through by Glenn, filed in BRAINSTORM). One read-only agent went through `coach-iq/` (README, exercises.json, EXERCISES.md), `server/coach-iq.js`, `scripts/iq.mjs`, the equipment memory (`server/db.js`, `server/equipment.js`, the `/api/equipment` routes, `EquipmentTab.jsx`), Billy's tools and the latest NEURALBRAIN entries, and returned 25 ideas under Forgotten, Data model, Naming, Library content, Equipment memory, Safety and trust, and Process, each with whether it must come before the first book or scanned program. Its counts were spot-checked before they reached Glenn: about 40 versions whose modality disagrees with their equipment (the auditor said 39; the spot check, by a slightly wider rule, 45), the cause being that the split by equipment copied each original's modality; 65 one-way harder links; 46 versions with no links; the machine-assisted pull-up carrying "band-assisted pull-up" as an alias; 123 beginner, 86 intermediate, 20 advanced; the one-arm dumbbell row named with a bench but not needing one. Glenn then went through them one at a time and chose **build for all 25**, with these answers on the way: pounds by default (idea 2); attachment right after the equipment (12); the lunges merged with the direction said first (14), and alternatives widened to the pattern as well; level means skill and strength needed (9); a starter set for limitations now, leaning to older adults, injury and post-rehab, pregnancy and postpartum, and chronic conditions (15); mainstream gaps now (16); equipment per place inside the trainer's memory (18); Billy confirms before changing a trainer's own answer (20); limitations seen by all of a client's trainers (22); the in-app review page rather than a decisions list (24); `check-docs` to run `check-iq` (25). For idea 3 he asked: "take a look at Studios ID prefix and convention btw". Studio's `server/db.js`: ids are a 3-letter tag, 3 digits, 3 letters, 3 digits, lowercase (`usr123abc456`), from a `PREFIX` list that is Glenn's alone ("Never invent a prefix"), with `insertWithNewId` retrying a rare clash; its 43 tags were listed so Coach's never collide. That also changed idea 1's fix from freezing today's name-made ids to giving every exercise and family a permanent Studio-style id. Coach had broken the convention once already: My equipment's rows are `eq_` plus a UUID, a tag Claude made up. Glenn's tags: **exr** exercise, **exf** exercise family, **eqp** equipment answer, **exx** a trainer's own name for an exercise, **tpl** a trainer's own place, **lim** a client's limitation. All 25 are now in BRAINSTORM's Next up in six batches (A the library's foundations, B the equipment memory, C content, D safety, E names and Billy's tools, F the review page) with every answer written in. Nothing built yet. This entry is build 1.0.3.

- **Every commit bumps the build number** (16 Oct 2026; Glenn: "We bump the build number whenever we commit"). Written into CLAUDE.md under Versions, so every session follows it: the build is the patch part of `version`, bumped with `npm version patch --no-git-tag-version`, with `package.json` and `package-lock.json` committed alongside the change. What changed in the way of working: a piece of work is now one commit with its NEURALBRAIN entry inside it, naming the build rather than a commit hash; until now an entry had often followed in a second commit to quote the first one's hash, which under this rule would spend two builds on one change. The manual's "Version 1.0.1 · Caesious" examples stay as examples rather than being rewritten every commit. Different from Studio, where a build bump is its own pull request after a merge. This entry is build 1.0.2.

- **Build 1.0.1** (16 Oct 2026; Glenn: "Push, bump build and merge"). Coach's first build bump. Coach has no build-number script as Studio does: its build is the patch number in `package.json`, so `npm version patch --no-git-tag-version` took 1.0.0 to 1.0.1 (and `package-lock.json` with it), still Caesious, since build numbers get no name (CLAUDE.md). It covers everything since 1.0.0: the Clients tab, Billy with photos and PDFs on Sonnet 5.5, Coach's own database, My equipment, and Coach IQ's rules, exercise library, families and master names. The manual's three examples of the version now say 1.0.1; the CHANGELOG keeps one heading per minor version (1.0 Caesious), as Studio's does. Checked: `/api/health` answered `"version":"1.0.1"` and the built page carries "1.0.1 · Caesious". "Merge": Coach's work goes straight to `main`, so nothing was waiting; the one other branch on GitHub, `claude/compassionate-bardeen-0w8ugz`, holds the first, separate-page version of the Clients work, which was rebuilt into `main` as the Clients tab (`4b5c560`), so it was not merged, since that would bring back files `main` replaced. The 5 commits before this were pushed first (`96ff0d7`). Commit `bc9de6e`.

- **Coach IQ: velocity named only when it differs from the usual, confirmed** (16 Oct 2026; Glenn: "Also, name the velocity only when it differs from the exercise's usual."). The rule had already been applied as the suggestion while his answer was pending (previous entry), so no name changed: *Swing — Kettlebell*, while *Squat — Bodyweight, Jumping* and *Pull-Up — Bodyweight, Eccentric* keep theirs. `coach-iq/README.md` now gives it in his words.

- **Coach IQ: families, and master names made from attributes** (16 Oct 2026; Glenn: "I'd go with C"). Three word orders were put to him on the same nine exercises (A like a sentence, B equipment first, C movement first); he chose C: `Movement — position, support, limbs, equipment, load, grip, velocity, plane`. The velocity question (name it only when it is not the movement's usual) went unanswered and was taken as suggested, which keeps "Swing — Kettlebell" rather than "Ballistic"; easy to change since names are made, not stored. Also decided along the way, and said in the reply: names end in a recognisable movement word (Romanian Deadlift, Split Squat) rather than the bare pattern (Hinge), with the pattern kept on the family; equipment always named except Bodyweight in families that are only ever bodyweight and where the movement's own name says it (`implementInName`: Leg Press, Hack Squat, Back Extension, Sled Push and Drag, Box Jump, Elliptical, Rowing Machine, Stair Climber, Ski Erg, Foam Rolling); the cardio rowing machine is its own family so it never mixes with the strength Row family. **`server/coach-iq.js`**: `ORDER`, `WORDS` (the words each of the eight attributes may use: thirteen positions, ten supports, three limb settings, twenty-four pieces of equipment, seven loads, five grips, seven velocities, three planes), `masterName`, `bodyweightFamilies` and `slug`; shared by the checker now and meant for Billy and the program reader later. **The conversion**: the 177 flat exercises were mapped by hand, one line each, to a family and attributes (a one-off script in the session's scratchpad, not committed), and split into one version per piece of equipment wherever the starter list allowed several ("dumbbell or kettlebell"), with a bodyweight version first where the movement is commonly done unloaded: 109 families, 229 versions, so an equipment fallback is a sibling in the same family (Row — Seated, Machine to Row — Bent-Over, Bench, Single-Arm, Dumbbell). Ids are the master name in lowercase, hyphenated, and the checker insists on it; easier and harder links were pointed at the first version of what they named. Common names of new versions swap the equipment word where the name has one ("Bent-over dumbbell row", not "Dumbbell bent-over barbell row", the first attempt) and put it in front otherwise, keeping proper names capitalised (Romanian, Russian). Chin-up became *Pull-Up — Bodyweight, Supinated-Grip* with "Chin-up" as its common name, the convention working as meant. `exercises.json` is now `{movements, exercises}`; each version lost its own `pattern` (it is the family's) and gained `movement` and `attributes`. **`scripts/iq.mjs`** checks families, every attribute word against `WORDS`, ids against master names, no two versions sharing a master name, and that every family has a version; `EXERCISES.md` now lists pattern, then family, then each version's master name first and its common name beside it. No duplicates on the first run. Commit `13990f5`.

- **Coach IQ: exercise names, four decisions** (16 Oct 2026; Glenn: "I'd also like to introduce a proper naming convention for the exercises. Each trainer can call every exercise differently, but it would be good to have a name that explains the exercise by: position, velocity, plane, modality etc, can we build our \"own\" master name and have display names for trainers? Let's discuss", then "1. Leave them out 2. Let's have some examples so I can decide properly 3. When it isn't obvious 4. Their trainers name, the trainer creates the program so their word wins 5. Families would be great, also perfect for finding alternative exercises, and people with limitations"). Proposed and agreed: three kinds of name per exercise, a master name made from attributes (position, support, limbs, equipment, load or grip, movement, plane, velocity) in a fixed order and never typed, a common name shown by default, and each trainer's own names in their personal memory (which is also how a scanned program's shorthand is matched). Decided: attributes at their usual setting (standing, bilateral, controlled) are left out of the master name; the plane is named only where the movement does not already say it; a client sees their trainer's name; exercises are grouped in families, a base movement with versions defined by attributes, so alternatives (an equipment swap, an easier position, a progression in velocity) come from changing one attribute. Written into `coach-iq/README.md`. Open: the order of the words, put to Glenn as worked examples. The 177 exercises are not yet restructured; that follows the order. Commit `035dc96`.

- **Coach IQ: the exercise library's starter list** (16 Oct 2026; Glenn: "3. A starter list you draft"). 177 exercises in `coach-iq/exercises.json`, drafted by Claude from general knowledge (no book read yet) for Glenn to review. Each records an id, a name and other names people use (RDL, Bulgarian split squat, TRX row), its movement pattern (squat, hinge, lunge, horizontal and overhead push, horizontal and vertical pull, carry, four kinds of core, rotation, single muscle, jumping and throwing, conditioning, mobility), main and other muscles from a fixed list of eighteen, a modality (bodyweight, free weights, kettlebell, machine, cable, band, suspension, plyometric, conditioning, cardio, mobility, yoga, pilates), its equipment as `needs` (all of these) and `oneOf` (any one of these) in the fifteen kinds of My equipment's checklist, plus a `piece` where it has one (Low row machine, Leg press machine, Trap bar, Landmine, Treadmill), so a missing piece falls back by kind; a level; easier and harder versions by id; and cautions as the joints it loads plus plain facts about it from a fixed list of twelve (high-impact, spinal-load, spinal-flexion, spinal-rotation, overhead, lying-on-back, lying-face-down, inverted, balance, breath-hold, floor-transfer, grip). The decision behind the cautions: the library says what an exercise *is*, never which illness rules it out; which conditions call for care with which facts (pregnancy and lying on the back, high blood pressure and holding the breath or the head below the heart, osteoporosis and rounding or twisting under load, balance problems, an older client getting to the floor) belongs in Coach IQ's principles from the books, so the medical judgement sits in one reviewed place. Spread: 16 squat, 15 hinge, 8 lunge, the pushes and pulls with bodyweight, band, suspension, machine, cable and free-weight versions of each movement so alternatives exist across equipment, carries and sleds, 17 core including a Pilates hundred, 25 single-muscle, 9 jumping and throwing, 16 conditioning (eight cardio machines), 12 mobility including three yoga poses. `scripts/iq.mjs`, `npm run iq` and `npm run check-iq`: every word checked against its list and every easier or harder id against the library (its first run caught three places where a joint had been put where a muscle belongs: hips, ankles), and `coach-iq/EXERCISES.md` written as tables by pattern for Glenn to read, never edited by hand. Kept out of the repository: the one-off Python script that drafted the list; the JSON is now the source. Not yet read by Billy; that comes with the principles. Commit `79f68a1`.

- **Coach's own database, and My equipment** (16 Oct 2026; Glenn: "1. go with your suggestion 2. Yes 3. A starter list you draft", then "The live secret already defines db_host, db_port, db_name, db_user and db_password", "And yes, it's hosted where Studio is hosted", "This is going to be a new and empty database this all manages"). Before writing anything it was asked whether those variables named Studio's live database or a new one, because Studio's CLAUDE.md guards its live database (real members and money) and a mistake in Coach should not be able to reach it; Glenn confirmed a new, empty database for Coach on the same server. Studio's `server/db.js` explains the names: GoDaddy's Node hosting gives each app its own database as `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. **`server/db.js`** follows Studio's: MariaDB through `mysql2` (3.24, added) when `DB_HOST` is set, `DB_SSL=true` for a server that asks for TLS; otherwise SQLite built into Node (`node:sqlite`, the reason Coach already required Node 22.5) in `server/coach.sqlite` or `COACH_SQLITE_PATH`, git-ignored, so a Mac or a cloud session with nothing set can never reach the live one (checked in this session first: none of the five set, no `server/.env`, values never printed). Tables are made on start (`migrate()` before `app.listen`; if the database cannot be reached the log says so and the app still starts, so sign-in and Clients keep working) and every one is named `coach_…`. SQL kept to what both run: ids made in code, VARCHAR keys, explicit timestamps, read-then-write instead of an upsert. `/api/health` gained `database` (`mysql` or `sqlite`), never the address. **`coach_equipment`**: one row per answer, `kind` `category` (the checklist) or `item` (a particular piece), `has` 1 or 0, `category`, `where_note`, `source` (`trainer` or `billy`), unique per trainer, kind and lowercased name. **`server/equipment.js`**: the fifteen checklist kinds in order (dumbbells, barbells and a rack, kettlebells, weight machines, cables, a bench, a pull-up bar, resistance bands, a suspension trainer, medicine balls, a stability ball, a plyo box or step, a sled or turf, cardio machines, mats and foam rollers), keys kept forever; a checklist answer of null deletes the row (not answered); a piece needs a name, a checklist kind and yes or no. **Routes** `GET /api/equipment`, `PUT /api/equipment/categories/:key`, `POST /api/equipment/items` (makes or changes, by name), `DELETE /api/equipment/items/:id`: the trainer is always whoever Studio's `/auth/me` says is signed in, never an id from the browser, through a small `asSignedIn` wrapper. **Billy**: two tools, `my_equipment` and `remember_equipment` (kind, checklist kind as an enum of the fifteen, name, has, where); his prompt now says to check the equipment before suggesting an exercise, to ask about a particular piece once and write the answer down, to keep the movement and change the equipment when a piece is missing (no low row machine but dumbbells: a dumbbell row), and to record only what the trainer has just said, never a guess and never the checklist on their behalf; "you change nothing" became "apart from noting their equipment". What he writes is marked `billy`. **The page**: My equipment, from the account menu (a Dumbbell icon, above Open Studio), a page with no button on the tab bar (`PAGES` in `Shell.jsx`, remembered across a reload like a tab): The basics, fifteen lines each with Yes and No, saved as tapped and taken back by tapping the chosen one again; Particular pieces, each with its kind and where, Yes and No, a bin, and "Noted by Billy" in lilac when he wrote it; Add a piece (name, What kind is it?, where, Do you have it?, Add). **Tested** in the cloud on a SQLite file in the scratchpad with the stand-ins for Studio and Claude: health said sqlite; the page refused without a session; fifteen kinds, none answered, at first; answers saved, changed and taken back; an unknown kind 404 and a nameless piece 400; told "there is no low row machine at the studio", the stand-in Claude called `remember_equipment` and the piece appeared as Billy's, not had, at the studio; a piece removed; Billy's request carried all three tools; in Chromium the menu opened the page, a Yes and an added piece survived a reload, no console errors. **Not tested:** MariaDB itself, since there is no database here; the first start on the host will make the table, and its log line says where it connected. Manual 3.5 and new 3.7 My equipment, 5.5 updated; README "Coach's database"; `.env.example`; CHANGELOG. Commit `604ef89`. Next: the exercise library's starter list.

- **Coach IQ: three decisions, and reading a book in the app** (16 Oct 2026; Glenn: "1. go with your suggestion 2. Yes 3. A starter list you draft. When it comes to the Coach IQ \"knowledge upload\" of PDF, can we can that in-app? Have a functionality for the primary master?"). Decided, now in `coach-iq/README.md`: Coach keeps the personal memory in a database of its own, linked to Studio's trainers and clients by id, Studio unchanged; Billy may write down a trainer's answer, only what they have just told him, on view and correctable; the exercise library starts from a list Claude drafts, reviewed by Glenn, which the books add to. In-app reading answered yes and proposed, not built: a Coach IQ page for the Primary Master alone (`user.isPrimary` from Studio's `/auth/me`, the same flag that draws the gold badge); upload a PDF, read in the background a part at a time (Claude takes up to 600 pages or 32 MB a request, so a book goes in parts), progress shown, the PDF discarded once read; a draft by topic of what is new, changed or in disagreement, accepted, edited or rejected part by part, nothing reaching Billy until accepted, each change keeping its upload and date. Estimated at about $1 to $4 a book on Sonnet 5.5 for 300 to 500 pages. Consequence: Coach IQ would live in Coach's database with its own history rather than as files in git, the README staying as its rules. Asked of Glenn: what database the Coach app can have on GoDaddy (suggested: a separate database for Coach on the cPanel MariaDB that Studio uses, its own user, none of Studio's tables, if Airo can reach it; or Airo's own; a file database only if Airo keeps files across deploys), and whether the first book waits for the in-app page or is distilled in a session now and loaded into the database later. Commit `021c93d`.

- **Coach IQ: equipment is part of each trainer's personal memory** (16 Oct 2026; Glenn: "Equipment memory should be part of the personal workout programs memory they have already."). Settles the open question of whose equipment it is: the trainer's, not a place's. Read as two kinds of knowledge, now written into `coach-iq/README.md`: Coach IQ, the shared book Glenn reviews, the same for everybody; and each trainer's personal memory, learned as they use Coach, holding their own programs once scanned, how they like to program, and their equipment. The "already" refers to the personal memory as planned for the program scanner: nothing of it is built yet. Noted for later rather than asked: a trainer working in more than one place (a studio and a client's home) has it noted inside their memory where each piece is, rather than a list per place. Still open: whether Billy may write down a trainer's answer, and where Coach keeps the personal memory (suggested: a database of Coach's own, linked to Studio's trainers and clients by id). Commit `0133d69`.

- **Coach IQ: equipment, asked little and learned as it goes** (16 Oct 2026; Glenn: "Equipment should really be defined, i think we should ask for surface level equipment, such is \"is there dumbbells? Barbells? Kettlebells? Machines?\" and from there when the trainer creates a new program, Billy then asks them if they have a for example a \"low row machinr\" if not, we know they may have dumbbells so we modify the modality to dumbells. Slowly the personal brain will learn better"). Written into `coach-iq/README.md` as its own section: a yes-or-no checklist of equipment categories first; Billy asks about a specific piece only when a program needs it and keeps the answer; every library exercise names its specific equipment and its category, so a missing machine falls back to the same movement in an available category (the low row machine to a dumbbell row); and this learned knowledge is kept apart from Coach IQ, which stays the shared book Glenn reviews. Put to Glenn, not yet answered: equipment belonging to a place (suggested, since one trainer may work in a studio, a client's home and a park; Studio's places for the studios, a trainer's own for the rest) or to a trainer; whether Billy, who changes nothing today, may record a trainer's answer (suggested: only what they just told him, on view and correctable); and where Coach keeps it, which is the first data Coach would store itself (suggested: a database of Coach's own, linked to Studio's places and clients by id, as for programs). Commit `d57682a`.

- **Coach IQ: modalities, alternatives and variety** (16 Oct 2026; Glenn: "Also, for Coach IQ, it needs to learn about different modalities, alternative exercises (based on fitness level, disabilities, illnesses, limitations), but also be able to keep it fun by suggesting other exercises that hits the same muscle group/goal."). Read as needing structure as well as prose: alternatives are found by matching, which prose does badly, so Coach IQ became two parts in `coach-iq/README.md`. **Principles**, one file per topic, including adapting to a level, a disability, an illness or a limitation and when a doctor's clearance comes first (general adaptations and referral, never a diagnosis, as Billy's own rule already says). **The exercise library**, a list in which each exercise records its movement pattern, muscles, modality and equipment, level, easier and harder versions, and cautions (joints loaded, conditions that call for care); an alternative is the same movement and muscles with a different tool or level and nothing the limitation rules out, and variety is the same goal by a different exercise. Open, put to Glenn: what equipment the studios have, whether the library starts from a list drafted from general knowledge or only from the books, and how the library is kept (a data file in the repository is the suggestion). Commit `b2eab96`.

- **Coach IQ: the decisions, and its folder** (16 Oct 2026; Glenn: "Before we scan personal workout programs designed by personal trainers, i want to start feeding Coach's knowledge in designing a proper workout program. Now i have a few books that I've read and have them in pdf files. What would be the best way to feed it's knowledge and have a \"brain\" that we create and store. This is the base of how it designs and assists trainers with their own workout programs. These are actually not programs themselves, it's more best practices and principles.", then on the four questions: "I'll give you the pdfs one by one", "books are there as a guideline and assistance only, trainers words always wins", "I'm thinking we are going to learn from all these books and write our own \"book\" (which is the brain), so no need to see the source", "lets call it Coach IQ"). The approach recommended and taken: not the books themselves in Billy's reach (copyright, fragments and contradictions from searching raw pages, and many times the cost) but a distilled book of principles in our own words, reviewed by Glenn, kept in the repository as one file per topic so git holds its history, and given to Billy whole with each question under prompt caching (about a cent or two a question on Sonnet 5.5 at the size expected; a lookup tool like Studio's manual search if it ever outgrows that). Glenn's answers, as now written in `coach-iq/README.md`: the PDFs come one at a time and are never committed; the first book sets the outline; the trainer's word always wins (Billy may mention a difference once, then follows the trainer); Coach IQ is Trainability's own book, so it never names or quotes a source and trainers never see one; where books disagree it gives the range rather than a side (his answer settled trainer against book, and the range follows from it for book against book); nothing goes in unreviewed. `coach-iq/READ.md` lists the books read, for Glenn only, not for Billy or trainers. Named Coach IQ, kept apart from NEURALBRAIN.md, which is the project's memory. Nothing written into it yet: the first PDF sets the topics. Billy is not wired to it yet either; that comes once there is something reviewed to give him. Commit `d2c8116`.

- **Billy answers with Sonnet 5.5 by default** (16 Oct 2026; Glenn: "Is there a reason we are using opus and not sonnet? Sonnet 5.5 seems to be good enough for this"). There was none beyond Anthropic's general advice to default to its current recommended model, Opus 5.5; nothing Billy does in Coach (one client lookup, reading a photo or a PDF, short answers) needs it, and Sonnet 5.5 is half the price ($2 / $10 per million tokens in and out, against $4 / $20). `server/billy.js` now defaults to `claude-sonnet-5-5`; `ASSISTANT_MODEL=claude-opus-5-5` still picks Opus. Checked against the Sonnet 5.5 rules before changing it: the refusal fallback in its `"default"` form (beta `server-side-fallback-2026-07-01`) is accepted for Sonnet 5.5 on the Claude API, which is where Coach calls it; no sampling settings or thinking budget are sent (either would be a 400 on it); effort stays `medium`, the level suggested for work with lookups (Sonnet's own default is `high`). Tested against the stand-in for Claude's API: the request carried `claude-sonnet-5-5`, `fallbacks: "default"` and effort medium, and "Who are my clients?" answered as before. `.env.example` and README say the new default. Commit `31a8398`.

- **Billy in Coach: the header button, his panel, photos and PDFs** (16 Oct 2026; Glenn: "For some of the features we've talked about earlier (reading files and pictures), so we should probably have Billy here as well. Let's go through the set up process so i can add the Claude keys (see how Studio is doing it), then let's add Billy on the header on Coach too to start testing him."). The earlier talk about reading files and pictures is not in this repo's notes; it was taken as: Billy should read a photo or a PDF a trainer gives him. **How Studio does it** (read from `glennpineda/trainability-studio`, unchanged): `server/assistant/chat.js` posts to Claude's Messages API with plain `fetch`, the key in `ANTHROPIC_API_KEY`, the model in `ASSISTANT_MODEL` (Studio's `.env.example` says `claude-sonnet-5`), `ASSISTANT_TRACE` to log turns, `ASSISTANT_API_BASE` for a stand-in on localhost only; with no key `/api/assistant` says `available: false` and no screen shows him (Studio's DEPLOYMENT.md, "Billy, and his voice"). Around it Studio has a manual search, about twenty tools into its database, booking proposals, voice and a question log, none of which Coach has a use for yet. **Coach's Billy** keeps Studio's names so one setup serves both, and is otherwise small. `server/billy.js` uses Anthropic's own SDK (`@anthropic-ai/sdk` 0.135, added to dependencies) rather than Studio's plain fetch, as Anthropic's guidance for a JavaScript project asks; default model `claude-opus-5-5`, Anthropic's current recommended model (`ASSISTANT_MODEL` overrides it, `claude-sonnet-5-5` being the cheaper choice), effort `medium` set explicitly, and the refusal fallback on (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`), so a question the model declines on safety grounds (an injury, say) is answered by the fallback model in the same call; a refusal that still stands says "That one I can't help with." His prompt is Studio's manner cut short (dry, one line of him per answer, straight-faced on health, money and bad news) plus Coach's job: read what he is given, look a client up rather than guess, never name his tools, change nothing (Coach keeps no clients; Studio does that), and he is not a doctor or a dietitian. One tool, `my_clients`, run with the asking trainer's own session through `myClients(req, user)`, which the Clients tab's `/api/clients` now shares (pulled out of that route, with `signedIn(req)` and a `StudioRefused` error that carries Studio's own answer back), so Billy sees exactly the fields the Clients tab does. Up to six rounds of ask-and-look-up. **Routes**: `GET /api/assistant` (signed in) says `available` and the model; `POST /api/assistant` checks the session with Studio first, then the conversation (`checkHistory`: at most 60 messages, a user's words at most 4,000 characters, and a user's content only text, a base64 JPEG/PNG/GIF/WebP image, a base64 PDF document, or a tool result), then answers; with no key, a 503 "Billy isn't set up on this server yet."; a refused key, a 503 that says so in words to pass on; Claude's 413 and 429 have their own messages, anything else "Billy couldn't answer just now." The conversation is Claude's own copy, thinking and tool results included, handed back to the browser after every answer and sent whole with the next, as in Studio, so Coach stores none of it. `express.json` takes 32 MB on `/api/assistant` (Claude's limit for one request), mounted before the 20 kB parser for the rest of `/api`, which then leaves an already-read body alone; a 30 kB sign-in still gets 413. **The screen.** His face is Studio's `AssistantMark` and his eight SVG moods, copied into `src/billy/` with `iw-` renamed `cx-`, and held still by `src/index.css` when the device asks for less motion. `src/billy/Billy.jsx`: `BillyButton`, a 36px lilac square beside the badges (before the account menu), his face in it (thinking while he works), an up-arrow while open, a blue dot when an answer is waiting; `BillyPanel` hangs from the header's right corner (up to 26rem wide), with his face (waving when empty), "Ask about your clients, or send a photo or a PDF.", a round-arrow New conversation, the thread (his answers drawn as paragraphs, "- " lists and **bold**, from text, never HTML), and a box: paper clip, "Ask Billy…", a blue arrow; Enter sends, Shift+Enter is a new line, Esc folds it away. `src/hooks/useBilly.js` keeps the thread and the turns, asks `/api/assistant` once for whether he is here, and prepares a file: a photo is redrawn on a canvas at no more than 1600px on its longest side and sent as a JPEG at 0.85 (a GIF is left alone so it keeps its frames; a transparent PNG gets a white ground), a PDF goes as it is up to 15 MB, anything else is refused in words (HEIC included). A question that fails comes off the thread and stays in the box with its file, to send again. Shown only where the server has a key. **Tested** in the cloud with no key, against two stand-ins in the session's scratchpad (Studio's API on 4242, as before, and Claude's on 4243 via `ASSISTANT_API_BASE`, which logs what each request carried): the request went to `/v1/messages` with the key, `claude-opus-5-5`, effort medium, the fallback beta and `fallbacks: "default"`, and the `my_clients` tool; "Who are my clients?" looked them up through Studio with the trainer's session and came back as a list; a 4000×3000 PNG left the browser as a JPEG; a PDF arrived as a document; the thread grew to seven messages across three questions; a URL image was refused by the server; closing kept the conversation with the dot shown, New conversation cleared it; without a key the route said `available: false` and the button was not drawn; phone width and 1200px, light and dark, no console errors. **Not tested:** a real answer from Claude, since there is no key in the cloud, so how well he actually reads a food log or a form is for Glenn's first tries. No manual picture of him yet: the stand-in's answers would have been the picture. **Glenn's to do:** a key (see the setup in the reply), in `server/.env` on the Mac and in the Coach app's environment variables on GoDaddy Airo. Manual chapter 5 "Asking Billy" (5.1–5.5), Words and When something goes wrong renumbered to 6 and 7, with Billy's messages; README "Billy"; `.env.example`; CHANGELOG bullet under 1.0 Caesious. Commit `209efa9`.

- **The Clients tab: the signed-in trainer's own clients, from Studio** (16 Oct 2026; Glenn: "Well, next, we need to sync clients from Studio to Coach, for the trainer that is logged in on Coach. I'm not sure what we need yet (data wise) but a way to see all your clients and basic information about them to start is good."). Done in the first cloud session, with Studio's repository attached read-only to look at its API; nothing in Studio was changed. **No sync, a live read.** Studio already has `GET /api/clients` (server/index.js, `visibleClients`), scoped to whoever is signed in: a trainer gets their own list (less any they archived who have since moved to another trainer) plus a cut-down copy (`bookingOnly`) of the clients of trainers they book for; staff get their trainers' clients marked `deskOnly`; an admin or master gets everybody they manage. So Coach keeps no copy and nothing can fall out of step: Coach's server gained its own `GET /api/clients` (server/index.js) that asks Studio's `/api/auth/me` and `/api/clients` at once with the same `ts_session` cookie, keeps only clients whose `trainerIds` include this account and that are not `bookingOnly` or `deskOnly` (so a master sees their own list, not the whole business), and maps each to the few fields the screen shows: id, first and last name, email, phone, pronouns, dateOfBirth, `since` (`linkedAt[me]`, the day they joined this trainer's list, falling back to `createdAt`, as Studio's run 6 decided), lastSessionOn, latestSessionOn, `archived` (this trainer is in `archivedBy`) and `sharedWith` (other trainers still active with them). Card, payment method, notes, address, emergency contact, key tag, memberships and message settings never reach the browser. Studio's error answers (a 401 "Not signed in") pass through as they are; an unreachable Studio is the relay's own 502 `studio_unreachable`, now shared with the sign-in relay through a `studio()` fetch helper that both use. Photos were left out: Studio serves them from `/api/photos/client/:id` behind its own sign-in, which would need another relay, so clients show initials. **The tab.** `src/tabs/ClientsTab.jsx`, in place of the Clients tab's Coming soon page: the tab's own heading (CLIENTS, `TabHeading`) and "N active clients" under it, then a card with "Search by name, email or phone" (name, email, or three or more digits of the phone) and Active (n) / Archived (n) tabs, and the list in Studio's order (first name, last name). Each row: initials (grey when archived), name with pronouns in brackets, and "Last session October 14", "First session booked for October 18" (no session yet but one booked; first written as "First session …", which read as past) or "No sessions yet". Tapped, a row opens to Email (mailto), Phone (tel), Birthday with age, Your client since, Last session, Next booked (`latestSessionOn` when it differs from `lastSessionOn`, since Studio's last is up to today and latest is any booked) and, when shared, "Also trains with N other trainer(s)"; one open at a time. Empty, error ("Couldn't reach Trainability. Check your connection and try again." / "Your clients couldn't be loaded. Try again in a minute." with Try again) and no-match states; a footer sends adding or changing a client to Studio. Dates are read as days (`src/clients/format.js`), never shifted by time zone. **Wiring.** `Shell.jsx` holds the list (`src/hooks/useClients.js`) and asks again on every change of tab, keeping the old list on screen meanwhile; a 401 from it calls `useAuth`'s new `signedOut` (passed through `App.jsx`) and returns to sign-in. `sections.js` marks Clients `built`, so Shell shows `ClientsTab` instead of `ComingSoonTab`, and `ComingSoonCard` takes a `badge` that replaces Coming soon on a built part: the Home Clients card says "5 active clients" (its line is now "Everyone you coach, with their contact details and sessions."). **Merged onto a moving main.** The work was first built on the session branch `claude/compassionate-bardeen-0w8ugz` (commits `552b428` and `a9cea4b`, still on GitHub) as a separate `/clients` page with its own header, a "← Home" link and a `usePath` hook for the address. When Glenn said "Push and merge", GitHub's main had seven newer commits (`2513ad2` to `394e1a8`: Studio's header and tab bar, the apps panel, Vite 8 and Tailwind 4), which removed `src/home/HomeScreen.jsx` and `Header.jsx`. Shown to Glenn first, as CLAUDE.md asks; he chose to fit it into the tabs. The server route, `format.js`, `useClients.js` and the `useAuth` change applied cleanly; the screen became a tab (no header, no Home link, no `usePath`, since Shell keeps the tab in sessionStorage so a reload stays on Clients), and the manual chapter was rewritten against the new chapter 3. **Tested** in the cloud against a stand-in for Studio's API (a 40-line Node server on port 4242 in the session's scratchpad, made-up people, never committed), because the session cannot run Studio's fixture: Coach's `/api/clients` refused without a session (Studio's 401), dropped another trainer's client and a `bookingOnly` one, and sent none of the card, notes or address; sign-in still set a host-only cookie; in Chromium, the Home card opening the tab, a reload staying on Clients, search, no-match, the Archived tab, moving to another tab, and an ended session (the cookie removed) returning to the sign-in screen all worked with no console errors, at phone width and 1200px, light and dark. **Not tested:** against Studio's real fixture API, so the true shape of Studio's records and a real trainer's sign-in still want checking on the Mac. `scripts/screenshots.mjs` takes two more pictures after 04-account (05-clients, 06-client-details); 02-home, 03-apps and 04-account were retaken too, because the Home Clients card changed, all in the cloud's Chromium with the stand-in's people, so their font differs from 01-login, taken on the Mac; `npm run screenshots` on the Mac against the fixture would make them match. Manual chapter 4 (Your clients, 4.1–4.6) added, 3.3 and 3.4 changed for a Clients that is built, Words and When something goes wrong renumbered to 5 and 6 and extended; CHANGELOG bullets under 1.0 Caesious (no version change); README section on the clients relay. Commit `4b5c560`.

- **No hover look on the logo: straight to the open panel** (16 Oct 2026; Glenn: "remove the old hover showing the darker logo.. just go straight to the open panel"). The CSS `:hover` and `:focus-visible` rules copied from Studio's `.iw-logo-badge` are gone: the badge opening out, and the swap from the badge mark to the navy app-icon tile (`.cx-logo-rest` / `.cx-logo-open`). With the panel now opening on hover, the badge's own hover look showed for an instant before the panel and read as a second, darker state. Now the badge has two states, at rest or open (`.cx-logo-badge-open`), and open keeps the ordinary mark (cerulean, or white in dark mode) with COACH beside it as the top of the panel. The opening transitions went with the hover rules, so it appears in one step, while the drawer still slides. The app tiles stay in the panel's two rows, where Coach and Studio are shown as the apps they are. A step away from Studio, whose logo still opens out on hover. Manual 3.2 step 1 and the `03-apps` screenshot updated.

- **The apps panel opens on hover** (16 Oct 2026; Glenn: "when we hover over the coach logo, show the panel as if it is clicked instead."). Before, a mouse over the logo only opened the badge out (CSS `:hover`), and the panel needed a click. Now `onPointerEnter` with `pointerType === "mouse"` opens the panel itself. The logo and the drawer each carry the enter and leave handlers, so they are one place to the pointer: leaving either starts a 250 ms close, and entering the other cancels it, so moving from the logo down into the panel, or brushing an edge, never shuts it. A click on a logo the pointer has already opened leaves it open (`byHover`, with `e.detail > 0`), rather than closing what is about to be used. Touch screens never fire a mouse pointer, so a tap still toggles it there, and Enter still toggles it from a keyboard. Escape and a press outside still close it either way. Checked in the browser: on the logo it opens; on the rows it stays open, with the row under the pointer highlighted; away from both, it is gone within the 250 ms. Manual 3.1 and 3.2 now say pointing opens it.

- **The account menu as the only place for you; no Profile tab; Coach's line in the selector** (16 Oct 2026; Glenn: "can you keep that background you had when selecting the profile menu on top? then remove the profile button on the nav bar", then "for the coach description on the app selector, write \"programs, progress, and nutrition\""). "That background" read as the shaded pill the account button showed under the pointer: it now stays (`--ghost-fill`, set inline while `open`) for as long as the menu is open, with the chevron turned up, checked with the pointer moved away. The Profile tab came off the bar, leaving four tabs (Home, Clients, Programs, Messages), and `src/tabs/ProfileTab.jsx` was deleted, with `.cx-row` and Avatar's `ring` going with it. Everything it held was already in the account menu, and a stale `coach-tab` of "profile" in sessionStorage falls back to Home. This is a deliberate step away from Studio, which keeps Profile on its bar. The selector's Coach row reads "Programs, progress, and nutrition" in place of "You're here". The tick and `aria-current` still say it is the app you are in, and an `aria-label` says so in words. That line wrapped at phone width, so the panel went from 20rem to 22.5rem (still capped at the screen less 12px). Manual: 3.3 has four buttons, 3.5 is now "Your account menu" with its own picture (`04-account`, replacing `04-profile`), 2.5 logs out from the menu only, and the word list and CHANGELOG 1.0 are updated.

- **The account menu back beside the badge; Studio's line in the apps panel** (16 Oct 2026; Glenn: "for studio, have the description say \"schedule, sessions, and payments\"", and "I like the way you did with having the profile picture of the logged in user with a chevron pointing down then showing the submenu. Bring that back next to the user level badge."). The apps panel's Studio row now reads "Schedule, sessions, and payments", in Glenn's words and with his comma. The menu from Coach's first header came back as `src/chrome/AccountMenu.jsx`, recovered from git (`src/home/Header.jsx` before `cc8f1e9`) and restyled for the light header. That header was navy, with white text and a `white/10` hover; now it is ink text, a `--ghost-fill` hover and `--badge-open` behind the menu. It sits last in the header's badge row, after the role badge, so it holds the corner. It shows the 32px photo or initials, the name beside them from `sm` up, and a chevron that turns over while open. The menu has the name, email and kind of account ("Primary Master" where it applies, as on the badge and Profile), Open Studio, Log out and the version. Escape closes it with focus back on the button, and a press outside closes it too. The apps panel and this menu each close on a press outside themselves, so opening one closes the other (checked). Profile on the tab bar stays, holding the same things, as Glenn asked for this as well as Profile, not instead of it. The manual now has the menu in 3.1 and both ways to log out in 2.5, the word list and CHANGELOG 1.0 are updated, and the screenshots were retaken.

- **Studio's header and tab bar, and the logo as the app switcher** (16 Oct 2026; Glenn: "some housekeeping lets copy the header bar and the nav bar from Studio, including the way the logo is shown. When you click on the logo now, the panel that folds out shoudl show Coach and Studio, this is a quick way to switch between apps if you have trainer account on Studio."). Copied from Studio's current code (src/chrome/Header.jsx, BottomNav.jsx, useFloatingBar.js and the theme.jsx rules behind them), not from its older screenshots, which still show a hexagon-ended bar: it has since become a pill with a lit circle. **Header** (`src/chrome/Header.jsx`): sticky, on the page's own background with a hairline under it, everything one 36px badge tall. The logo is `.cx-logo-badge`, anchored in the corner as Studio's `.iw-logo-badge` is, with two marks in one slot: the logo kit's badge at rest (cerulean on light, white on dark, through `<picture>`), and the app icon opened out, with COACH sliding out beside it. COACH is the lockup's own outline, cut out into `src/chrome/CoachWordmark.jsx` in `currentColor` (`--wordmark`: cerulean, sky in dark), as Studio sets STUDIO 3 with StudioLockupArt. It opens out under a pointer that can hover (`@media (hover: hover)`, so a tap on a phone does not leave it stuck open), on keyboard focus, and while its panel is open. **The switcher** is new rather than copied: clicking the logo folds down `.cx-apppanel`, built the way Studio's picker panel and Billy's join their buttons, with one fill and one outline, the badge squared off underneath (`.cx-logo-badge-open`). It slides on `max-height` with Studio's 220 ms put-on-the-page-a-frame-early trick, and closes on Escape (focus back to the logo), a press outside, or picking Coach. Rows: Coach ("You're here", a tick, `aria-current`) and Studio ("Schedule, clients and payments", a link to `STUDIO_URL`, with Studio's own `icon-192.png` copied in as `src/assets/studio-app-icon.png`). Always both, since every Coach account is a Studio account. The right of the header has Studio's role badges: a shield opening out to Admin, Master or Primary Master (gold, with Studio's sparkles), and none for a trainer. **Tab bar** (`src/chrome/BottomNav.jsx`): fixed at the bottom, a frosted pill (chalk at 72% with an 18px blur, at most 28rem wide) with a softening blur above it, icons only (names as `aria-label` and tooltip), and the lit tab a cerulean-to-sky circle (`.cx-nav-lit`) measured from the tab's box and slid with Studio's easing. Profile wears the photo or initials. Studio's drag-the-pill, groups and landscape rail are left out: five tabs need none of them. Tabs: Home, Clients, Programs, Messages, Profile (`src/Shell.jsx`; the tab is remembered in sessionStorage for the browser tab). The account dropdown went: as in Studio, who you are, Open Studio, Log out and the version are on **Profile** (`src/tabs/ProfileTab.jsx`). Clients, Programs and Messages open Coming soon pages, and their Home cards open those tabs too. `src/home/` became `src/tabs/` and `src/chrome/`. Checked in the browser at phone width in light and dark, and measured at 1280 wide (bar centred, 448 px): the panel opens, Escape closes it with focus back on the logo, and the tabs switch. Profile said "Master" where the header said "Primary Master", so it was made to match. Manual chapter 3 rewritten as "Finding your way around" (the top bar, switching apps, the bottom bar, Home, Profile, light or dark), sign-out in 2.5 now goes through Profile, and `npm run screenshots` takes two more pictures (`03-apps`, `04-profile`). CHANGELOG 1.0 updated.

- **Vite 8 and Tailwind 4; npm audit to zero** (16 Oct 2026; was in Ideas, from the first cloud session's 9 advisories; Glenn: "let's upgrade Vite 8 and Tailwind then"). Coach only: Studio is on the same versions and still carries the warnings. Tailwind first, with its own `@tailwindcss/upgrade@4.3.3` on a clean tree: it renamed `min-h-[100dvh]` to `min-h-dvh`, `max-w-[12rem]` to `max-w-48` and `hover:bg-[var(--ghost-fill)]` to `hover:bg-(--ghost-fill)`, deleted `tailwind.config.js` (v4 is configured in CSS), and turned the `cx-` classes into `@utility` blocks. It also stripped every comment from `src/index.css` and reformatted it, so that file was rewritten by hand in v4 form with its comments kept. Two Tailwind 3 defaults that v4 drops were put back in `@layer base`: a border with no color of its own is `--iron-line` (v4 makes it the text color), and buttons show the pointing hand (v4 leaves the arrow). Then Vite 5.4 → 8.3.4 and `@vitejs/plugin-react` 4 → 6.1.2, with Tailwind through `@tailwindcss/vite` instead of PostCSS, so `postcss.config.js`, `postcss` and `autoprefixer` went (Tailwind 4 adds browser prefixes itself). Vite 8 needs Node 22.12 or newer, so `engines` went from `>=22.5` to `>=22.12`, and `/api/health` now reports `node` so the version Airo runs can be checked after the deploy (a deploy builds on the host, and an older Node there would fail the build). `npm audit`: 9 → 0. Checked: the build passes; the manual's two screenshots retaken on the new build and put beside the old ones, which look identical; the Vite 8 dev server serves the app, and in dark mode at phone width the home screen, the account menu, the pointer on every button and the divider's soft line were all correct.

- **The first cloud session: install, build and check-docs pass** (16 Oct 2026; Glenn: "Start a cloud test session that clones the repo, installs, builds and runs check-docs, without changing anything", after "push"). The first push for it never reached GitHub: Glenn ran it, but `git ls-remote` still showed `216cbcd`, three commits behind, so the session was held back rather than started on a copy without CLAUDE.md. That led to the standing rule that "push" means Claude pushes and confirms (`push-on-command`, and CLAUDE.md). Pushed `216cbcd..d0cb0d9`, confirmed, then the cloud session ran on the Default environment. It cloned the private repo at `d0cb0d9` (so Claude's GitHub app can reach it) and read CLAUDE.md. Node v22.22.0, npm 10.9.4. `npm ci`, `npm run build` (Vite 5.4.21, 1,583 modules, 164 kB JS) and `npm run check-docs` all passed. `node server/index.js` on 4800 answered `/api/health` with `"version":"1.0.0","codename":"Caesious"`, and `/` with 200. With no `STUDIO_ORIGIN` in the environment, it fell back to `http://localhost:4242`, with nothing there, so nothing reached a live site. Nothing changed, and git status stayed clean. Not testable in the cloud: sign-in end to end (no Studio fixture), anything behind a sign-in, and the screens in a browser. `npm ci` reported 9 advisories (6 high, 3 moderate), all in build and dev-server tooling; they are in Ideas.

- **CLAUDE.md, so cloud sessions work the same way** (16 Oct 2026; Glenn: "can we create an environment for this project to cloud as well? how would we do that?", then "yes write it"). The account already has one cloud environment, Default, and environments are not tied to a repository, so Coach can run in the cloud as it is. What a cloud session would lack is the method: Claude's memories for Coach (the brainstorm queue, NEURALBRAIN as memory, the one manual, codenames) live on Glenn's Mac, not in the repo, and memsearch is local too. `CLAUDE.md` puts those rules in the repository, where every session reads them: what Coach is and that it keeps no accounts; BRAINSTORM's Next up as the only queue; NEURALBRAIN searched before asking and written to straight away, in full; the manual's rules and its three npm commands; asking Glenn for a minor version's name; never testing against the live Studio. It also says what a cloud session cannot do: it has only this repository, so no Studio fixture and no end-to-end sign-in, and no `server/.env`. Studio has no CLAUDE.md, because its sessions have all been local. For the cloud itself, Glenn's to do: give Claude's GitHub app access to `glennpineda/trainability-coach` if it is limited to selected repositories, and optionally a Coach environment on claude.ai/code (setup script `npm install`, `STUDIO_ORIGIN=http://localhost:4700`).

- **1.0 is "Caesious"** (16 Oct 2026; Glenn: "The codename for this version 1.0 is \"Caesious\""). Carried the way Studio carries "Heliotrope": `package.json` has `"version": "1.0.0"` (it was 0.1.0) and `"codename": "Caesious"`; `vite.config.js` bakes both into the bundle through a `virtual:app-version` module, as Studio's does, and `src/version.js` makes `VERSION_LABEL` ("1.0.0 · Caesious"). It shows under the logo on the sign-in screen, as Studio's "Version 3.1.1437 · Heliotrope" does, and at the foot of the account menu; `/api/health` now returns `version` and `codename` from the same package.json, so the page and its host cannot disagree. A `CHANGELOG.md` in Studio's format opens with "## 1.0 Caesious". The manual says where the version is (2.1, 3.2, and Words). Studio's rule came with it: every minor version gets a name Glenn chooses, asked for before the bump and never invented; build numbers get none. Screenshots retaken, since the sign-in picture now has the version on it.

- **TRUST_PROXY on Airo, and the first real sign-in** (16 Oct 2026; the two Next up items left from going live; Glenn: "Both done: TRUST_PROXY=1 is set on Airo and I signed in to trainabilitycoach.com with my real account; it landed on the home screen with my name."). Both were Glenn's: the setting lives in Airo's dashboard, and a real sign-in needs a real password. `TRUST_PROXY=1` makes Coach's server take the visitor's address from the one proxy GoDaddy puts in front of it (`app.set("trust proxy", 1)` in server/index.js), which is what it now sends Studio as `X-Forwarded-For`. It does not yet change what Studio counts for its per-IP sign-in limit: Studio still sees Coach's server as the caller, which is the open item in Questions. The sign-in is the first end-to-end proof on the live site with a real account: Coach's page, the relay, Studio's live API and MySQL database, Studio's session cookie kept on trainabilitycoach.com, and `/auth/me` returning the right person for the home screen's greeting. Everything before this had been checked against Studio's fixture database locally, or from outside with nobody signed in.

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
signing in, finding your way around, your list of clients, and Billy. Each new part
of the app gets its own chapter here as it arrives.

---

#### Contents

1. [Before you start](#1-before-you-start)
2. [Signing in](#2-signing-in)
   - [2.1 Signing in](#21-signing-in)
   - [2.2 Staying signed in](#22-staying-signed-in)
   - [2.3 If you have forgotten your password](#23-if-you-have-forgotten-your-password)
   - [2.4 Signed in with a temporary password](#24-signed-in-with-a-temporary-password)
   - [2.5 Signing out](#25-signing-out)
3. [Finding your way around](#3-finding-your-way-around)
   - [3.1 The bar at the top](#31-the-bar-at-the-top)
   - [3.2 Switching between Coach and Studio](#32-switching-between-coach-and-studio)
   - [3.3 The bar at the bottom](#33-the-bar-at-the-bottom)
   - [3.4 The home screen](#34-the-home-screen)
   - [3.5 Your account menu](#35-your-account-menu)
   - [3.6 Light or dark](#36-light-or-dark)
   - [3.7 My equipment](#37-my-equipment)
4. [Your clients](#4-your-clients)
   - [4.1 Opening your clients](#41-opening-your-clients)
   - [4.2 Reading the list](#42-reading-the-list)
   - [4.3 Seeing a client's details](#43-seeing-a-clients-details)
   - [4.4 Finding a client](#44-finding-a-client)
   - [4.5 Archived clients](#45-archived-clients)
   - [4.6 Adding or changing a client](#46-adding-or-changing-a-client)
5. [Asking Billy](#5-asking-billy)
   - [5.1 Opening Billy](#51-opening-billy)
   - [5.2 Asking a question](#52-asking-a-question)
   - [5.3 Giving Billy a photo or a PDF](#53-giving-billy-a-photo-or-a-pdf)
   - [5.4 Starting again](#54-starting-again)
   - [5.5 What Billy can't do](#55-what-billy-cant-do)
6. [Words this app uses](#6-words-this-app-uses)
7. [When something goes wrong](#7-when-something-goes-wrong)

<div style="page-break-after: always;"></div>

---

### 1. Before you start

#### What this app is for

Trainability Coach is the coaching app in the Trainability family, alongside
**Trainability Studio**, the app the business runs its schedule and billing
in. Coach is where your coaching will live: your day, your clients, the
programs you build for them, and your messages with them. Your list of
clients is here already (chapter 4); the other parts are still being built —
the app shows them as **Coming soon** (3.3).

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
   **COACH** underneath. Under the logo is the version the app is on — for
   example *Version 1.0.1 · Caesious* — and then *Use the same email and
   password as Trainability Studio.*
3. Tap the **Email** box and type your email address. With a
   @trainabilitystudio.com address you can type just the part before the @ —
   the app adds the rest when you log in.
4. Tap the **Password** box and type your password.
5. If this is your own phone or computer, tick **Keep me logged in**. Leave it
   unticked on a shared machine — see 2.2.
6. Tap the blue **Log in** button. It says **Signing in…** for a moment while
   the app checks.

You are now signed in, and you land on the home screen (3.4).

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

1. Tap your photo or initials in the top right corner.
2. Tap **Log out**.

You are back on the sign-in screen. Signing out of Coach does not sign you out
of Studio.

<div style="page-break-after: always;"></div>

---

### 3. Finding your way around

#### 3.1 The bar at the top

![The home screen, with the bar at the top and the bar at the bottom](docs/images/02-home.png)

*The home screen, with the bar at the top and the bar at the bottom*

Across the top of every screen:

- **On the left**, the Coach logo — a hexagon with a **C** in it — and the word
  **COACH** beside it. Tapping the logo, or pointing at it on a computer, opens the apps panel (3.2).
- **On the right**, an Admin or Master account has a small shield, gold for a
  Master. On a computer, point at it and it says which: **Admin**, **Master**
  or **Primary Master**. A trainer's account has no shield.
- **Billy's face**, in a lilac square, when Billy is set up for your
  business — tap it to ask him something (chapter 5).
- **In the corner**, your photo (or your initials) with a small arrow
  pointing down — your account menu (3.5). On a wider screen your name is
  beside it.

The bar stays at the top as you scroll.

#### 3.2 Switching between Coach and Studio

![The apps panel, open from the logo](docs/images/03-apps.png)

*The apps panel, open from the logo*

Coach and Studio are two apps with one account, and the logo is the quick way
between them.

1. Tap the Coach logo in the top left corner — or, on a computer, just point
   at it with the mouse. A panel folds down from the logo with the heading
   **TRAINABILITY APPS**.
2. The panel lists both apps:
   - **Coach** — *Programs, progress, and nutrition*. The tick beside it
     means it is the app you are in.
   - **Studio** — *Schedule, sessions, and payments*.
3. Tap **Studio** to go to Studio. If you are not signed in there, sign in with
   the same email and password.

To close the panel without going anywhere, tap the logo again, tap anywhere
else on the screen, or press Esc on a keyboard. On a computer it also folds
back up by itself when you move the mouse away from the logo and the panel.

#### 3.3 The bar at the bottom

The rounded bar floating at the bottom of the screen moves you between the
parts of Coach. It has four buttons, as pictures with no words:

| Button | Picture | Goes to |
|---|---|---|
| **Home** | A house | The home screen (3.4). |
| **Clients** | Two people | Your clients (chapter 4). |
| **Programs** | A clipboard with a list | Programs — coming soon. |
| **Messages** | A speech bubble | Messages — coming soon. |

The one you are on sits in a filled blue circle, which slides across when you
tap another. On a computer, pointing at a button shows its name.

**Programs** and **Messages** are not built yet. Each opens a page
with its name at the top, a card saying what it will be for, and *This part of
Coach is being built. It will appear here when it's ready.*

#### 3.4 The home screen

Coach opens on Home. From the top:

- **The blue band.** Today's date, and a greeting with your first name:
  **Good morning** until noon, **Good afternoon** until 5 PM, and
  **Good evening** after that.
- **Four cards**, one for each part of Coach:

| Card | What it is for |
|---|---|
| **Today** | Your sessions for the day, at a glance. |
| **Clients** | Everyone you coach, with their contact details and sessions. |
| **Programs** | Workouts and plans you build and assign. |
| **Messages** | Check-ins and notes between you and your clients. |

**Clients** is ready: next to its name it says how many clients you have,
such as **5 active clients**. The other three are marked **Coming soon**.
Tapping **Clients**, **Programs** or **Messages** opens its page, the same as
its button on the bottom bar; **Today** will live on Home itself.

If you are signed in with a temporary password, a box at the top of Home says
so — see 2.4.

#### 3.5 Your account menu

![Your account menu, open](docs/images/04-account.png)

*Your account menu, open*

1. Tap your photo or initials in the top right corner. The button stays
   shaded, and its arrow turns to point up, while the menu is open.
2. The menu shows:
   - **Your name**, your email address, and what kind of account you have:
     **Trainer**, **Admin**, **Master**, **Primary Master** or **Front desk** —
     the same as in Studio.
   - **My equipment** — what you have to train with (3.7).
   - **Open Studio** — goes to Studio, at trainabilitystudio.com.
   - **Log out** — signs you out (2.5).
   - **The last line** is the version the app is on, such as
     *Version 1.0.1 · Caesious*. If you ever report a problem, say which
     version it was.

To close it without choosing anything, tap the photo again, tap anywhere else,
or press Esc on a keyboard.

#### 3.6 Light or dark

Coach follows your phone or computer. If your device is set to dark mode,
Coach is dark too — a navy background with white and light blue words —
and light otherwise. There is nothing to set in the app.

#### 3.7 My equipment

Coach keeps a list of the equipment you have, so Billy suggests exercises you
can actually do. It is yours alone: nobody else sees it.

1. Tap your photo or initials in the top right corner, then **My equipment**.
2. Under **The basics**, answer each line — **Dumbbells**, **Barbells and a
   rack**, **Kettlebells**, **Weight machines** and so on — by tapping **Yes**
   or **No**. Your answer is saved as you tap. To take an answer back, tap it
   again.
3. Under **Particular pieces** are machines and other pieces a program has
   asked about, such as a low row machine. Each says what kind it is, and where
   it is if you said. Tap **Yes** or **No** to change whether you have it, or
   the bin to remove it.
4. To add a piece yourself, fill in **Add a piece** at the bottom: its name,
   **What kind is it?**, where it is if you like, and **Do you have it?** Then
   tap **Add**.

A piece Billy wrote down from something you told him says **Noted by Billy**.
Change or remove it here like any other.

<div style="page-break-after: always;"></div>

---

### 4. Your clients

Coach shows the clients on your own list in Studio — the same people you see
under your name there. It reads them from Studio every time, so anything
changed in Studio shows in Coach the next time you open the list. Coach keeps
no copy of its own.

#### 4.1 Opening your clients

1. Tap **Clients** on the bar at the bottom (the two people), or the
   **Clients** card on the home screen.
2. The **CLIENTS** page opens. Under its name it says how many active clients
   you have.

To leave it, tap another button on the bottom bar.

#### 4.2 Reading the list

![Your clients](docs/images/05-clients.png)

*Your clients*

Each client has one line, in order of first name:

- **A circle with their initials.**
- **Their name.** If they have told Studio their pronouns, those are next to
  the name in brackets, such as *(they/them)*.
- **One line about their sessions:**

| It says | What it means |
|---|---|
| **Last session October 14** | The last session they had, with you or another trainer. |
| **First session booked for October 18** | They have not had a session yet, but one is booked. |
| **No sessions yet** | Nothing has happened and nothing is booked. |

If you have no clients yet, the list says *You have no clients yet. Clients
you add in Studio show here.*

#### 4.3 Seeing a client's details

![A client's details](docs/images/06-client-details.png)

*A client's details, opened*

1. Tap the client's line. It opens underneath to show:

| Detail | What it shows |
|---|---|
| **Email** | Their email address. Tap it to write to them. |
| **Phone** | Their phone number. Tap it to call them from a phone. |
| **Birthday** | The day, and how old they are now, such as *March 12 (age 36)*. |
| **Your client since** | The day they joined your list. |
| **Last session** | The last session they had. |
| **Next booked** | The next session booked for them. |
| **Shared** | Only for a client who also trains with somebody else: *Also trains with 1 other trainer*. |

   Anything Studio does not have says **Not given**, **Not known**,
   **None yet** or **Nothing booked**.
2. Tap the line again to close it. Opening another client closes the first.

#### 4.4 Finding a client

1. Tap the box that says **Search by name, email or phone**.
2. Type part of their name, their email, or at least three digits of their
   phone number. The list shrinks to the people who match as you type.
3. To see everybody again, empty the box.

If nobody matches, the list says *No one matches* and what you typed.

#### 4.5 Archived clients

Clients you have archived in Studio — people you no longer train — are kept
apart from the rest.

1. Tap **Archived** next to the search box. The number in brackets is how
   many there are.
2. The list now shows only your archived clients, with grey circles. Tapping
   one shows the same details as in 4.3.
3. Tap **Active** to go back to the people you are training.

#### 4.6 Adding or changing a client

Clients are added, changed and archived in **Studio**, not in Coach. At the
foot of the Clients page it says *Your clients are kept in Studio. To add a
client or change their details, open Studio.*

1. Tap **open Studio**. Studio opens.
2. Make the change there.
3. Come back to Coach and open **Clients** again. The change is there.

<div style="page-break-after: always;"></div>

---

### 5. Asking Billy

Billy is the assistant you may know from Studio. In Coach he can tell you
about the clients on your list, and he can read a photo or a PDF you give him
— a client's food log, a form they filled in, a program — and answer
questions about it.

If you do not see his face in the bar at the top, Billy has not been set up
for your business yet.

#### 5.1 Opening Billy

1. Tap **Billy's face** in the bar at the top, next to your photo.
2. His panel opens under the bar, with a box at the bottom that says
   **Ask Billy…**

To close the panel, tap the arrow where his face was, or press Esc on a
keyboard. Closing it keeps the conversation: open it again and it is all
still there. While it is closed, a small blue dot on his face means he has
answered and the answer is waiting.

#### 5.2 Asking a question

1. Tap the **Ask Billy…** box and type your question, such as *When did
   Avery last train?* or *Which of my clients have nothing booked?*
2. Tap the blue arrow button, or press Enter on a keyboard.
3. While he works it out, the panel says **Billy is looking…** His answer
   then appears under your question.

You can carry on asking: he remembers what was said earlier in the same
conversation, so *What about Jordan?* works after a question about Avery.

#### 5.3 Giving Billy a photo or a PDF

1. Tap the **paper clip** to the left of the **Ask Billy…** box.
2. Choose a photo or a PDF. On a phone you can take a photo there and then.
3. It appears above the box with its name. To take it off again, tap the
   **×** beside it.
4. Type what you want to know about it, such as *How much protein is in this
   day?*, and tap the blue arrow. If you type nothing, Billy is asked to have a
   look at it.

Billy reads JPEG, PNG, GIF and WebP photos, and PDFs up to 15 MB. A large
photo is made smaller before it is sent, which does not stop him reading it.

#### 5.4 Starting again

Tap the **round arrow** at the top right of the panel (**New conversation**).
The conversation is cleared and Billy starts fresh. Leaving or reloading the
page clears it too: Coach does not keep your conversations with Billy.

#### 5.5 What Billy can't do

- **He changes nothing, apart from noting your equipment.** When you tell him
  what you have — "there's no low row machine" — he writes it down on your
  equipment list (3.7), marked **Noted by Billy**. Otherwise he cannot add or
  change a client, book or cancel a session, send a message or charge anybody.
  Clients are added and changed in Studio (4.6).
- **He only knows your own clients**, the same people as on your Clients page.
- **He is not a doctor or a dietitian.** About pain, an injury or illness, he
  will say a professional should see it.
- He can get things wrong, like any assistant. Check anything important.

<div style="page-break-after: always;"></div>

---

### 6. Words this app uses

| Word | What it means |
|---|---|
| **Coach** | This app, Trainability Coach, at trainabilitycoach.com. |
| **Studio** | Trainability Studio, the business's scheduling and billing app, at trainabilitystudio.com. Your account lives there. |
| **Temporary password** | A password emailed to you when yours is reset or forgotten. Use it once, then choose your own in Studio (2.4). |
| **Keep me logged in** | The tick box that keeps you signed in for up to 30 days on this device (2.2). |
| **Coming soon** | A part of Coach that is planned but not built yet. |
| **Active client** | A client on your list who you are still training. |
| **Billy** | The assistant in Coach and in Studio. In Coach he knows your clients and reads photos and PDFs (chapter 5). |
| **Archived client** | A client you have archived in Studio because you no longer train them. They are under **Archived** on the Clients page (4.5). |
| **Apps panel** | The panel that folds down from the Coach logo, for switching between Coach and Studio (3.2). |
| **Account menu** | The menu under your photo in the top right corner: who is signed in, Open Studio, Log out and the version (3.5). |
| **Version** | Which release of Coach you are using: a number such as 1.0.1, and the release's name, such as Caesious. Shown on the sign-in screen and at the foot of your account menu. |

<div style="page-break-after: always;"></div>

---

### 7. When something goes wrong

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
The sign-in, or your list of clients, did not get through. Check that your
phone or computer is connected to the internet, then tap **Log in** again —
or, on the Clients page, **Try again**.

**"Your clients couldn't be loaded. Try again in a minute."**
Studio answered, but not with your list. Wait a minute and tap **Try again**.
If it keeps happening, tell whoever looks after the app.

**A client is missing from your list.**
Coach shows the clients on your own list in Studio. Check that they are under
your name in Studio, and not archived — an archived client is under
**Archived** (4.5).

**"Billy reads JPEG, PNG, GIF and WebP photos. On an iPhone, a photo shared from Photos is sent as a JPEG."**
The photo is in a format Billy cannot read, such as an iPhone's HEIC. Choose
it again from Photos, or take a screenshot of it and send that.

**"That PDF is too big for Billy. Try one under 15 MB."**
Send fewer pages: save just the pages you need as a new PDF, or take photos
of them instead.

**"Billy couldn't answer just now. Try again in a minute."**
Your question is still in the box. Wait a minute and tap the blue arrow again.

**"Billy isn't working right now: this server's key for him was refused. Tell whoever runs the app."**
Billy's setup on the server needs fixing. It is not something you did; pass
the message on.

**You are back on the sign-in screen.**
Your sign-in ran out while the app was open. Sign in again (2.1).

**The temporary password email never came.**
Look in the junk or spam folder first. Each request replaces the last password
sent, so use only the newest email. If nothing arrives after a few minutes,
make sure the address is the one you use for Studio.
