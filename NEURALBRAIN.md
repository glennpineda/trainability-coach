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

- **Where files are saved, and an Installation page** (17 Oct 2026; Glenn: "Before we continue, the directory where we can save files on the host is /private please see how studio is doing it. And have an installation settings for it."). Build 1.0.10. Not from Next up: asked directly. **How Studio does it**, read from `trainability-studio`'s `server/durable-home.js`, its `/api/storage` routes, `StorageDialog.jsx` and its manual: the host (GoDaddy) runs the app from `/app`, rebuilt on every deploy, and keeps only Private Storage, `/private` (Studio lost four nights of backups written under the home folder, `/local`, to a deploy). Where the app runs from `/app` and `/private` is writable, `/private` is the home; anywhere else the home folder, since a Mac has a `/private` too. The Primary Master can name another folder (Settings → Installation → Where files are saved), stored in `settings` as `storage_folder`, re-read at most once a minute, tried (make, write, remove a file) before it is accepted, refused inside the app's folder; `BACKUP_DIR` and `MEDIA_DIR` on the host win. **Coach's copy** follows it closely: `server/durable-home.js` (the same `automaticHome`, `checkFolder`, `refreshStorage`, `chooseStorage`, `storageState`, and the stored value "automatic" for going back, so a lost row isn't read as a decision and a known folder is written back). Differences: Coach's files go in a `trainability-coach` folder inside the home (`filesDir()`, `filePath(name)`), so a home shared with another app never mixes them; one host override, `COACH_FILES_DIR`, which names Coach's files folder itself and wins over everything; a change is logged to the console, since Coach has no event log like Studio's `recordEvent`. Nothing is saved there yet: reading a book in the app and scanned programs will be the first. **Settings**: Coach had no settings table; `coach_settings` (name as the primary key, value, updated_at) in `server/db.js` and `server/settings.js` (`getSetting`, `setSetting`, read then insert or update), keyed by name like Studio's, so no id tag was needed. **Routes**: `GET /api/storage` (forces a re-read) and `PUT /api/storage` (`{folder}`; empty goes back to automatic), both behind `asPrimary` (404 to anyone else); `refreshStorage` also runs on start after `reviews.load()`. **The page**: `src/tabs/InstallationTab.jsx`, **Installation** in the account menu for the Primary Master only (and `Shell.jsx` checks too), with one card, Where files are saved: Saved in now (the files folder and why: named, chosen by the app, or the host's setting), a warning when a named folder can no longer be written to, Folder on the server, Save folder and Let the app choose; with `COACH_FILES_DIR` set, it says the host decides and offers nothing to change. Words follow Studio's dialog. Docs: manual 3.10 and the account menu list, README (Where files are saved, under Deploying), `.env.example` (`COACH_FILES_DIR`), CHANGELOG. Tested on scratch SQLite with the mock Studio: a trainer gets 404; refusals for a relative path, the top of the disk, the app's own `dist`, a path that can't be made (`/dev/null/x`, ENOTDIR) and a non-string; naming a scratch folder (the probe file made and removed, the setting stored), going back to automatic and naming it again; `automaticHome` gives `/private` for `/app` with `/private` writable, the home folder when it isn't, and the home folder off the host even with `/private` writable; `COACH_FILES_DIR` wins. A probe of `/proc/nope` hung in this container (its `/proc` quirk; Studio's code does the same), so that case was dropped from the run. The page was clicked through in Chromium at phone width with no errors. Untested: the real `/private` on GoDaddy.

- **Coach IQ ideas audit, batch F: the review page** (17 Oct 2026; Glenn: "Let's just go with conditions table you have for now and continue brainstorm"). Idea 24, build 1.0.9, the last of the audit's 25, so Next up is empty; the batch heading and its "Record ids" note left BRAINSTORM with it (the tags live in `server/ids.js`, the one list). Before building, two questions to Glenn: the id tag for a review mark (he chose **iqr** from rvw, iqr and apr, all checked against Studio's 25 tags first), and where approvals end up, since the library is a file in the code and the live app can't change code. He chose **"App now, file later"**: a mark counts in the app at once, and a download is written into the files and committed later. **Records**: `coach_iq_reviews` in `server/db.js` (iqr… id, kind "exercise" or "condition", target an exr… id or a condition key, mark "approve", "flag" or "clear" for taken back, comment, reviewer id and name, created_at). Every mark is a new row; the latest per target counts, so the table is its own history. Family-level marks were left out: a family has no status of its own, and approving each version is the review. **`server/reviews.js`**: the latest marks held in memory, read once on start (`load()`, after `migrate` and `adoptOldAnswers` in `server/index.js`) and updated as marks are made, so asking whether something is a draft costs nothing; `markOf`, `statusOf(kind, target, fileStatus)` (approve makes it "reviewed"; a flag puts a file-reviewed one back to "draft"; otherwise the file's status), `setMark`, `exportMarks`. `library.brief` (what Billy and search see) and `limitations.conditionsList` and `meaningOf` now use `statusOf`, so an approval stops Billy calling it a draft at once. **Cards**: `library.reviewSummary()` (every family with versions, approved and flagged counts, and the totals; retired versions left out) and `library.reviewFamily(id)` (each version with everything there is to pass: names, level, muscles, needs, counting, facts in words, joints, easier steps worked out from others' harder links, harder steps, origin, status, mark); `limitations.conditionsForReview()` and `isCondition`. **Routes**, all behind `asPrimary` (signed in, `isPrimary` and role master, as Studio's `isPrimaryMaster`; anyone else gets a 404, so the page's existence isn't advertised): `GET /api/coach-iq/review` (summary, condition counts, trainers' suggestions), `GET /api/coach-iq/review/families/:id`, `GET /api/coach-iq/review/conditions`, `PUT /api/coach-iq/review/:kind/:target` (a flag must carry a comment: "Say what's wrong, so it can be fixed."), and `GET /api/coach-iq/review/export` (a dated JSON download). Suggestions needed the suggester's name, which batch E didn't keep: `coach_private_exercises` gained `suggested_by_name`, put in the CREATE itself since build 1.0.8 was never pushed or run anywhere but scratch databases, and `suggestPrivate` now takes the trainer. **Writing marks into the files**: `npm run iq -- --apply <file>` in `scripts/iq.mjs`. An approval sets `status: "reviewed"` and `reviewed` to the day it was approved; a flag puts a reviewed one back to draft; flags and comments are printed as a list to act on before committing; then the pages are regenerated as usual. `exercises.json` is rewritten whole (it is exactly `JSON.stringify(…, null, 1)`), but `conditions.json` is laid out by hand, so only each condition's status line is replaced in the text. **The page**: `src/tabs/ReviewTab.jsx`, **Review Coach IQ** in the account menu, shown only to the Primary Master (`Shell.jsx` checks too, and the server again): two progress bars, Download reviews, then Exercises (a family list with each family's count, Start with the first not done, Next family to the next with anything left, cards with Approve and Flag and a comment box, then Approved or Flagged with the day and Take back), Conditions (the same), Suggestions (who, when, why; added by Claude in a session) and Books (the placeholder for reading a book in the app). The family line drops a purpose that repeats the pattern ("mobility · mobility" in the first screenshot). Manual: new 3.9, the account menu list, and Coach IQ in Words. Tested on scratch SQLite with the mock Studio, its master made Primary: a trainer gets 404 on every review route and no menu item; marks, the flag without a comment refused, unknown targets and marks refused, an approved exercise losing its draft flag in search, an approved condition reviewed in the conditions list, the counts, the export, marks still there after a restart, and `--apply` on a copy (2 changes, the flag and comment listed, `check-iq` consistent; the files then restored). The page was clicked through in Chromium at phone width with no console errors. Untested: MariaDB, and Studio's real `isPrimary` on a signed-in session.

- **Coach IQ ideas audit, batch E: trainers' own names and Billy's library tools** (17 Oct 2026; Glenn: "Let's just go with conditions table you have for now and continue brainstorm"). Ideas 3 and 4, build 1.0.8. **First, the conditions table**: Glenn accepted batch D's drafted `coach-iq/conditions.json` as it is for now, rather than going through it row by row. Recorded in `coach-iq/README.md` (Conditions and what to avoid); the rows keep `status: "draft"` and `reviewed: null`, since that is not a formal review, so Billy still says a condition is a draft if asked, and the review page (idea 24) can still pass them. **3, own names and private exercises**: two tables in `server/db.js`. `coach_own_names` (exx… id, trainer_id, name, name_key by `nameKey`, exercise_id, source "trainer" or "billy", created_at; UNIQUE on trainer and name_key, so the same name said twice is one row, retied): exercise_id is a library version, one of the trainer's private exercises, or '' for a name still to sort out. No tag was needed for "unmatched": an unmatched name is an own name not tied yet, so it shares exx, which kept to the rule of never inventing a tag. `coach_private_exercises` (exr… id, the library's tag, as Glenn said: "a trainer's private exercise shares it", so a suggested one can join the library unchanged; name, family_id optional, needs as checklist kinds, primary_muscles, note, suggested_at, suggest_note, archived, created_at). Private exercises are archived, never deleted (a program may name one); archiving unties any names, which go back to "to sort out". Suggesting sets suggested_at and an optional note; "Take back" clears them; `library.suggestions()` lists every trainer's for the review page to come. Scans are not built yet, so names to sort out arrive today from Billy (a name the trainer tells him with no exercise) or the API; the scan will add to the same list. **4, Billy's library tools** in a new `server/library.js`, which loads `coach-iq/exercises.json` once: `searchLibrary` matches the master name, common name, aliases and former names, exact first and then names holding every word asked for; it compares a little looser than `nameKey` (every word's last s dropped) because `nameKey` leaves three-letter words alone, so "chin ups" found nothing until then. `findExercise` puts the trainer's own name first (their word wins), then their private exercises, then the library, and says when a name is still to sort out. `alternativesFor(exercise, {place, level, rules})` drops retired versions, anything above the level, anything with a fact or joint to avoid (`limitations.rulesOf`, split out of `meaningOf` so both share it and filtering uses the library's own keys rather than words), and anything the place can't do. A place's kinds are its yes answers plus `IMPLIES`; a kind not answered, or a piece (`x.piece`) not answered, does not drop the version but returns it with `askFirst` (the questions), and a piece answered no drops it; a yes to a particular piece does not count as a yes to its whole kind. What is left to modify for the client comes back in words as `modifyFor`. The family first; when fewer than three in it fit without a question, it widens to families of the same pattern sharing a main muscle, those with more of the same purposes first, up to ten. `leftOut` counts what failed each check, so Billy can say why nothing came back. Billy (`server/billy.js`) gained `find_exercise`, `find_alternatives` (exercise id; place, or anyEquipment; client by name or id; level) and `remember_exercise_name` (name, optional exercise id, confirmed), and prompt lines: look up any exercise named before saying anything, call it by the trainer's name, suggest only from what comes back, ask about unanswered equipment first, say why when nothing comes back. `remember_exercise_name` follows `remember_equipment`'s rules: refused from a message carrying a photo or PDF (idea 23), and a name the trainer tied themselves to another exercise is retied only with `confirmed: true` (idea 20). In `server/index.js` the client and place lookups became shared helpers (`clientNamed`, `placeNamed`), and new routes: `GET /api/coach-iq/exercises?q=`, `GET /api/my-exercises`, `POST /api/my-exercises/names`, `PATCH` and `DELETE /api/my-exercises/names/:id`, `POST /api/my-exercises/own` (with `fromName`, which ties the name to the new exercise), `PATCH` and `DELETE /api/my-exercises/own/:id`, and `PUT` and `DELETE /api/my-exercises/own/:id/suggestion`. Everything is the signed-in trainer's own; another trainer gets a 404. **The page**: `src/tabs/ExercisesTab.jsx`, **My exercises** in the account menu (a `PAGES` entry in `Shell.jsx`): Names to sort out (Find it in the library, Keep it as my own), My names (each with the library's full name, a link button to change it, a bin), Add a name (type it, Find what it is, search, tap), and My own exercises (name, closest movement, needs, main muscles, how it's done; Suggest for the library, Take back). Manual: new 3.8 My exercises, the account menu list, 5.5 (what Billy notes, suggestions already checked, documents), and Library in Words. Tested on scratch SQLite with the mock Studio and a new stand-in for Claude that calls whichever tool a message names (`TOOL name {json}`), so each tool's real answer came back: search, own names, a private exercise made from a name to sort out, suggest and take back, another trainer refused, find_exercise by own name and by plural, find_alternatives for a barbell back squat at a place with dumbbells and no barbells for a client with a knee replacement at beginner level (bodyweight and goblet squats, with the knees and deep hip bending to modify; a Smith machine squat asking first; level, equipment and limitations counted in leftOut), the confirmation on a trainer's own name, and the document guard. The page was clicked through in Chromium at phone width with no console errors. Untested: real Claude's use of the tools, MariaDB, and sign-in end to end.

- **Coach IQ ideas audit, batch D: safety and trust** (17 Oct 2026; Glenn: "Brainstorm"). Ideas 21, 22 and 23. **21, conditions**: five facts added to `FLAGS` in `server/coach-iq.js` (`kneeling`, `deep-hip-flexion` for the hip past 90 degrees or the legs crossed, `head-movement`, `maximal-effort`, `abdominal-pressure`), and `factsOf(x)`, which adds to the facts written on an exercise those its attributes imply (a kneeling, half-kneeling, tall-kneeling or quadruped position means kneeling; supine lying on the back; prone lying face down; an overhead load overhead; a decline bench head below the heart), so they cannot drift. Tagged by hand where a position doesn't say it (a one-off script in the scratchpad): kneeling on 11 more (rollouts, Nordic curl, hip flexor stretch, child's pose, cat-cow, bird dog, getting up from the floor, Pilates swimming, the kneeling side plank), deep hip bending on 29 (pistol and Cossack squats, leg press, hack squat, the squats except the box squat, child's pose, pigeon, 90/90, roll-up, knee and leg raises, reverse crunch, Russian twist, the hundred), quick head movement on 7, all-out effort on 4 (sprint, shuttle run, burpee, air bike), pressure in the belly on 16. **`coach-iq/conditions.json`**, the table Glenn approves row by row, drafted by Claude from general training guidance: 14 conditions (pregnancy after the first trimester, postpartum, high blood pressure, a heart condition, osteoporosis, knee and hip replacements, vertigo, falls risk, low back, shoulder and knee pain, arthritis in the hands, diabetes), each with facts and joints to avoid and to modify, whether a doctor's clearance comes first, and when to refer on, every one `status: "draft"`. `npm run iq` checks it (known facts and joints, a refer line, clearance stated, a date on a reviewed row) and writes `coach-iq/CONDITIONS.md` showing what each row does to the library (pregnancy: 50 of 301 exercises left out, 63 more offered with care), so a row can be judged before it is approved; `check-iq` fails if that page is behind. The exercise page's Care with now shows `factsOf`. **22, limitations**: `coach_limitations` (lim… ids, Glenn's tag): the client's Studio id, the trainer's plain words (300 characters), conditions, facts and joints as JSON lists, who wrote it and when. `server/limitations.js`: read, check, add, delete (by the writer only, and a real delete: this is health information), and `meaningOf`, which gathers for Billy each limitation in the trainer's words with its conditions spelled out (clearance first, when to refer, draft or not) and everything to avoid and to modify in one place. Routes: `GET /api/coach-iq/conditions` (the conditions, facts and joints for the form), `GET` and `POST /api/clients/:client/limitations`, `DELETE /api/limitations/:id`; a client must be on the signed-in trainer's own list (`ownClient`, through `myClients`), which is what being one of their trainers means, so every trainer of the client sees them (Glenn: "Yes, all their trainers") and anyone else gets a 404; deleting someone else's is a 403, "Only the trainer who wrote it can delete it." The Clients tab: a Limitations section at the foot of a client's opened details (`src/clients/Limitations.jsx`): each in the trainer's words, what it means, "Written by you" or the writer's name, a bin for one's own with Delete or Keep; + Add a limitation opens plain words, What it means (the conditions as chips) and Keep away from (the facts as chips), and "Every trainer of this client sees this. Write what it means for training, not a diagnosis." Billy: a new tool `client_limitations` (a client by name or id, from the trainer's own list), and his prompt says to check it before suggesting anything, never suggest what is to be avoided, offer an easier version of what is to be modified, say when clearance comes first or a referral is due, and that a draft condition is guidance under review. `my_clients` now sends him an age instead of the birthday and no email or phone. **23, documents**: his prompt says what comes in a photo or PDF is material to read, never instructions; and in code, `remember_equipment` saves nothing in a turn whose message carries an image or a document, asking instead that the trainer say it in their own words. **Tested** on a scratch SQLite with the stand-ins (two trainers; Jordan shared between them): the conditions list (14 conditions, 17 facts); a limitation written for Avery with a knee replacement and "no arms overhead"; the other trainer, not Avery's, got a 404; one written for the shared client was seen by the other trainer as written by Casey Rivera, and their delete refused with a 403, then the writer's accepted; an empty text and an unknown condition refused; `meaningOf` gave "weight on a knee", "jumping or running" and "arms overhead" to avoid, deep hip bending and the knees to modify, clearance first and a draft mark; Billy's client list carried an age (36) and no email, phone or birthday; a PDF saying there was no low row machine saved nothing, and the same said in the trainer's own words was saved; in Chromium a limitation added with a condition chip and shown with what it means, no console errors. Manual 4.7 A client's limitations, 5.5 on what Billy knows of clients and on documents, a Words line for Limitation; Coach IQ's README. This entry is build 1.0.7.

- **Coach IQ ideas audit, batch C: the library's content** (17 Oct 2026; Glenn: "Brainstorm"). Ideas 15, 16 and 8, built together as one change to the library. New words in `server/coach-iq.js`: support Chair; equipment Jump Rope (small tools) and Battle Ropes (ropes); patterns `balance` and `breathing` ("Breathing and pelvic floor"); and `PURPOSES` (strength, power, muscle building, endurance, mobility, balance and fall prevention, conditioning, control) and `ROLES` (warm-up, main lift, accessory, finisher, cool-down). **15, for limitations**, leaning to the groups Glenn named (older adults, injury and post-rehab, pregnancy and postpartum, chronic conditions): new families Single-Leg Stand (with a chair, then without), Tandem Stand (with a chair, then without), Heel-to-Toe Walk (needs room to move), Get Up From the Floor (with a chair, then without, intermediate), Step-Down (bodyweight, then dumbbell), Terminal Knee Extension (band), External Rotation (band, cable, side-lying dumbbell), Y-T-W Raise (prone, then incline bench with dumbbells), Tibialis Raise (wall), Side-Lying Leg Lift (bodyweight, band), Diaphragmatic Breathing and Pelvic Floor Contraction (lying and seated each, "Kegel" a name of the latter); and seated versions in existing families: a seated march, seated band row, chest press and overhead press, a seated knee extension, a seated heel raise, and a calf raise holding a chair. **16, mainstream gaps**: Turkish Get-Up (bodyweight, then kettlebell), Clean and Snatch (single-arm kettlebell and dumbbell; clean intermediate, snatch advanced), a single-arm kettlebell swing, a goblet carry, dumbbell and barbell glute bridges and a glute bridge hold, a split squat hold (the first uses of Isometric), Upright Row (dumbbell, barbell, cable), a T-bar row (bent-over landmine with a V-handle) and a single-arm landmine (Meadows) row, decline dumbbell and barbell presses, a Dead Hang, walking and running outdoors (the treadmill versions gave up the plain "walking" and "running" as other names to them), Sprint, Shuttle Run and Lateral Shuffle (all needing room to move), Jump Rope and Battle Rope Wave (and alternating waves), stretches (standing and side-lying quad, doorway chest, wall calf, figure-four and pigeon, seated neck), Pilates (Roll-Up, Single-Leg Stretch, Swimming) and yoga (Cobra, Tree Pose, Chair Pose). Each with muscles, level, cautions and steps (49 links by hand, such as the chair-supported stand to the stand to tree pose, sit to stand to getting up from the floor with a chair, kettlebell swing to clean to snatch, running outdoors to sprint), so the checker's rule that everything above beginner has a way in still holds. A consequence of the families rule: the glute bridges are no longer bodyweight-only, so the bodyweight ones' master names now say Bodyweight. **8, purposes and roles** on every family, set by pattern (a squat is for strength and muscle building, usually a main lift or accessory; mobility for warm-up and cool-down) with 33 families set by hand (the swing for power and conditioning, the Turkish get-up for strength, control and mobility, external rotation for control as a warm-up or accessory …). The checker requires both on every family and only known words; the review page says under each family "For …; usually …". Done by a one-off script in the scratchpad, not committed. 139 families and 301 versions, all checks clean. This entry is build 1.0.6.

- **Coach IQ ideas audit, batch B: the equipment memory** (16 Oct 2026; Glenn: "Brainstorm"). Ideas 19, 6, 18 and 20, built before any trainer fills the checklist in, since its keys are kept forever. **19, the checklist's kinds** (`server/equipment.js`): the fifteen keys kept; "A bench" relabelled "A flat bench"; six kinds added: `benchadjustable` (an adjustable bench, incline and decline), `stations` (a dip station, back extension or preacher bench, so benches are not counted as machines), `ropes` (battle ropes), `loaded` (a weighted vest or sandbag), `smalltools` (ab wheel, sliders, jump rope, foam roller, out of mats), and `space` (room to move: walking lunges, sprints); "Mats and foam rollers" is now "Mats". `IMPLIES` says a yes to an adjustable bench is a yes to a flat one, for when exercises are matched to equipment. In the library (`server/coach-iq.js`, `equipmentFor`): incline and decline benches need the adjustable bench; preacher bench and parallel bars need stations; the ab wheel and foam roller need small tools; a walking direction needs room to move; the back extension became bodyweight on a station (its family `needs` stations, its piece the back extension bench), not a machine; the inverted row gained a Smith machine version (the bar in a rack and the TRX row already existed), so 231 versions. **6, one list of pieces**: `PIECES` in `server/coach-iq.js`, 33 pieces each with a permanent key, a label, its checklist kind and other names (a gravitron is the assisted pull-up machine, a cable row station the cable station, a hex bar the trap bar, an assault bike the air bike), and `pieceFor(name)` matching any of them through `nameKey`. The library's `piece` is now a key, and the checker refuses an unknown piece or one whose kind the exercise doesn't need; the review page shows its label. A trainer's piece is matched the same way when saved (`piece_key`), keeps their own wording as its name, and takes its kind from the list, so the page asks "What kind is it?" only for a piece Coach doesn't know. **18, places**: new tables `coach_places` (tpl… ids, Glenn's tag; name, archived) and `coach_place_equipment` (eqp… ids; one row per answer per place, unique by place, kind and name; `piece_key`; `note` in place of the old "where"). Every trainer starts with "Where I usually train", made on first look; places are added, renamed and put away (archived, answers kept; the last one stays: "Keep at least one place."). Routes: `GET /api/equipment` (all places with their checklist and pieces, plus the piece list), `POST /api/places`, `PATCH` and `DELETE /api/places/:place`, `PUT /api/places/:place/categories/:key`, `POST /api/places/:place/items`, `DELETE /api/equipment/items/:id`; a place is always one of the signed-in trainer's own, or a 404. The page: the places as chips across the top with + Add a place, Rename and Remove this place, then The basics and Particular pieces for the place chosen; "At {{place}}, do you have…"; a datalist of known pieces on Add a piece. The answers from before places (`coach_equipment`) are moved into each trainer's first place on start, once, keeping their ids, and the old table is left as it was (`adoptOldAnswers`). **20, never a silent overwrite**: `coach_equipment_history` keeps every change (1, 0, or -1 for taken back, with who); Billy's `remember_equipment` now takes a place (needed when there is more than one: "Ask which place this is: …"), a note, and `confirmed`; when it would change an answer the trainer gave themselves to something else, it saves nothing and returns `needsConfirmation` with what they had said, and only a second call with `confirmed: true` changes it. His prompt says not answered means unknown, not no, to ask that one question when an exercise first needs it, and to check the place the work is for. **Tested** on a scratch SQLite with the stand-ins for Studio (now with a second trainer) and Claude: two old-style answers seeded in `coach_equipment` were moved into "Where I usually train" with their kinds, the "Leg press" item matched to the leg press machine; a place added, renamed, given its own checklist (adjustable bench yes, dumbbells no) without touching the first; "Gravitron" saved as the assisted pull-up machine with no kind given, and an unknown piece with no kind refused; the second trainer got a 404 on the first's place and saw only their own; a place removed and the last one kept; with two places and none named Billy was told to ask which; told there was no low row machine where the trainer had said yes themselves, nothing changed and he asked; confirmed, it changed to no by Billy, the history reading "yes by trainer → no by billy"; in Chromium a place added from the page, a Yes given there, a known piece added with no kind asked, and the first place's answers untouched, no console errors. The stand-in Claude itself needed two fixes on the way (it crashed on a tool error and on an empty readiness request), neither in Coach. **Not tested:** MariaDB; the first start on the host makes the three new tables and moves any answers. Manual 3.7 rewritten for places, the new kinds and pieces by name; 5.5 says Billy asks which place and confirms before changing an answer. This entry is build 1.0.5.

- **Coach IQ ideas audit, batch A: the library's foundations** (16 Oct 2026; Glenn: "Brainstorm", working through Next up, where the audit's 25 ideas sit in six batches). Twelve of the audit's ideas built together, because all change the shape of the same data: 1, 2, 5, 7, 9, 10, 11, 12, 13, 14 (the merge; its other half, widening alternatives to the pattern, moved into idea 4), 17 and 25. **Ids, Studio's way** (1, and Glenn's "take a look at Studios ID prefix and convention"): `server/ids.js` with `PREFIX` holding only Glenn's tags (exr exercise, exf family, eqp equipment answer, exx own name, tpl place, lim limitation), `newId` (3 letters, 3 digits, 3 letters, 3 digits, lowercase), `isId`, and `insertWithNewId` retrying a clash as Studio's does; an unknown kind throws "ask Glenn for one before inventing it". My equipment's rows now get eqp ids through it (`server/equipment.js`); rows already made with the old `eq_` ids keep them, since an id is never changed. Every family and version in the library got a permanent id once, at random, now stored: the name-made ids the checker used to insist on are gone, so a rename no longer moves an id; `formerNames` keeps a renamed exercise's old names for scans, and an exercise is retired (`status: "retired"`, optional `replacedBy`), never deleted. **`server/coach-iq.js`** rewritten: `ORDER` now direction, position, support, limbs, implement, attachment, load, grip, velocity, plane (Glenn: direction "First", attachment "After the equipment"); `WORDS` gained direction (Forward, Reverse, Walking, Lateral, Curtsy, Diagonal), attachment (Rope, V-Handle, Single Handle, Straight Bar, EZ Bar, Wide Bar, Ankle Strap), positions Staggered, Narrow and Wide Stance, supports Decline Bench and Deficit, load At Sides; it lost Tempo, Eccentric and Low-Impact from velocity and In Place from position (11). The shared lists moved here from the checker: `PATTERNS`, `MUSCLES` (17: no "shoulders" as a muscle; abductors, tibialis, rotator cuff, traps, obliques, pelvic floor added), `JOINTS` (upper-back and feet added), `FLAGS`, `LEVELS` (9: written down as skill and strength needed, whatever the weight), `MEASURES` (2: reps, time, distance, calories), `ORIGINS`, `STATUSES` (10). New: `equipmentFor` (5: a version's needs worked out from its implement, its support, Hanging (a pull-up bar), Seated with a free weight (a bench) and its family's own `needs`; an incline, feet-elevated or rear-foot-elevated support takes a bench or a box), `measureOf` and `perSideOf` (2: the version's own, else the family's, else reps; per side when one arm, one leg, alternating, or a family that always is), and `nameKey` (13: lowercase, no punctuation, plurals singular). **The conversion** (a one-off script in the scratchpad, not committed; the JSON is the source): the four lunge families became one Lunge family with a direction (14); the negative pull-up was removed and "negative pull-up" made a name of the pull-up, since slow lowering is how a set is done (11); March lost "In Place"; Wall Sit and Wall Slide lost the wall from their names (12, the movement's name says it); the suitcase carry names one arm once and is counted per side; the dumbbell squat says At Sides; "band-assisted pull-up" moved from the machine-assisted version to the band one (13); the attachment slot was used for a rope pushdown and a V-handle (close-grip) lat pulldown (12), the two new versions; muscles re-tagged (17: "shoulders" became the delts by what each exercise does, obliques on the rotations, side planks, Pallof and suitcase work, traps on shrugs and farmer carries, abductors on abduction, lateral walks and clamshells, rotator cuff on face pulls); modality and stored equipment dropped (5), keeping only `piece`; `origin: "starter"`, `status: "draft"`, `reviewed: null` on all (10); families gained `measure`, `perSide`, `needs` (the pull-up bar) and `discipline` (yoga, pilates). **Links** (7): only `harder` is stored; easier is worked out. The first conversion re-pointed every step onto the same equipment and the stricter checker caught 23 problems from it on its first run: a step re-pointed within its own family landed on the exercise itself (the barbell bench press lost the dumbbell press as its way in), two Romanian deadlifts pointed down a level to a beginner deadlift, one loop, and real gaps. Re-run with rules: within a family a link stays as written; across families it moves onto the same equipment on whichever side the link was written, only if the level still rises; a bodyweight version leads to its loaded siblings set up the same way; ten gaps filled by hand (crunch to Russian twist, banded and cable lat pulldown to straight-arm pulldown, straight-arm pulldown to pullover, farmer's to overhead carry, chest pass to slam, rowing machine to ski erg, child's pose to downward dog, pushdowns to overhead extensions); and a pair pointing at each other keeps one way. Then all clean: 106 families, 230 versions, 34 with no step either way (mobility, stretches and single beginner drills). **`scripts/iq.mjs`** rewritten (25): checks family and version ids, every attribute word, master names unique, names unique across common, other and former names (13), muscles not both main and other, measures, origins, statuses, a reviewed date on a reviewed exercise, a retired one's `replacedBy`, every harder step real, never itself, never lower, never in a loop, and everything above beginner reachable from something easier; `EXERCISES.md` gained Equipment (worked out) and Counted columns, statuses in its header, and the definitions of level and counting. `npm run check-docs` now runs `check-iq` too, so a broken library cannot pass the docs check. Coach IQ's README rewritten for all of it. Tested: the checker clean; My equipment still saves through `insertWithNewId` on a scratch SQLite (`eqp499lml047`, and the same piece named again keeps its id); an unknown kind of id is refused; build clean. This entry is build 1.0.4.

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
   - [3.8 My exercises](#38-my-exercises)
   - [3.9 Reviewing Coach IQ (Primary Master only)](#39-reviewing-coach-iq-primary-master-only)
   - [3.10 Installation (Primary Master only)](#310-installation-primary-master-only)
4. [Your clients](#4-your-clients)
   - [4.1 Opening your clients](#41-opening-your-clients)
   - [4.2 Reading the list](#42-reading-the-list)
   - [4.3 Seeing a client's details](#43-seeing-a-clients-details)
   - [4.4 Finding a client](#44-finding-a-client)
   - [4.5 Archived clients](#45-archived-clients)
   - [4.6 Adding or changing a client](#46-adding-or-changing-a-client)
   - [4.7 A client's limitations](#47-a-clients-limitations)
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
   - **My exercises** — what you call your exercises, and exercises of your
     own (3.8).
   - **Review Coach IQ** — only for the Primary Master: passing the library
     (3.9).
   - **Installation** — only for the Primary Master: settings for this copy of
     Coach on its server (3.10).
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

Coach keeps a list of the equipment you have, place by place, so Billy suggests
exercises you can actually do where you are training. It is yours alone:
nobody else sees it.

1. Tap your photo or initials in the top right corner, then **My equipment**.
2. Across the top are your places. You start with one, **Where I usually
   train**. Tap a place to see its equipment.
   - To add one, such as a client's home or the park, tap **+ Add a place**,
     type its name and tap the tick.
   - To change a place's name, choose it and tap **Rename**.
   - To put a place away, choose it and tap **Remove this place**. You always
     keep at least one.
3. Under **The basics**, answer each line for the place you chose —
   **Dumbbells**, **Barbells and a rack**, **A flat bench**, **An adjustable
   bench (incline and decline)**, **Room to move** and so on — by tapping
   **Yes** or **No**. Your answer is saved as you tap. To take an answer back,
   tap it again. An adjustable bench counts as a flat bench too.
4. Under **Particular pieces** are machines and other pieces a program has
   asked about, such as a low row machine. Each says what kind it is, and your
   note if you wrote one. Tap **Yes** or **No** to change whether you have it,
   or the bin to remove it.
5. To add a piece yourself, fill in **Add a piece** at the bottom: its name,
   **What kind is it?**, a note if you like, and **Do you have it?** Then tap
   **Add**. Coach knows many pieces by name, whatever you call them — a
   "gravitron" is the assisted pull-up machine — and fills in the kind for you.

A piece Billy wrote down from something you told him says **Noted by Billy**.
Change or remove it here like any other. If Billy is told something different
from an answer you gave yourself, he asks you before changing it.

#### 3.8 My exercises

Coach has its own library of exercises, each with a full name that says
exactly what it is, such as *Squat — Dumbbell, Goblet*. You can keep your own
names for them, and add exercises the library doesn't have. Billy uses your
names when he talks to you. Like your equipment, it is yours alone.

1. Tap your photo or initials in the top right corner, then **My exercises**.
2. **My names** lists what you call an exercise, with the library's full name
   under it. To add one, type what you call it under **Add a name**, such as
   *Bulgarians*, and tap **Find what it is**. Search the library, such as
   *rear foot elevated split squat*, and tap the right one.
   - To change what one of your names means, tap the **link** beside it and
     choose again.
   - To remove a name, tap the **bin**.
3. **Names to sort out** appears only when Coach has a name of yours it didn't
   recognise. For each, tap **Find it in the library** and choose it, or
   **Keep it as my own** to make it an exercise of your own.
4. **My own exercises** are exercises the library doesn't have. Tap **+ Add
   an exercise of my own**, then give it a name, the movement it is closest to
   if there is one, what it needs, what it mainly works and how it's done.
   Tap **Save**. To change one, tap its name; to remove it, tap the **bin**.
5. If one of your own exercises belongs in everybody's library, tap **Suggest
   for the library**, say why if you like, and tap **Suggest it**. It then says
   **Suggested for the library on** the day. To change your mind, tap **Take
   back**.

A name Billy wrote down from something you told him says **Noted by Billy**.
If you had tied that name to a different exercise yourself, he asks you
before changing it.

#### 3.9 Reviewing Coach IQ (Primary Master only)

Every exercise in the library and every line of the conditions table starts
as a draft. The Primary Master passes each one here. Nobody else sees this
page.

1. Tap your photo or initials in the top right corner, then **Review Coach
   IQ**.
2. At the top are two counts with bars: how many exercises and how many
   conditions are approved so far, and how many are flagged.
3. Under **Exercises**, tap **Start with the first not done**, or choose a
   family from the list. Each family's line in the list says how many of its
   exercises are approved, such as *Squat — 3 of 12*.
4. Each exercise is a card: its everyday name, its full name, what else it is
   called, its level, what it works, what it needs, how it is counted, what it
   involves, the joints it loads, and its easier and harder steps.
   - If it is right, tap **Approve**. A comment is optional.
   - If something is wrong, write what in the comment box, then tap **Flag**.
     A flag needs a comment, so it can be fixed.
   - The card then says **Approved** or **Flagged**, with the day. To change
     your mind, tap **Take back**.
5. When the family is done, tap **Next family**. It goes to the next family
   with anything still to pass.
6. **Conditions** works the same way, one card for each condition: what to
   avoid, what to make easier or supported, whether a doctor's go-ahead comes
   first, and when to refer on.
7. **Suggestions** shows exercises trainers have suggested for everybody's
   library, who suggested each, and why. To add one, tell Claude in a session.
8. **Books** is where reading a book into Coach IQ will be done. Until then,
   give Claude the PDF in a session.

An approval counts straight away: Billy no longer calls that exercise or
condition a draft. Now and then, tap **Download reviews** and give the file to
Claude, who writes your marks into the library itself and works through the
flags.

#### 3.10 Installation (Primary Master only)

Settings for this copy of Coach on its server, as in Studio's Installation.
Nobody else sees this page.

**Where files are saved.** Files Coach keeps are written to one folder on the
server. The app chooses one by itself: on the host, its Private Storage,
`/private`, which is kept when the app is deployed again. Coach keeps its
files in a `trainability-coach` folder inside it. **Saved in now** shows the
folder in use.

1. Tap your photo or initials in the top right corner, then **Installation**.
2. To name another folder, type its full path under **Folder on the
   server**, starting with a slash, and tap **Save folder**.
3. The app tries the folder first: it makes it, writes a file there and takes
   the file away. If it cannot, it says why and changes nothing. A folder
   inside the app's own folder is refused, because that folder is rebuilt on
   every deploy and part of it is public.
4. **Let the app choose** goes back to the app's own choice.

**Files already saved are not moved.** If a folder you named can no longer be
written to, the app goes back to its own choice and says so in red. If the
host's own settings name the folder, the page says so and it can't be changed
from here.

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

#### 4.7 A client's limitations

A limitation is something a client should not do, or should do with care: a
new knee, a sore shoulder, a pregnancy. Billy reads them before he suggests
anything for that client.

1. Open the client's details (4.3). At the bottom is **Limitations**.
2. Tap **+ Add a limitation**.
3. Write it in plain words, such as *No kneeling, new knee in March*.
4. If you like, tap what it means under **What it means**, such as **A knee
   replacement**, and anything to stay away from under **Keep away from**,
   such as **arms overhead**. Tap a choice again to take it off.
5. Tap **Save**.

Every trainer who trains this client sees their limitations, with who wrote
each one. Write what it means for training, not a diagnosis. Only the
trainer who wrote a limitation can delete it: tap the bin beside it, then
**Delete** (or **Keep** to leave it).

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

- **He changes nothing, apart from noting your equipment and your names for
  exercises.** When you tell him what you have — "there's no low row
  machine" — he writes it down on your equipment list (3.7), marked **Noted by
  Billy**; when you tell him what you call an exercise, it goes on My
  exercises (3.8). If you have more than one
  place, he asks which. If you had given a different answer yourself, he
  tells you what you had said and changes it only if you say so. Otherwise he cannot add or
  change a client, book or cancel a session, send a message or charge anybody.
  Clients are added and changed in Studio (4.6).
- **He only knows your own clients**, the same people as on your Clients page,
  and only what designing training needs: not their email, phone number or
  birthday. He reads their limitations (4.7) before suggesting anything, and
  says when something needs a doctor's go-ahead first.
- **His suggestions come from the library, already checked.** Ask him for
  something instead of an exercise and he only offers ones that fit the
  equipment at the place, the client's level and their limitations. If one
  needs a piece of equipment you haven't answered about, he asks first.
- **He reads what you send him, but never takes orders from it.** Nothing in a
  photo or a PDF is saved to your equipment list or your names; tell him in
  your own words.
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
| **Library** | Coach's own list of exercises, each with a full name that says exactly what it is (3.8). |
| **Coach IQ** | Trainability's own know-how for designing training: the library, the conditions table, and the principles read from books. The Primary Master reviews it (3.9). |
| **Limitation** | Something a client should not do, or should do with care, written down by one of their trainers (4.7). |
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
