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

- **Studio's typography, set once for the whole app** (18 Oct 2026; Glenn: "Match Trainability Studio's typography so Coach looks like part of the same product", with the fonts and rules: one Google Fonts import of Roboto 300–700 and Quicksand 500–700; UI and body 'Roboto', -apple-system, system-ui, sans-serif; headings Roboto 500 with 0.01em; the "Trainability" wordmark text Quicksand 600 with 0.01em, Quicksand being the free stand-in for the logo's licensed Katahdin Round; no other fonts; in the shared global CSS, not per component). Build 1.0.41. Not from Next up. Coach was already Roboto (a `<link>` in `index.html`, Roboto only). Now: the one `@import url(…)` Glenn gave is the first line of `src/index.css` (before `@import "tailwindcss"`, as an @import must be; the build keeps it first), and the `<link>` is gone from `index.html`, leaving its two preconnects. The body's stack lost "Segoe UI" and Arial to match the rule exactly. A base rule gives h1–h6 Roboto 500, 0.01em (`cx-display` already was, now the same stack). New `@utility cx-wordmark` (Studio's `.iw-wordmark`, read in its theme.jsx: the same three properties). The only place "Trainability" is written as a wordmark in text is the printed program's "TRAINABILITY® COACH" (`PrintProgram.jsx`), which drops `tracking-widest` and `font-semibold` for `cx-wordmark`; the logo and COACH lettering stay the kit's SVGs, and "Trainability" in sentences ("Couldn't reach Trainability…") stays body text. CLAUDE.md's line on the look says so. **Tested** in Chromium: on Home the body computed Roboto 400 and a heading Roboto 500 at 0.24px (0.01em), with Roboto 400, 500 and 600 loaded from Google; on the print page the wordmark computed Quicksand 600 at 0.12px and Quicksand 600 loaded; check-ui and the build clean; screenshots sent to Glenn. Commit: build 1.0.41.

- **Open Studio taken out of the account menu** (18 Oct 2026; Glenn: "Can you remove the “open studio” from the profile menu?"). Build 1.0.40. Not from Next up. The menu item (`src/chrome/AccountMenu.jsx`) and its unused `ExternalLink` and `STUDIO_URL` imports are gone; Studio is opened from the apps panel under the logo only, as on Studio's own header. Manual 3.5's list and the glossary's Account menu line; CHANGELOG's two mentions. Asked in the same message, and answered without a change for now: opening Studio from the apps panel when Coach runs as a home-screen app. The link already opens in the same window (no `target`), but Studio is another site (trainabilitystudio.com), and a home-screen web app can't hand a link to another home-screen web app: iPhone shows it in its own browser sheet, Android in a browser bar inside Coach. Put to Glenn with the options. Build and docs check clean. Commit: build 1.0.40.

- **The account menu and Billy's panel, one at a time** (18 Oct 2026; Glenn: "When the profile menu opens, Billy's panel should close, and vice versa"). Build 1.0.39. Not from Next up. `AccountMenu` (`src/chrome/AccountMenu.jsx`) now takes `billy` from the header: its menu opening calls `billy.setOpen(false)`, and Billy opening (by his button, or by Ask Billy from a program or a dialog) closes the menu, both as effects so it holds however either is opened. Before, opening Billy with the menu open already closed the menu (its outside-press handler), but with Billy open the account menu was blurred and not tappable (build 1.0.38's `pointer-events: none` on the rest of the header), so a tap on it only closed Billy. The menu's wrapper is now `.cx-account` and stays tappable over the grey (`src/index.css`), still greyed and blurred until tapped. Manual 6.1; CHANGELOG. **Tested** in Chromium at 400px dark and 1200px light: Billy open, the photo tapped: menu open, Billy and the veil gone; then Billy tapped: Billy open, menu closed; the menu opened from the keyboard; no page errors; screenshots sent to Glenn. Commit: build 1.0.39.

- **Billy's button joined to his panel, and the screen behind greyed and blurred** (18 Oct 2026; Glenn: "Make sure Billy's button connect with the panel, when his panel is open, blur and greyscale everything in the background"). Build 1.0.38. Not from Next up. **Joined** (`src/index.css`): open, `.cx-billy-button-open` takes the panel's fill (`--chalk`) and outline, squared off at the bottom (10px corners on top only), with `::after` a neck of the same fill and side outlines from the button's bottom down over the panel's top outline (height `0.75rem + 7px`: the header's bottom padding plus the panel's 6px gap and its 1px border; measured in Chromium: button bottom 48, neck bottom 67, panel top 66), as the logo badge and the apps panel already do. The arrow is cerulean. Found on the way: the hover tint (`:hover`, more specific) still painted the open button purple under a mouse, so the open rule covers `:hover` too. **Behind him** (`src/chrome/Header.jsx`, `src/index.css`): a veil, `.cx-billy-veil`, fixed over the whole page at z-index 35 with `backdrop-filter: grayscale(1) blur(4px)` and a light wash of the page colour, covering the bottom tab bar (z 30) too. It is put on `document.body` with a React portal, because the header's own `backdrop-filter` makes it the containing block for anything fixed inside it. The header rises to z-index 40 while he is open (`.cx-headbar-billy`, with its own grey blur), so his button and panel stay sharp above the veil, and the rest of the header (the logo, COACH, the role badge, the account menu) is filtered in place: `grayscale(1) blur(2px)`, 70% opacity, not tappable. Tapping the veil, or anywhere in the header outside the button and panel, closes him, as Esc already did; tapping inside the panel doesn't. Manual 6.1; CHANGELOG. **Tested** in Chromium at 400px dark and 1200px light on My equipment: the shapes met with no gap, the page and header blurred grey, a tap on the background closed him and took the veil away, a tap in his box kept him open; no page errors; screenshots sent to Glenn. Commit: build 1.0.38.

- **Studio's places all synced to every trainer, and a client's gym followed when it changes** (18 Oct 2026; Glenn: "Will their home gym sync with Studio, just in case that changes in Studio? Also, make sure all the places within that business (their home gyms business) syncs with the trainer here as well."). Build 1.0.37. Not from Next up. **The answer to the question**: for a new program, yes already (Coach reads the client's gym from Studio's `/api/clients` each time the form asks); but a client gym's name could lag up to ten minutes behind a rename in Studio, and a program already made kept its place silently. Both fixed. **All of Studio's places** (Studio is one business, its places listed by `/api/locations`): `equipment.syncStudioPlaces(trainerId, studioPlaces, yoursId)` replaces `linkStudioPlace` and `linkClientPlace`. For each live place in Studio the trainer gets one place linked by `studio_place_id` (made the first time, renamed when Studio renames it, brought back if put away); `from_studio` now means only "the trainer's own place in Studio" (their `defaultPlaceId`), marked `yours`; one Studio no longer has (removed or archived there) is put away here, answers kept. `syncStudioPlace` in `server/index.js` now always reads `/locations`, not only for a trainer with a default place, still at most every ten minutes per trainer unless `force`. `shapePlace` marks every linked place `fromStudio` (name from Studio, not renamed or removed here: "This place's name comes from Studio. Change it there." / "This place comes from Studio, so it stays while Studio has it.") and `yours` for their own; `placesOf` orders theirs first, Studio's others next, then their own places. A place a trainer had linked by hand before (a client's gym, build 1.0.36, renameable then) is now one of Studio's and follows its name. My equipment says "Your place in Studio." or "One of Studio's places." **The client's gym**: `GET /api/clients/:client/place` now syncs Studio's places first, every time (one call to `/locations`), and returns `equipment.placeForStudio`. **A program made before the gym changed**: `GET /api/programs/:id` reads the client from Studio; when they have a gym in Studio and the program is for a different one of Studio's places, or for no place, it adds `gym` ("Jordan's gym in Studio is Trainability Eastgate; this program is for Trainability Northside.") and the designer shows it under the details with an Info icon and **Use Trainability Eastgate**, which sets the program's place; it disappears once the place matches. A place of the trainer's own (a client's home) is never questioned. Only on opening, not on every edit, to keep calls to Studio down. Manual 3.7 step 2, 5.1 step 8 and a paragraph after the program's check; CHANGELOG. **Tested** against the stand-in Studio, given a third place, Eastgate, and Jordan's gym switchable: both trainers got Downtown (theirs), Northside and Eastgate, then their own; a program for Jordan at Northside opened with no note; with Jordan moved to Eastgate and Eastgate renamed "Trainability Eastgate Studio", the client place route returned the new name at once, opening the program gave the note, and **Use** moved it (note gone); with Eastgate archived in Studio, it left the trainer's places and Jordan, back at Northside, got Northside. In Chromium at 400px dark: the note and Use, and My equipment's list; no page errors, no sideways scroll; screenshots sent to Glenn. **Not tested**: against Studio's real places and client records. Commit: build 1.0.37.

- **A client's gym in Studio as "Where they train"** (18 Oct 2026; Glenn, quoting my last report: "“Studio also records which of its gyms a client belongs to, but it doesn't send that to Coach. Using a client's gym for "Where they train" would need a small change to Studio; say if you want that.” — make this possible"). Build 1.0.36. Not from Next up. **What I had said was wrong**: reading Studio again (`server/people.js`, `clientRow`), its `/api/clients` already sends a trainer's own clients `homePlaceId` (their home gym, home-gym.js, "like a trainer's default place, for clients and members"), `placeIds` (memberships, from `client_places`) and `archivedPlaceIds` (memberships ended). Coach's `myClients` had simply dropped them. So no Studio change after all. **In Coach**: `myClients` (`server/index.js`) now passes on one field, `studioPlaceId`: the home gym, else the first membership not ended, else null (the memberships themselves, plans and prices, stay out). New `GET /api/clients/:client/place` (own clients only) names it from Studio's `/locations` and returns it as one of the trainer's places through `equipment.linkClientPlace`: the trainer's place already linked to that Studio place (their default one first; brought back if put away), or a new one (tpl id, Studio's name, `from_studio` 0, so an ordinary place they may rename or remove). Being linked by `studio_place_id`, it shows whatever the Primary Master set there for everybody (build 1.0.35). **The form** (`DetailsForm`): choosing a client asks for it; with a gym, "Where they train" moves to it (added to the list if new) with "{First name}'s gym in Studio." under it; with none, it goes back to the trainer's first place (found in testing: it had stayed on the previous client's gym). Manual 5.1 step 8; CHANGELOG. **Tested** against the stand-in Studio (Avery: memberships at Downtown and an ended one at Northside; Jordan: home gym Northside; Sam: neither): Avery gave Downtown (for Glenn and Tess, their default-place row), Jordan Northside (Glenn's earlier Northside row reused; a new one made for Tess, with the Primary Master's kettlebells yes on it, locked), Sam none; Coach's `/api/clients` carried only `studioPlaceId` more. In Chromium as Tess at 400px dark and 1200px light: Jordan → Northside with the line, Sam → back to Downtown, Avery → Downtown with the line; no page errors, no sideways scroll; screenshot sent to Glenn. **Not tested**: against Studio's real client records. Commit: build 1.0.36.

- **The Primary Master sets the equipment at Studio's places, for every trainer** (18 Oct 2026; Glenn: "Have the ability for primary master to set the equipment for places connected to studio, so trainers don't need to edit it."). Build 1.0.35. Not from Next up. Not asked first; decided and reported: the Primary Master's answers win and are locked, and anything they leave unanswered a trainer can still answer for themselves (so a trainer is never stuck with "not known"). **Data** (`server/equipment.js`): the answers set for everybody live in the same tables as a trainer's, under one Coach place per place in Studio owned by `EVERYONE` ("studio", never a trainer's id) and linked by `studio_place_id`; these rows take tpl ids like any place (no new tag asked for: they are Coach places). `everyonesPlaces(studioPlaces)` makes one for each live place in Studio the first time it is seen, follows Studio's name, and puts away one gone from Studio, answers kept. `equipmentOf(trainerId)` now merges (`answersOf`): at a trainer's place linked to a place in Studio, an answer set for everybody replaces theirs and is marked `locked`; pieces set for everybody come first, locked, then the trainer's own not already among them. Because the checks, the suggestions, the swaps and Billy's my_equipment all read `equipmentOf`, they all see the merged answers with no other change. `lockedAnswer(trainerId, placeId, kind, name)` says whether one is set for everybody. `removeItem` takes the source for its history. **Routes** (`server/index.js`): `equipmentFor(req, user)` replaces the equipment routes' answers and, for the Primary Master (`isPrimary` and master, as `asPrimary`), adds `everyone` from Studio's `/locations` (null if Studio can't be read). New, Primary Master only, anyone else a 404: `PUT /api/everyone/places/:place/categories/:key`, `POST /api/everyone/places/:place/items`, `DELETE /api/everyone/items/:id`, saving with source "primary". A trainer's `PUT /api/places/:place/categories/:key` and `POST /api/places/:place/items` refuse a locked one: "The Primary Master has set this for everyone at this place. Ask them to change it." Billy's `remember_equipment` refuses the same, telling him to send the trainer to the Primary Master. **The page** (`src/tabs/EquipmentTab.jsx`): the Primary Master gets "Places in Studio, set for every trainer" under their own places, with a building icon, and for one chosen "What you answer here is set for every trainer whose place in Studio this is. They see it, and can't change it.", "At {place}, for every trainer, is there…" and "Is it there?" when adding a piece. A trainer sees a grey "Set for everyone" with a lock on each locked answer, its Yes/No disabled, no bin on a locked piece, and under their Studio place "Answers marked Set for everyone come from the Primary Master; ask them to change one." Manual 3.7; CHANGELOG. **Tested** against the stand-in Studio (Tess given Downtown as her default place): Glenn's `everyone` listed Downtown and Northside; he set dumbbells yes, barbells no and a leg press ("up to 400 lb"), saved as "primary"; Tess's Downtown showed all three locked, Where I usually train untouched; her change to barbells and to the leg press refused with the message, kettlebells saved as hers; the everyone route a 404 for her; Glenn's own Downtown showed his set answers locked too; suggestions on a Downtown program for Tess left out barbells. In Chromium at 400px dark (Glenn and Tess) and 1200px light (Glenn): no page errors, no sideways scroll; four screenshots sent to Glenn. **Not tested**: Billy's refusal through a real model (the stand-in Claude doesn't call that tool), and against Studio's real `/api/locations`. Commit: build 1.0.35.

- **The trainer's place in Studio as one of their places** (18 Oct 2026; Glenn: "On the “where they train”, if the trainer is connected to a place in Studio, let's get that information from Studio as well and make that an option here."). Build 1.0.34. Not from Next up. **What Studio has** (read in its repository; nothing in Studio changed): a trainer is linked to a place by `users.default_place_id`, sent as `defaultPlaceId` on `/api/auth/me` (which Coach already asks); `/api/locations`, open to any signed-in account, lists the places (id, name, address …, `archivedAt`). No trainer-to-several-places table exists; `client_places` (a client's gym memberships) isn't on `/api/clients`, so a client's own place was left out. **In Coach**: `coach_places` gained `studio_place_id` and `from_studio` (in `COLUMNS`, `server/db.js`). `syncStudioPlace` in `server/index.js`, run by `GET /api/equipment`, `GET /api/programs` and Billy's `POST /api/assistant`, at most every ten minutes per trainer (an in-memory map), reads `/locations` when the trainer has a default place and calls `equipment.linkStudioPlace`: the first time, it makes a Coach place (a tpl id, as any place) linked to Studio's id and named as Studio names it; later, it follows a rename in Studio and brings it back if it was put away; when Studio's place for them changes, the old one loses `from_studio` and stays as an ordinary place with its answers, and the new one is made. If Studio can't be reached, places stay as they were (a warning in the log). `placesOf` lists the Studio place first (`ORDER BY from_studio DESC`) and marks it `fromStudio`, so the new-program form, which starts on the first place, starts there; a trainer whose first look comes with a Studio place gets only that, not "Where I usually train". It has its own checklist and pieces like any place, and Billy sees it by name. `PATCH /api/places/:place` refuses it ("This place's name comes from Studio. Change it there.") and `DELETE` too ("This is your place in Studio, so it stays."; `archivePlace` now returns "last", "studio" or null). My equipment shows "Your place in Studio. Its name comes from Studio, so it's changed there." instead of Rename and Remove this place. A first "(Studio)" after its name in the program form's place box was cut off at desktop width, so the name stands alone. Manual 3.7 step 2 and 5.1 step 8; CHANGELOG. **Tested** against the stand-in Studio, taught `defaultPlaceId` and `/api/locations`: Glenn's account got "Trainability Downtown" first, marked, then "Where I usually train"; renaming and removing it were refused with those messages; a Yes to dumbbells saved on it; Tess, with no default place, saw only her own; renamed in the stand-in to "Trainability Downtown Gym", Coach followed with the answer kept; moved to Northside, Northside came first with nothing answered and Downtown stayed as an ordinary place with its Yes; moved back, Downtown was the Studio place again. In Chromium at 400px dark and 1200px light: My equipment and the new-program form starting on it; no page errors, no sideways scroll; two screenshots sent to Glenn. **Not tested**: against Studio's real `/api/locations` and a real trainer's default place. Commit: build 1.0.34.

- **The client's level from their programs, and progression in the suggestions** (18 Oct 2026; Glenn: "The workout level “beginner, intermediate,.. etc” should start with what we can extract from the client. So if the client is intermediate, we don't need to recommended an intermediate exercise (unless it fit with the current pattern for the program)"). Build 1.0.33. Not from Next up. **Asked first**, with recommendations: where the level comes from (Coach knows only name, birthday, join date and session dates from Studio; Studio's enquiry form does ask a fitness level, but reading it would need a Studio change), and what the second sentence meant. Glenn: "Coach only, also try to determine what level they are based on the client's workout programs. We should also ask the trainer their fitness level when creating a new program (If we don't have this information already)", and "Based on what we know about program design, recommended harder exercises. See how many program they have and how the progression is there, or even the regression." So no Studio change. **The level** (`historyOf` in `server/programs.js`): the trainer's own programs for the client, archived ones too (they are history), oldest first, each with the average library level of its exercises. The level is the latest program's; one level up when the client has been on programs at that level for `WEEKS_TO_MOVE_UP` (12) weeks, counted from the first of the unbroken run at that level, without stepping back, and the latest program's exercises reach about its level (average within half a level). 12 weeks is my choice, not a principle from a book: Glenn can change it. Trend: "down" when the last program's level was lowered or its exercises averaged a quarter-level easier than the one before; "up" the other way. The reason is a sentence ("1 program with you, on beginner programs for 15 weeks without stepping back: time for intermediate."; "2 programs with you, getting harder from one to the next. The last, “Next block”, was intermediate."; "… Their last program stepped back to easier exercises, so beginner for now."). New route `GET /api/clients/:client/level` (own clients only, like limitations). **The form** (`DetailsForm` in `src/programs/Designer.jsx`): a new program's level now starts empty ("Choose…", required) and is filled from the route when a client is chosen, with "Coach IQ: {reason}" under it; with no programs, "No programs for {first name} yet. What's their fitness level?" and the program can't start until one is chosen (the browser's own "Please select an item in the list."). Editing a program is unchanged. Found on the way: the made-up name stayed "Avery's program" after switching to another client; it now follows the client while it is still the made-up one. **Progression** (`context()` now carries the client's history from programs made before this one): every exercise done, the next harder step of each (the library's `harder` links; 159 of 301 versions have them) and every easier step down the chain (new `library.easierOf`, walked transitively, so past a goblet squat is past a box squat and a sit to stand). `rank()` gives a next step +3 and an outgrown one −3; the level ceiling stays (nothing above the client's level). A next step's reason gains "A step on from Goblet squat, from an earlier program." The check adds a grey note, from "The client's earlier programs": "Sit to stand is a step back from Goblet squat, which Avery Stone did in an earlier program. Fine if that's the plan." Billy's tools are unchanged. Manual 5.1 step 8, 5.2 step 2 and the marks table; CHANGELOG. **Tested** against the stand-ins (a second stand-in client, Jordan Lee, added for it): Foundations (beginner: goblet squat, cable pull-through, incline push-up, split squat) dated 15 weeks back gave intermediate with the move-up reason, dated 5 weeks back gave beginner; a new intermediate program then suggested Smith machine squat, Romanian deadlift and Push-up as steps on from those, and Inverted row; Strength · quads, hamstrings, glutes put four steps on first (Smith machine squat, Romanian deadlift, Rear-foot-elevated split squat, Reverse lunge); adding Sit to stand gave the step-back note. In Chromium at 400px dark and 1200px light: the level and reason for Avery, the question for Jordan, blocked without a level; no page errors, no sideways scroll; three screenshots sent to Glenn. Commit: build 1.0.33.

- **Coach IQ remembers its answers for the next exercise** (18 Oct 2026; Glenn: "Next exercise they add, remember this setting so it opens to the next add exercise with it"). Build 1.0.32. Not from Next up. The Coach IQ card's answers (what we're working on, the muscle groups and any muscles picked under them) are kept per program on the device, in localStorage under `cx-iq-ask:<programId>`, in `src/programs/Designer.jsx` (`lastAsk`, `rememberAsk`), and passed to `ExerciseDialog` as `remembered` / `onRemember`. Its `Pick` step starts from them (dropping any kind or group the vocabulary no longer has) and reports every change back, so un-choosing something is remembered too. Kept per program rather than for everything, since a lower-body program and an upper-body one want different answers; kept on the device rather than in the database, since it's a convenience and not part of the program. Manual 5.2 step 2; CHANGELOG. **Tested** in Chromium at 400px dark against the stand-ins: the first open had nothing chosen; after choosing Strength · Legs › hamstrings and adding Dumbbell Romanian deadlift, the next open had the same three chosen and suggested Kettlebell Romanian deadlift, Cable pull-through and Banded good morning; after un-choosing Strength, closing and reloading the page, it opened with Legs › hamstrings only. No page errors; the screenshot was sent to Glenn. Commit: build 1.0.32.

- **Coach IQ's questions in a yellow card** (18 Oct 2026; Glenn: "Can you put these optional questions inside a yellow card, with Coach IQ as title. Remove the optional texts in it"). Build 1.0.31. Not from Next up. In the add-an-exercise dialog's first step, "What are we working on?" and "Muscle groups" (and a chosen group's muscles) now sit in a card titled **Coach IQ** with a light-bulb, and the "(optional)" after each question is gone. Coach's gold tokens (`--gold…`, used by the header's badge) were set for light mode only, so the card has tokens of its own in `src/index.css` for both: `--iq-card` (#FBF3D6 light, #33290E dark), `--iq-card-line` (#E6D49C, #6B5A22), `--iq-ink` (#4F3B00, #F6DD8A) and `--iq-chip` (white at 75% light, black at 28% dark) for an unchosen chip; a chosen chip stays cerulean with white words, as everywhere else. The search and Coach IQ's suggestions stay below the card. Manual 5.2 step 2. **Tested** in Chromium at 400px, light and dark, with Strength · Legs › hamstrings chosen: readable in both, no page errors, no sideways scroll; both screenshots sent to Glenn. Commit: build 1.0.31.

- **"What are we working on?" as five kinds of training** (18 Oct 2026; Glenn: "The answers on “what are we working on” is a bit weird. I would rather have strength, cardio, balance, mobility.. The other options there seems out of place. What do you think?", then, after I agreed and proposed five with Power, "Go with the five"). Build 1.0.30. Not from Next up. **Why**: the eleven choices of 1.0.27 were movement patterns (Squat, Hinge, Single leg, Push, Pull, Carry, Jumping) mixed with kinds of training (Conditioning, Mobility, Balance) and Core, which is also a muscle group; with the muscle groups answering where, the first question is better as what quality is being built. **The five** (`WORK_ON` in `server/programs.js`, each now matching the purposes Coach IQ's families are tagged with rather than patterns): **Strength** (strength, muscle or control, not breathing drills), **Power** (power: swings, woodchops, throws, jumps, cleans, snatches, sprints), **Cardio** (conditioning, or endurance work that is itself conditioning, so a wall sit isn't cardio), **Balance** (balance), **Mobility** (mobility, and breathing). Ranking (`suggestFor`): main lifts first for Strength or for muscles alone; Power and Cardio rank by their own purpose rather than the program's goal; stretches only for Mobility as before. Billy's `suggest_exercises` takes the same five and his program line says so. Squat, hinge, push and pull are no longer choices; Strength with a muscle group gives the same precision (Strength · Legs › hamstrings: Dumbbell Romanian deadlift, Cable pull-through, Banded good morning, Kettlebell deadlift, Kettlebell clean, Stability ball hamstring curl). Checked each: Strength gave squats, bridges, a hip thrust, a Romanian deadlift and lunges; Power a kettlebell swing, a woodchop, a Russian twist, pogo hops, a skater jump and a clean; Cardio a swing, high knees, mountain climbers, a bear crawl, running and marching; Balance lunges, a step-up, getting up from the floor, sit to stand and a single-leg stand; Mobility stretches and a Turkish get-up; Cardio with quads running, a sled push, an air bike, a rowing machine and a stair climber; Power with chest the medicine ball chest pass. Manual 5.2 step 2; CHANGELOG. **Tested** in Chromium at 400px dark and 1200px light: the five chips, Strength · Legs › hamstrings, then Cardio · hamstrings, and Ask Billy for ideas asking "I'm working on cardio, for the hamstrings"; no page errors, no sideways scroll; the screenshot was sent to Glenn. Commit: build 1.0.30.

- **Muscle groups as six top-level choices that open to their muscles** (18 Oct 2026; Glenn: "I would rather have chest, shoulders, arms, core, legs as the top level muscle group categories (having all the sub categories hidden), then when they select one of these, the next sub category under that group opens up"). Build 1.0.29. Not from Next up. **Asked first**: his five left out the back muscles (lats, upper back, traps, lower back); recommended a sixth group, Back, and Glenn chose it. **Groups** (`MUSCLE_GROUPS` in `server/programs.js`, now with keys): Chest (chest), Shoulders (front, side and rear delts, rotator cuff), Back (lats, upper back, traps, lower back), Arms (biceps, triceps, forearms), Core (core, obliques, pelvic floor), Legs (quads, hamstrings, glutes, adductors, abductors, hip flexors, calves, tibialis), the library's 23 muscles. **In the dialog** (`ExerciseDialog.jsx`): "Muscle groups (optional)" is always shown as six chips, any number; a chosen group means all of its muscles, and opens under it, marked by a blue rule, "Legs: all of them, or tap to narrow" with its own muscles as chips; muscles tapped there narrow that group to them; tapping the group again closes it and drops its muscles. Chest, with one muscle, opens nothing. The heading and Billy's question say a whole group by its name ("Coach IQ suggests: legs", "I'm working on chest") and a narrowed one by its muscles. The old fold of all 23 muscles is gone. **Ranking, found by trying each group**: a whole group first gave odd lists (Legs: three Cossack squats and a sled drag, then lunges, running and foam rolling ahead of any squat or hinge), because an exercise counted for every muscle it touched, main or other. Now (`suggestFor`) main muscles count, capped at two, other muscles only when no main one matches; main lifts are preferred unless a kind of movement was chosen; one version of each family comes before a second; and stretches and breathing come up only when Mobility is chosen or the program is for mobility. After that, Legs gave Cossack squat, Dumbbell Romanian deadlift, Forward lunge, Rear-foot-elevated split squat, Jump squat, Cable pull-through; Shoulders presses, a pike push-up, an upright row and a face pull; Back rows, a rowing machine, a scapular pull-up and a pulldown; Chest a push-up, a banded press, a fly and a pullover; Arms a hammer curl, push-ups, presses and a bench dip; Core a carry, a side plank, a woodchop, a Russian twist and a Pallof press; glutes alone a glute bridge and a hip thrust among the squats and lunges; Mobility with lats Child's pose. Manual 5.2 step 2. **Tested** in Chromium at 400px dark and 1200px light: no group open at first, Legs opening its eight muscles and narrowing, glutes narrowing further, Chest adding without opening anything, Legs closing and clearing its muscles, and Ask Billy for ideas with "I'm working on chest"; no sideways scroll. A console error "Manifest: Line: 1, column: 1, Syntax error." came and went between runs: the manifest served is valid JSON (`application/manifest+json`), and the tests load the page twice in quick succession, which cuts the first page's manifest fetch short; not seen when loaded once. The screenshots were sent to Glenn. Commit: build 1.0.29.

- **Screenshots shown to Glenn in cloud sessions** (18 Oct 2026; Glenn: "Make sure you show me screenshots when I'm asking on cloud environment"). Build 1.0.28. Not from Next up. Until now screenshots taken in the cloud's Chromium were looked at by Claude and described in words; Glenn can't open the cloud's copy of the app, so he saw none of it. Written into CLAUDE.md under Testing and safety, as a rule for every cloud session: take screenshots of what was built or changed (phone width, and desktop where it matters) and send them with the report. The last three builds' pictures were sent at once: the "What kind of program?" step (1.0.25), "What are we working on?" with the muscle groups open (1.0.27) and the exercise's details in the dialog (1.0.26), all at 400px in dark mode. Commit: build 1.0.28.

- **"What are we working on?" in the add-an-exercise dialog** (18 Oct 2026; Glenn: "On the “add an exercise” have an optional “what are we working on?” question with an optional option about muscle groups, this will help Billy narrow the exercise recommendations to a more precise way."). Build 1.0.27. Not from Next up. **The question**, at the top of the dialog's first step: "What are we working on? (optional)", chips for a kind of movement (`WORK_ON` in `server/programs.js`: Squat, Hinge, Single leg, Push, Pull, Core, Carry, Jumping, Conditioning, Mobility, Balance, each the patterns it covers, push and pull including their single-muscle work), one at a time, tapped again to clear; and "Muscle groups (optional)", folded until tapped (with a count when any are chosen), the library's 23 muscles in five groups (`MUSCLE_GROUPS`: Legs and hips, Chest and shoulders, Back, Arms, Core), any number. **What it does**: `suggestFor()` and `GET /api/program-days/:id/suggestions?workOn=…&muscles=a,b` (without either, the day's Could come next as before): versions passing the place, the level and the limitations as always, of that kind, and working those muscles (a main muscle counting three, another one), not already on the day, the closest muscles first, then as suggestNext ranks, six at most, each "Works the hamstrings and glutes." (with ", and some …" for other muscles) and a starting dose; the heading says "Coach IQ suggests: Pull · biceps"; nothing found says "Nothing in the library passes the place, the level and the limitations for that. Try fewer muscles, or another kind of movement."; unknown muscles are ignored. **Billy**: a new tool `suggest_exercises` (program, day, workOn, muscles, each from the same lists) giving the same narrowed list with the day's name, and his program line says to suggest from it when they say what they are working on; "Ask Billy for ideas" under the list closes the dialog and asks him, for example "In my program “Avery” for Avery Stone (prg…): For Day A, I'm working on pull, for the biceps. What would you add?" (or "What should I add next on Day A?" with nothing chosen). A first wording of the reason line repeated the family's name ("Push-Up. Works triceps."); it now says only what it works. Manual 5.2 (a new step 2, the rest renumbered); CHANGELOG. **Tested** against the stand-ins: the vocabulary (11 kinds, 23 muscles in 5 groups); Pull gave rows and pulldowns; glutes and hamstrings gave Romanian deadlifts, a pull-through and a good morning; Pull and biceps gave curls and a chin-up; carry with pelvic floor gave the nothing-found words; an unknown muscle was ignored; Billy's tool for "Day B", push, triceps gave push-ups and presses with starting doses; in Chromium at 400px dark and 1200px light, choosing Pull, then biceps, then clearing Pull narrowed the list each time, and Ask Billy for ideas asked him with the choice; no console errors, no sideways scroll. **Not tested**: Billy's real answer (no key in the cloud). Commit: build 1.0.27.

- **A dialog for adding and changing an exercise** (17 Oct 2026; Glenn: "When adding a new exercise, have a dialog asking what exercise, reps, sets, etc before adding it to program. Right now, the exercise details is kind of hidden and not very helpful."). Build 1.0.26. Not from Next up. **Before**: Add an exercise was a search box under the day that put the exercise on at once with nothing filled in, Could come next's Add did the same with the starting dose, and the details hid behind a small "Sets, reps…" link that opened a compact form in the row. **Now**: `src/programs/ExerciseDialog.jsx`, a dialog (a sheet from the bottom on a phone, centred on a computer, Escape and × close it, its middle scrolls), titled "Add an exercise to Day A" or "Change the exercise". Step 1, **Which exercise?**: a search box (any name the trainer uses, through `/api/programs-find`), and before anything is typed, "Coach IQ suggests for a full body day" with the day's suggestions and why. Step 2: a panel saying what the exercise is (the trainer's name, the library's name, the master name, Level, Works with its other muscles, Needs, or "Your own exercise" with its note), what Coach IQ says about it for this client and place before it goes in (red octagon to stop, orange triangle to take care, grey note), and **Change exercise**; then "How it's done (all optional)", six labelled boxes in two columns with an example in each and a hint under it (Sets "Or a range, such as 1–3.", Reps "Or a time, or each side.", Load "In your units.", Effort "Or RPE 7.", Tempo "Down, pause, up, pause.", Rest "Between sets."), Note, and the superset tick (not for a day's first exercise); filled from Coach IQ's starting point when an exercise is chosen, unless the trainer has typed something, and **Coach IQ's starting point** puts it back. **Add to Day A** (or Save) is the dialog's one primary; a refused save keeps it open with the server's words in red. **Server**: `programs.preview()` and `GET /api/program-days/:id/preview?exercise=…` (the writer's only, a 404 otherwise): the exercise's brief, the points (retired; the place's equipment, stop or ask; the client's limitations, stop or make easier; above the client's level) and `doseFor` the program's goal and level (an accessory a set less), with rest in words. **The designer**: Add an exercise opens the dialog at step 1; Could come next's Add opens it at step 2 with that suggestion's dose; each exercise's name and a new **Details** button (a row button where the "Sets, reps…" link was) open it to change; an exercise with nothing filled in says "No sets or reps yet."; the old inline search and form (`Finder`, `DoseForm`) are gone. Check-ui caught the step-1 Back as a link where it backs out; made quiet. Manual 5.2 and 5.3 rewritten (the steps, a table of the boxes, changing one), 5.5 the superset tick; CHANGELOG. **Tested** against the stand-ins: the preview for a barbell back squat at a place without barbells for a beginner with a new knee gave stop (equipment), take care (limitations) and take care (intermediate, above beginner) with 1–3 × 8–12, rest 3 min for strength; another trainer was told Not found; in Chromium at 400px dark and 1200px light, the dialog listed the day's suggestions, found Goblet squat, showed its level, muscles, dumbbells and the knee note with 1–3, 8–12 and 3 min filled in, refused a rest of "later" staying open with "Write rest as seconds or minutes, such as 90 s or 2 min.", added it with 20 kg (shown as 45 lb on the day) and 2 min, opened again from its name with what it had, and added Glute bridge from Could come next with its starting point; no sideways scroll; the only console error was that deliberate 400. Commit: build 1.0.26.

- **Asking what kind of program before making one** (17 Oct 2026; Glenn: "Before creating a new program, ask what kind of program they are think of creating so we can help recommend exercises better."). Build 1.0.25. Not from Next up. Built without a round of questions, as the shape was clear; the choices are easy to change. **The questions** (a first step, `KindForm` in `src/programs/Designer.jsx`, before the details form, which now has "Back to the kind of program"): what kind (`KINDS` in `server/programs.js`: Full body, every day the whole body, 3 days usual; Upper and lower, 4; Push, pull, legs, 3; A circuit, little rest, for conditioning, 3; Mobility and flexibility, 2), each with a line saying what it is; Days a week (1–6, the kind's usual chosen); Anything to focus on? (optional, any number: Legs and glutes, Upper body, Core, Balance and stability, Posture, Conditioning); How long is a session? (30, 45, 60, 75 or 90 minutes, 60 chosen). Next is greyed until a kind is chosen. The details step then has What it's for chosen to suit the kind (general, muscle, muscle, fat loss, mobility). **What the answers do**: the program is made with its days already (`startingDays`): Upper A, Lower A, Upper B, Lower B; Push, Pull, Legs (Push A … Legs B for six); Day A, Day B … for full body and mobility; Circuit A … for a circuit; each day stores what it trains (`DAY_KINDS`: Full body, Upper body, Lower body, Push, Pull, Legs, Circuit, Mobility, each a list of movement patterns, single-muscle work split by body part through the version's main muscles, "isolation-push", "-pull", "-lower"). **Add a day** continues the turn (`nextDay`: Upper C after Lower B), replacing `nextDayName`. A day's pencil can change what it trains. **Suggestions** (`suggestNext`) now take the day's own patterns rather than one list for every day: the day's movements and the program's focus in turn (focus patterns that the day trains, at most two a day, fewer for focus it already has; an upper or push or pull day never gets a lower-body focus, nor the other way round), each the best version passing the place, the level and the limitations as before; the reason says "A focus of this program: core." where it is one; the heading says "Could come next on an upper body day"; and when a day already has about as many exercises as the session holds (`MINUTES`: 30 → 4, 45 → 5, 60 → 6, 75 → 7, 90 → 8, from sets.md's 45–75 minutes) it says "This day has about as much as a 45-minute session holds." **The check** adds a note when a day has more than one over that many exercises, from Sets. The first try put all four of an empty upper day's suggestions into core work (the focus first, four core patterns); changed to taking the day's movements and the focus in turn with the focus capped at two, so a push-up and a row still lead. Day names were first "Upper body A"; shortened to "Upper A". **Stored**: new columns on `coach_programs` (`kind`, `days_per_week`, `minutes`, `focus` JSON) and `coach_program_days` (`kind`), added on start where missing (`COLUMNS` in `db.js`), so older programs read as full body. Checked on the server: an unknown kind, a focus not on the list, a session length not offered and 1–7 days. The program's line, the list and Billy's `my_programs` (kind, focus, session minutes, what each day trains) say them; Edit the details changes the focus and session length. Manual 5.1 (the steps rewritten), 5.2 and 5.5; CHANGELOG. **Tested** against the stand-ins: the vocabulary, the refusals, an upper and lower program of 4 days with a core focus and 45 minutes made with Upper A, Lower A, Upper B, Lower B, its upper day suggesting Push-up, Hollow hold (core), Bent-over dumbbell row, Bird dog (core) and its lower day Cossack squat, Hollow hold, Single-leg glute bridge, Bird dog; a push, pull, legs program with a legs focus suggesting Push-up, Arnold press, Dumbbell fly and Hollow hold on Push, rows, a pulldown, a straight-arm pulldown and a carry on Pull, and leg work on Legs; Add a day giving Upper C; 6-day push, pull, legs, circuit and mobility programs named as above; in Chromium at 400px dark and 1200px light, the first step (Next greyed until a kind, 4 days chosen for upper and lower), the goal chosen to suit it, and the designer showing "Upper and lower · 45-minute sessions · focus: core" with no console errors and no sideways scroll. **Not tested**: Billy's real use of it (no key in the cloud). Commit: build 1.0.25.

- **Making sure phones pick up the new icon** (17 Oct 2026; Glenn: "Can you make sure the icons gets updated?"). Build 1.0.24. Not from Next up. The icon redrawn in build 1.0.19 kept its old addresses (`/apple-touch-icon.png`, `/coach-app-icon-192.png`, `-512.png`), and a phone keeps a home-screen icon by its address, so it can go on showing the old picture. Studio meets this with `?v=2` on its icon addresses (its `index.html` and both `.webmanifest` files, with a note to raise it whenever the icons change); Coach does the same now: `index.html`'s apple-touch-icon is `/apple-touch-icon.png?v=2` with `sizes="180x180"`, the manifest link `/manifest.webmanifest?v=2`, and the manifest's icons `?v=2`, with a note to raise the number with any new icon. The manifest also gained the 512 px icon as `purpose: "maskable"`, as Studio has one, so Android can crop it to its own shape: the tile is full-bleed, and a check of the 512 px PNG found nothing white outside the maskable safe circle (40% of the width from the centre), so the hex is never cut. Express serves the files whatever follows the `?`. Not checked on the live site: the cloud session can't reach trainabilitycoach.com; Glenn checks https://trainabilitycoach.com/apple-touch-icon.png?v=2 after the deploy, then removes the icon from his home screen and adds it again. Commit: build 1.0.24.

- **The sign-in screen made Studio's: the email first** (17 Oct 2026; Glenn: "Can you make the login screen identical to Studio, checking email first as we will eventually let clients login here."). Build 1.0.23. Not from Next up. **Read from Studio** (unchanged): `src/auth/LoginScreen.jsx` asks the email first ("Please use the email you used when you signed up with {business}." in bold accent colour, the box with no caption, placeholder "Your email address", **Continue** saying "One moment…"), then `POST /api/auth/door`, whose answer is `password` for a team account (with `also` when that email is a client's or member's too) and `code` for everybody else, a client, a member or an address nobody has, answered alike so the screen can't be used to learn who is a client, and rate-limited by Studio (`checkDoorAllowed`, a 429 with Retry-After). Password: the email kept as a read-only field (so a password manager saves the pair), Password, Keep me logged in, Log in, Forgot password?, "Use a different email". Code: Studio's `CodeSignIn`, a client's or member's own page at /me. **In Coach**: `/auth/door` added to the relayed routes in `server/index.js` (now five; CLAUDE.md, README and the server's notes say so). `src/auth/LoginScreen.jsx` rewritten to Studio's steps: email (Studio's line with "Trainability" for the business, Studio's box, Continue/One moment…, "Type your email address first." for an empty or incomplete address, the @trainabilitystudio.com shortcut kept), then password as Studio's (and the old app's "Check your email" note kept), then Forgot password? as before with Back to login returning to the password step. **The client's way** ends, for now, at a card of its own, since Coach has no client sign-in yet: "Coach is for Trainability's trainers for now. Clients will be able to sign in here soon." and "If you train with us, your own page is in Studio. Open it and sign in there with {email}.", **Go to my page** (Studio's /me) and Use a different email. A first wording said a code had been sent; Studio's door sends none (its code screen does, when asked), so it was taken out. Left out of Studio's screen, for now: "I have a code" (a client's welcome-email code, for when clients sign in here), "Open my member page instead" (`also`), the demo-mode hint, the business name fetched from Studio (written as Trainability), and Studio's below-the-fold "about the app" panel and drifting hexagons. Manual 2.1 (the steps, and an email that isn't a trainer's), 2.3 step 1, chapter 8 "Type your email address first."; CHANGELOG. **Tested** in Chromium as an iPhone 13 against the stand-in Studio, taught `/api/auth/door` and `/api/auth/login`: Continue with nothing said "Type your email address first."; someone@gmail.com went to the client card with Go to my page pointing at trainabilitystudio.com/me; Use a different email went back; "glenn" became glenn@trainabilitystudio.com and went to the password step; a wrong password said "That email and password don't match."; Forgot password? and Back to login; the right password signed in to Home; no page errors. The relay answered the door directly with Studio's JSON. Commit: build 1.0.23.

- **"You belong here." on the sign-in screen, as in Studio, and no Open Studio link there** (17 Oct 2026; Glenn: "Can we have the same “you belong here animation” on the login screen like the studio has? Also, remove the “open studio” link"). Build 1.0.22. Not from Next up. **Read from Studio** (unchanged): `src/auth/PhraseCycle.jsx`, "You belong here." in twenty languages (English, Norwegian, Tagalog, then by number of speakers; each with its own sentence mark; right to left for Arabic and Urdu), a new one every 2,600 ms, held at English for reduced motion, the cycling text hidden from screen readers with one static line read instead, in a box of fixed height so the form doesn't jump; and its `iw-cycle` animation in `theme.jsx` (rising 5px and fading in over 0.55 s, off for reduced motion). Studio's sign-in shows the phrase under its lockup and no version there. **Ported**: `src/auth/PhraseCycle.jsx`, Studio's file with its notes and the BELONGING list as they are (its welcome-back list left out: Coach has no welcome-back screen), the class renamed `cx-cycle`; `cx-cycle-in` and `.cx-cycle` in `src/index.css`, off under reduced motion. On `LoginScreen.jsx` the phrase takes the place of the version line under the logo, as on Studio's (the version is still at the foot of the account menu); the foot of the screen keeps "Part of the Trainability family" without its "· Open Studio" link (the account menu keeps its Open Studio). Manual 2.1 step 2; CHANGELOG. **Tested** in Chromium as an iPhone 13: the line ran "You belong here.", "Du hører til her.", "Dito ka nabibilang.", "Este es tu lugar." about every 2.7 s, stayed on "You belong here." with reduced motion, the screen-reader line read "You belong here.", no Open Studio on the page, no page errors. Commit: build 1.0.22.

- **"Add to Home Screen" on the sign-in screen, as in Studio** (17 Oct 2026; Glenn: "Can you add the “add to Home Screen” like on Studio at the bottom of the login screen"). Build 1.0.21. Not from Next up. **Read from Studio** (`glennpineda/trainability-studio`, unchanged): `src/lib/install.js` (catches `beforeinstallprompt` at load, before any screen exists, so a Chrome/Edge/Samsung offer isn't missed; works out "prompt", "ios" or nothing: nothing when already running from the icon, in an app's own browser such as Instagram's, or on a browser with no install; "Not now" kept on the device for 30 days) and `src/components/InstallApp.jsx` (`InstallBanner`: a glass strip fixed along the bottom of the sign-in screen, phones and tablets only, "Add Studio 3 to your Home Screen" on an iPhone or iPad, which opens a dialog of three steps, "Install the app" where the browser can install, and an ×). Studio's manifest is `display: standalone` with the Apple capable tags, so it opens full screen from its icon. **Ported**: `src/lib/install.js` taken as it is (its notes pointed at Coach's manifest, the storage key renamed `cx-install-banner-hidden-until`), imported first in `src/main.jsx` as Studio does; `src/auth/InstallBanner.jsx`, Studio's strip and steps with Coach's words ("Add Coach to your Home Screen", "Coach appears on your Home Screen and opens full screen from there") and, since Coach has no `DialogShell`, a small dialog of its own (a sheet from the bottom on a phone, Escape and × close it, OK); on the sign-in screen after the form. **Changed from build 1.0.20**: the manifest's `display` from `browser` to `standalone` with `scope: "/"`, and `apple-mobile-web-app-capable`, `mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` in `index.html`, as Studio has them: Chrome only offers an install for a standalone app, and Studio's steps promise full screen. The server sends the manifest as `application/manifest+json`. Manual 2.6 "Putting Coach on your Home Screen"; CHANGELOG. **Tested** in Chromium: as an iPhone 13 (touch, with Chromium's own install offer hidden, as Safari has none) the strip said "Add Coach to your Home Screen", opened the three steps, OK closed them, × hid the strip and it stayed hidden after a reload; as an iPhone with Chromium's offer left in, it said "Install the app", so the manifest is installable; on a 1200px desktop nothing showed; no console errors but the signed-out check's 401. **Not tested** on a real phone. Commit: build 1.0.21.

- **"Coach" as the name on the home screen** (17 Oct 2026; Glenn: "Can we also make the default name for the “add to Home Screen” to be “Coach” only?"). Build 1.0.20. Not from Next up. Safari offers the page's title ("Trainability Coach") unless the page names itself: `index.html` now has `<meta name="apple-mobile-web-app-title" content="Coach">` (Safari's Add to Home Screen) and `<meta name="application-name" content="Coach">`, and a new `public/manifest.webmanifest` (name "Trainability Coach", short_name "Coach", start_url "/", the 192 and 512 px icons, theme Cerulean, background Navy) for Android, linked from `index.html`. Its `display` is `browser`, so adding it to a home screen still opens Coach in the browser as before, not as a separate app window; that is a choice for another day. The browser tab keeps the full title. The built page carries both (checked in `dist/`). CHANGELOG (the icon bullet). Not tested on a phone: a cloud session has none; after the deploy, Glenn removes the icon and adds it again. Commit: build 1.0.20.

- **The app icon, drawn like Studio's** (17 Oct 2026; Glenn, with a photo of his phone's home screen showing Studio 3 and Trainability Coach side by side: "Can you design the app logo more like the studio app logos, smaller hex, white hex background and blue c and chevron"). Build 1.0.19. Not from Next up. **What the phone showed**: Studio's home-screen icon is a dark purple gradient tile with a white hex and a two-tone purple S; Coach's was `public/apple-touch-icon.png`, the Cerulean badge on a transparent background, which iOS fills with black, so a big blue hex on black. **Measured from Studio's icon** (`src/assets/studio-app-icon.png`, 192 px): the white hex spans about 69% of the tile, and the tile runs from (77,43,100) at the top left to (42,26,56) at the bottom right. **Drawn**: `brand/app-icon/coach-app-icon.svg` rewritten as Studio's way, a full-bleed square with a gradient from #0B4F6E (the sign-in screen's middle blue) to Navy #172A3A, top left to bottom right, the badge's own white hex, Cerulean C and Sky chevron scaled about the centre; a first try at 0.9455 (Studio's 69% of the height) looked smaller than Studio's beside it, because Studio's hex is wider for its height and its S fills more of it, so it went to 1.02 with the C's stroke 80.67 → 94 and the chevron's 55.2 → 64. Not pre-rounded, as the brand README says (the phone rounds it). Rendered with the session's Chromium from the one SVG to every size in `brand/app-icon/` (48, 64, 80, 87, 120, 152, 167, 180, 192, 512, 1024), and to `public/apple-touch-icon.png` (180, the home screen), `public/coach-app-icon-192.png` and `-512.png`, and `src/assets/coach-app-icon.png` (the apps panel beside Studio's). A preview beside Studio's, rounded as a phone does, was shown to Glenn. The favicon (the browser tab) and the badges and lockups are unchanged. `brand/README.txt` says how the icon is drawn and where its copies go; CHANGELOG. **Glenn's to do**: an iPhone keeps the icon it was given when Coach was added to the home screen, so remove it and add it again from Safari (Share → Add to Home Screen) after the deploy. Commit: build 1.0.19.

- **The program designer: Programs, with Coach IQ at every step, printable for the client** (17 Oct 2026; Glenn: "We need to start creating a workout program designer so we can start testing Coach IQ in real time, what do you suggest we do to start this?", then "Ask me one by one and recommend answers", then "Go"). Build 1.0.18. Not from Next up. **Proposed first**: a thin first slice (a program for one client, days, exercises with optional details, Billy's help, a check that cites Coach IQ) with five questions. **Glenn's answers**: (1) the id tags **prg** (a program), **prd** (a day), **pre** (an exercise on a day), as recommended; (2) **"Only the trainer who wrote it"** sees a program (I had recommended all the client's trainers reading it); (3) on load: **"Weight and/or effort should just be optional, what exercise to do is the most important part"**, so on an exercise only the exercise is needed and sets, reps, load, effort, tempo, rest and a note are all optional free fields; (4) Billy **"Day by day, and even as we build exercise by exercise it would be good to recommend as the trainer designs. That's the whole point of being an assistant is being there at every step"** (not the whole draft at once I had recommended); (5) **"Printable for the client"** (not trainer-only for now, which I had recommended). **How "at every step" was built**: Coach IQ's help is worked out in code on every change, instantly and at no cost, and Billy is there to talk it over. `server/programs.js`: `GOALS` (Strength, Power, Muscle size, Strength endurance, Fat loss and conditioning, General fitness, Mobility), each with a starting dose and the reps and rest ranges the check uses, taken from the principles (reps' table, rest's table, sets' "reps and sets go opposite ways" and its set window); `check()` runs over the whole program and gives points of three levels, each naming its source: **stop** (an exercise needing equipment the place doesn't have, from the library's own `placeCheck`, and one the client's limitations say to avoid, from `limitsCheck`, both now exported from `library.js`), **warn** (make easier or supported for the client's limitations, an exercise above the client's level, retired from the library, a day of about 30+ sets, or 36+ for a beginner) and **note** (no place chosen; a beginner with more than 4 days; equipment nobody has answered about; reps outside the goal's range; under 8 reps for a beginner; rest outside the goal's range, not counted on a superset's first half; a tempo not written as 3 or 4 numbers, or a strength set over 60 seconds of work; 25+ sets on a day; more than 7 exercises on a beginner's day; a main lift after an accessory, from the library's roles). A trainer's own exercise is checked only for its equipment. `suggestNext()` (Could come next, under each day): for each movement pattern the program doesn't have yet (squat, hinge, horizontal push, row, single-leg, overhead push, vertical pull, carry, two kinds of core; mobility, breathing and balance for a mobility program), then the ones the day doesn't, the best version that passes the place, the level and the limitations, ranked by the goal's purpose, the role wanted (two main lifts a day, then accessories), nothing to ask first, nothing to modify and closeness to the client's level, with a starting dose from `doseFor` (beginners get a 1–3 set window and at least 8 reps; accessories a set less). `swapsFor()` is `alternativesFor` with the program's place, level and limitations. The trainer's own names show in place of the library's everywhere (their word wins). Rest is typed as "90", "90 s", "2 min" or "1:30" and kept in seconds; anything else is refused in words. Tables `coach_programs` (client name kept for the list and the print), `coach_program_days`, `coach_program_exercises` (`superset` 1 = done with the one above, ignored on a day's first exercise). Routes: `GET`/`POST /api/programs`, `GET`/`PATCH`/`DELETE /api/programs/:id` (delete archives), `POST /api/programs/:id/days`, `PATCH`/`DELETE /api/program-days/:id` (with `move`), `GET /api/program-days/:id/suggestions`, `POST /api/program-days/:id/exercises`, `PATCH`/`DELETE /api/program-exercises/:id` (with `move`, `superset`, a new `exerciseId` to swap), `GET /api/program-exercises/:id/swaps`, `GET /api/programs-find` (their names, their own exercises, the library, as Billy finds them). Every one answers with the whole program, checked again; another trainer is told Not found; a client must be on the trainer's own list and a place one of theirs. **Billy**: a new `my_programs` tool (the list, or one program with its days, Coach IQ's check and what could come next on each day) and a prompt line: read the program first, suggest only from what could come next and from alternatives, work from the check, say plainly what is to stop, dose only from the principles, and change nothing (his hard rule now says not even their programs). **The screens**: Programs on the bottom bar and on Home is built (`sections.js`). `ProgramsTab.jsx` lists the programs (newest change first; Put away archives) and starts one (client, name filled as "Avery's program", what it's for, the client's level, where they train, defaulting to their first place once the places have come, notes). `src/programs/Designer.jsx`: the details and Coach IQ's check counted at the top (program-wide points there, the rest where they apply), each day a card (move, rename with a note, take out), each exercise numbered (a superset 2a, 2b) with its dose in a line in the trainer's units, its points, **Sets, reps…** (all optional, and the superset tick), **Swap**, move and take out; **Add an exercise** (the finder); **Could come next** with **Add**, which puts the exercise on with its starting dose; **Ask Billy about it** and **Ask Billy about Day A**, which open his panel with the question asked; **Add a day** (Day B, Day C …); **Print for the client**. `PrintProgram.jsx` at `/print/program/<id>` (App renders it alone): TRAINABILITY® COACH, the program's name, who for, its goal and date, each day's exercises in the trainer's names with only the columns something was written in, loads in their units, supersets explained, tempo explained; white on paper whatever the theme, its own Print button hidden in print (`@media print` in `index.css`). Manual: a new chapter 5 "Designing programs" (5.1–5.6), Billy, Words and When something goes wrong renumbered to 6, 7 and 8, 3.3 and 3.4 for a built Programs, 6.5 a point on programs, Words "Program"; CHANGELOG; README "Programs". **Tested** in the cloud against the stand-ins (Studio with a Primary Master, a trainer and one client; Claude): by the API, a program refused for an unknown goal or a client not theirs, made with its Day A, suggestions for a beginner with a new knee at a place with dumbbells and a bench but no barbells (Bodyweight squat marked make-easier for the knees, Glute bridge, Wall push-up, One-arm dumbbell row, each 1–3 × 8–12, rest 75 s for muscle size), rest "later" refused, the check's stop for a barbell back squat (no barbells) and a jump squat (to avoid), its warnings and notes (level, limitations, 35 sets on a day, reps and rest outside muscle size's ranges, a tempo "slow"), swaps for the back squat, moving, a superset, a swap, a second day, another trainer refused everything, and Billy's tool returning the program with its check; in Chromium at 1200px light and 400px dark, the whole path from New program through taking a suggestion, finding two exercises, filling in a dose as a superset (2a, 2b, the load typed in kg shown in pounds), swapping, adding a day, asking Billy and the printed page, with no console errors and no sideways scroll. Found and fixed while testing: a new program wasn't taking the first place (the places came after the form), 90 seconds read "1.5 min", the superset mark showed on a day's first exercise after a move, a tempo word was shouted in capitals, the place's name read oddly in a sentence, and the printed numbers wrapped at phone width. **Not tested:** Billy's real answers about a program (no key in the cloud), printing on paper (the page was checked on screen), and the designer against Studio's real clients. The manual has no pictures of it yet; `npm run screenshots` on the Mac can add them. Commit: build 1.0.18.

- **Units: imperial or metric, each trainer's own, rounded to gym steps** (17 Oct 2026; Glenn: "On the IQ, I see some of the books recommend in imperial and kg… let's default by metric and lbs. but let's have a setting where we can change this. Let's try to round up numbers on both denominations"). Build 1.0.17. Not from Next up. **Asked first**, since "metric and lbs" and "both denominations" could be read more than one way, four questions with recommendations; Glenn chose **All imperial** as the default (not my recommendation of metric with pounds for weight), **Only the chosen unit** (not both side by side, which I had recommended), **To gym-friendly steps** (as recommended) and **Each trainer only** (not the installation default plus each trainer I had recommended). **The converter**, `src/lib/units.js`, pure and shared by the page and the server: `convertText(text, "imperial" | "metric")` finds numbers written with a unit (lb, kg, yd, m, ft, inches as "inch"/"inches" only, cm, mi, km, their words and plurals, "1,000", ranges with "–", "-" or "to") and turns those in the other system into the reader's, rounded with `roundTo`: pounds to 5 (1 under 10), kilograms to 2.5 (1 under 10), metres and yards to 1 under 10, 5 under 100, then 10, kilometres and miles to 0.5 under 10, then 1, centimetres, inches and feet to 1. Lengths choose a readable unit: under 5 m becomes feet, centimetres of 36 inches or more become feet, feet and inches become centimetres, or metres from 3 m. A unit already in the reader's system is left as written, a percentage, "1 in 3" (bare "in" is never read as inches) and minutes are never touched. Tried on sample lines: "Carry 20 kg for 30 m" becomes "Carry 45 lb for 35 yd"; "a 400 m run" becomes "a 440 yd run" and back to "400 m" in metric; "20 to 30 kg" becomes "45 to 65 lb"; "2 m box" becomes "7 ft box". **Each trainer's choice**: new table `coach_trainer_settings` (trainer id and name as its key, so no id tag was needed), `server/trainer-settings.js` (imperial until chosen), `GET` and `PUT /api/my-settings` (anything but imperial or metric refused, "Choose imperial or metric."). On the page, `src/hooks/useUnits.js` asks once and shares the answer with every screen, so choosing redraws them at once; the account menu has **Units** with **Imperial** (lb, ft) and **Metric** (kg, m) side by side, the chosen one blue. `Prose.jsx` draws the principles and a book's proposals in the reader's units, while Edit shows the text as written. **Billy** is told the trainer's units in his prompt (every weight and distance in theirs, whatever a source used, rounded to gym steps, never both units), and `coach_principles` returns the text converted. **Books** now write every amount in imperial, already rounded, so stored text is consistent. Manual 3.5 (Units), 3.9 and 5.5; CHANGELOG; `coach-iq/README.md` "Units". **Tested** in the cloud against the stand-ins again: the setting defaulted to imperial, refused "stone", was kept per trainer (another trainer stayed imperial), and refused anyone signed out; Billy's prompt said "They work in imperial" then "metric", and his principles tool gave "440 yd run" then "400 m run"; in Chromium at 1200px light and 400px dark, choosing Imperial and Metric in the menu changed the Designing a program page at once, and the choice held after a reload, with no console errors. **Not tested:** Billy's real answers in each unit (no key in the cloud). The manual's picture of the account menu (04-account) is now behind, as it has no Units yet; `npm run screenshots` on the Mac will retake it. Commit: build 1.0.17.

- **All three next steps for Coach IQ: the principles move into the app, Billy reads them, and a book is read in the app** (17 Oct 2026; Glenn: "Do all 3", after I listed them as the natural next steps when committing build 1.0.15). Build 1.0.16. Not from Next up. Two decisions asked first, with recommendations: the id tag for a book read in the app (Glenn: "iqb", matching iqr) and the model that reads books (Glenn: "Opus 5.5", over Sonnet 5.5 like Billy, because a book is read once and becomes Coach IQ; `BOOK_MODEL` overrides it). **1. The principles in the app.** They join the library in `coach_iq_docs` as kind `principle`, keyed by topic (`rest`, `starting-out` …), each `{ key, title, covers, body, status, reviewed, sources }`, so they share the library's checks, history (`lih…`), undo and export. New `server/principles-files.js` reads and writes the files: the title from `# Title`, `covers` from the line in `principles/README.md`'s table, and the status line, which had to change to be read back: the eleven files' "_Status: reviewed by Glenn, 17 Oct 2026 (from the first book)._" became "_Status: reviewed, 17 Oct 2026. From: Program Design (Paul Chek, 2011)._" (several sources joined with "; "); every file was checked to come out of `principleText` exactly as it went in. `iq-store.js` reads them in `fromFiles()`, and since the library was already live with rows, `load()` loads the principles from the files on their own the first time there are none, with a history record "Loaded the principles from the files: 11 topics"; `find`, `withChanges` and undo's "has changed since" message know the kind. `iq-check.js` checks each principle (key shape, unique, title, covers, a body of at most 40,000 characters, no status line inside the text, sources a list, draft or reviewed with a date). `npm run check-iq` checks the files too and now says "11 principles", and `npm run iq -- --import <export>` writes an export's principles back into the files and rewrites the README's table (tried on an export from the test server, then the files were put back). `iq-edit.js` has `principleFrom` (title, covers, Markdown body; key from the title the first time, never changed); `reviews.js` takes `principle` as a third kind of mark. Routes: `GET /api/coach-iq/review/principles`, `PUT` and `POST /api/coach-iq/library/principles`, and the review mark route takes `principle`; the review summary counts them. On the page, **Principles** sits between Conditions and Suggestions: the topics down the side (a Draft badge, a flag), the chosen one drawn from its Markdown (new `src/review/Prose.jsx`, a small reader that makes elements, never HTML: headings, paragraphs, "- " and "1. " lists with wrapped lines, tables, bold, italic, and a link to another topic's `.md` opening that topic), a line saying when it was reviewed and from which books, Edit (`PrincipleForm` in `LibraryEditor.jsx`: title, what it covers, the text in a textarea, with a line on how to write headings, points and bold), History, Approve and Flag, and **+ Add a topic**; a third count and bar for principles at the top. **2. Billy reads them.** New tool `coach_principles` (`server/principles.js`): no topic gives the list of topics and what each covers, a topic (key or title, loosely) gives its text. Only reviewed topics, never a draft, which is Coach IQ's rule that nothing goes in until reviewed; a flag puts a topic back to draft and so out of his reach. His prompt gained a line: before advising on reps, sets, load, tempo, rest, how often, planning over weeks, a beginner, or a woman or teenager, read the principles and work from them, say when he goes beyond them, the trainer's word wins, and Coach IQ doesn't cover children. His rounds went from 6 to 8 to leave room for the list and a topic. **3. Reading a book in the app** (new `server/books.js`, `src/review/Books.jsx`; the proposal of 16 Oct 2026 in `coach-iq/README.md`). Review Coach IQ → Books, the Primary Master's. The PDF is the request's own body (`POST /api/coach-iq/books`, `Content-Type: application/pdf`, its name in `X-File-Name`), streamed to the files folder (`books/` under Installation's folder) with a 100 MB cap counted as it arrives, then opened with `pdf-lib` (1.17.1, added; the only way to count and cut pages without a native tool) to count its pages; anything that isn't a PDF is refused in words. One `coach_iq_books` row (`iqb…`) keeps the file name, pages, parts, status (waiting, reading, ready, done, failed, discarded), the step in words, the notes, what the book is, the proposals, the model and the tokens used. The reading, one thing at a time in an in-process queue, each step saved so a restart carries on (`resume()` on start): the PDF is cut into parts of 40 pages, a part over 18 MB halved until it fits; each part is read for notes in our own words (structured output: the book's title, author, edition and year if the part shows them, and the notes, with DATED, ONE VIEW and DISAGREES marks); then the topics the book adds to are chosen from all the notes and the principles as they stand (existing keys, or a new topic made a proper key); then each topic is written again (the whole text, what changed, and open points, each with two to four options, the recommended one and why, marked in the text as **Open for Glenn (n)**). Every request is streamed (they are long), at effort high, and its system prompt says the book is learned from, never copied (no sentences, tables, lists, headings or branded systems; facts and ranges in plain words), that Coach IQ covers adults and teenagers, and that lines recording a decision, written (Name, date: "words"), are kept whatever the book says, raised as an open point if it disagrees. When read, the PDF is deleted. The page: an upload card (the bar shows the PDF going up; without Billy's key it says reading needs it), then a card for each book with its state, a bar while reading, the step ("Reading part 2 of 3 (pages 41–80)"), topics decided, tokens read and written, and **Go through it**, **Try again** (failed) or **Put away** (the PDF goes and nothing more is accepted; the row stays, archive rather than delete). Going through it: what the book is and what it adds, then a card for each topic, marked Changes or New topic, with what changed; its open points one at a time ("Point 1 of 2"), the recommended answer chosen already and marked **(recommended)** with why, or **Or in your own words**; **Next point** saves the answers, **Write it up** saves them and queues the write-up, in which the answers are written in as (first name, date: "answer") and nothing else changes; then the text as it would go in, **Accept** or **Reject**, **Change the text first**, **Read the proposed text** / **Read the topic as it was**. Accept saves through `store.change` as reviewed today with the book's label ("Title (Author, Year)") added to the sources, history "From <title>: changed the principles on <topic>"; it is refused if the topic changed since the book was read (the proposal keeps the text it was based on), so a change made meanwhile is never lost, and refused while the text still has an **Open for Glenn** in it. When every topic is accepted or rejected, the book is Done. The write-up's date is the UTC day, the same one an approval is dated with (first written with Pacific time, which gave 16 Oct beside an approval of 17 Oct in testing). Manual 3.9 (three counts; a new step 7 for Principles, steps renumbered), a new 3.11 "Reading a book into Coach IQ (Primary Master only)" in the contents, 5.5 a point on the principles, and four messages in chapter 7; CHANGELOG three bullets under 1.0 Caesious; README (Billy, the database, `BOOK_MODEL`); `.env.example` `BOOK_MODEL`; `coach-iq/README.md` (the book section rewritten as built, How it is written, Files), `principles/README.md`, `READ.md`. **Tested** in the cloud against stand-ins in the session's scratchpad (Studio's sign-in on 4242 with a Primary Master and a trainer; Claude on 4243, through `ASSISTANT_API_BASE`, answering each kind of request with fixed JSON, streamed as server-sent events, and logging what each request carried), on a scratch SQLite database: the principles loaded (11, all reviewed); a trainer was told Not found; an edit, an edit refused for an empty text and for a status line inside the text, undo, flag (back to draft), approve, a new topic (draft) and the export with its principles; Billy listed and read topics, by key and by title, and was refused the draft; a made-up 90-page PDF was refused to a trainer, a JSON body and a non-PDF were refused in words, and the PDF was read in three parts (40, 40 and 10 pages, each request with Opus 5.5, streamed, effort high, JSON schema, the PDF as a document), planned into Rest and a new Warming up, written as two proposals, and deleted from the files folder; writing up before answering and accepting before writing up were refused; an answer in his own words written in; accepting refused after Rest had been changed meanwhile, then accepted once that change was undone, with the book in Rest's sources; a new topic's text changed and the topic rejected; the book then Done. In Chromium at 1200px light and 400px dark: Principles (the table drawn, Edit's text), uploading, the bar, going through, the recommended answer chosen already, Write it up, Accept and Reject, with no console errors and no sideways scroll. **Not tested:** a real book with the real Opus 5.5, since there is no key in the cloud: how good the notes, topics and open points are, how long a 300-page book takes and what it costs are for Glenn's first book in the app; a restart in the middle of a reading (the code carries on from the saved step, but it was not tried); and MariaDB on the host, where the new table is made on start like the others. Commit: build 1.0.16.

- **Coach IQ's first principles, from book 1** (17 Oct 2026; Glenn: "Here is the first part of book 1", "Here is part 2 of book 1", "Ask me one by one and recommend answers", then "Commit as reviewed"). Build 1.0.15. Not from Next up. **How the book came in**: Glenn first found the chat refused the whole PDF ("it says it's too many pages"); I suggested splitting it on his Mac (Preview → Print → a page range → Save as PDF) rather than building in-app book reading first, so the first book could teach us what a book turns into. He sent it in two PDFs: pages 1–100 and 101–129. Read 20 pages at a time with the Read tool's page ranges. The book: *Program Design: Choosing Reps, Sets, Loads, Tempo and Rest Periods*, 2nd edition (2011), Paul Chek, a correspondence-course manual; the teaching is pages 10–92, then references, the course exam (questions 1–100, running into part 2), order forms and the author's biography. **Copyright**: its copyright page forbids reproducing it and asks that its concepts not be used in paid programs without permission. I told Glenn before drafting; his standing decision (16 Oct 2026) is to learn from books and write Trainability's own, no sources shown. So the files are general training principles in our own words: none of the book's text, tables (rep-to-fibre estimates, sport energy table, eccentric percentages) or named systems was copied, and the book is named only in `coach-iq/READ.md`, which is for Glenn alone. **The outline**: as `coach-iq/README.md` ("How it is written") says, the first book sets it: one file per topic, put in a new `coach-iq/principles/` folder (with its own README listing them): `terms.md` (the program variables, volume/intensity/density, effort written as reps in reserve from the book's "−1/−2" notation, training age, kinds of strength, muscle actions and roles, station and circuit), `designing.md` (a health questionnaire first, from an exam question; nine guidelines; matching energy demands, without the book's sport table), `reps.md` (1–5 / 6–12 / 12–20+ and what each develops, very heavy sets, skill learning, the first year), `sets.md` (inverse to reps, building from 1–2 sets, per-session limits, the set window, cut sets not intensity), `load.md` (progression kinds, loading methods, eccentric work's uses and cautions), `tempo.md`, `rest.md`, `periodization.md` (phases, straight-line vs waves vs accumulation/intensification, 2:1 and 3:1 light weeks, tapering), `frequency-and-variety.md`, `starting-out.md`, and `women-and-teenagers.md`. **Dated or one-coach claims** were drafted as ranges with an "Open for Glenn" line (twelve, the twelfth from part 2), and Glenn went through them one by one with my recommendations (AskUserQuestion, one at a time). His answers: 1, a client's level and an exercise's level are **"One shared scale"** (not my recommendation, which was to keep training age separate and named); 2, the fibre-type estimate from reps at 75% **"Leave it out"**; 3, the nervous system's slower recovery kept **without the book's number**; 4, session length **"Add a loose time guide"** (45–75 minutes, a rough planning guide, set count matters; the book's 30–45 minutes for hormones dropped; not my recommendation, which was the set limit only); 5, eccentric work **"Principle only"** (three stages, trainer sets numbers; the book's six-step named progression not used); 6, tempo **"Read both, write four"** (lowering–bottom pause–lifting–top pause; three numbers read as no top pause); 7, rest ranges kept, **hormone reason dropped**; 8, tapering by **size and event length only** (men-taper-longer dropped); 9, contraction mix in **words, no 70/20/10**; 10, very heavy loads **"By technique and supervision"**, not after a fixed 1–2 years; 11, women: **"Program the person"** (the book's cycle-timing and sex-difference specifics dropped); 12, children: **"No youth training in Coach"** (not my recommendation of supervised from about 7–8): Coach IQ covers adults and teenagers only, so the file became `women-and-teenagers.md`, children's play and start ages removed, teenage guidance kept, and "children's training" in `load.md` became teenagers'. Each answer is written into its file in Glenn's words, replacing its Open line. Part 2 added two points from the exam: the health questionnaire, and slower nervous-system recovery; a few exam claims were left out as unsound (the best time to train being when cortisol is highest). Glenn then chose **"Commit as reviewed"**: every file says "reviewed by Glenn, 17 Oct 2026 (from the first book)"; `principles/README.md` says a later book's additions are drafts until he has reviewed them. `READ.md` records the book, the outline it set, that nothing was copied, the twelve settled points, and the copyright notice with Glenn's decision. `coach-iq/README.md` points at `principles/` in "How it is written" and Files. Review copies were sent as single combined files from the scratchpad. **Not yet done**: Billy doesn't read the principles; they are files in the code, not in the app's database like the library. Both are the natural next steps, for Glenn to choose.

- **The deploy that rolled back: a leftover postcss.config.js on the host** (17 Oct 2026; Glenn: "I'm getting this error when I deploy", with Airo's log: "This version did not become healthy, so production was rolled back to the previous version (d5b87c978e2eac0503a83db511bc8f4eebc05102)"). Build 1.0.13. Not from Next up. **What the log showed**: build 1.0.12's `npm start` ran `vite build` (Vite 8.3.4), which failed in `vite:css` on `src/index.css` with "[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin … install `@tailwindcss/postcss`", so the server never started and Airo went back to the version it had been serving, which turned out to be 0.1.0 (Vite 5.4.21), from before the move to Vite 8 and Tailwind 4. **Why**: the same log says `Skipping cleanup (cleanAppDirBeforeExtract: false)` and `Extracting archive to: /app`: Airo unpacks each deploy over the last without emptying the folder. 0.1.0 shipped a `postcss.config.js` (`plugins: { tailwindcss: {}, autoprefixer: {} }`, from commit 1c55d2f) and a `tailwind.config.js`; both were deleted from the repository in 098b08f ("Vite 8 and Tailwind 4"), but stayed in `/app` on the host. Vite looks for a PostCSS config file whenever none is set in its own config, found the old one, and ran Tailwind 4's package as a PostCSS plugin, which it refuses. Nothing in 1.0.12's own code was wrong; any build after the Tailwind 4 move would have failed there the same way. **Reproduced** here: the repository at HEAD in a scratch folder, with 0.1.0's `postcss.config.js` and `tailwind.config.js` written back in, failed `vite build` loading that config (here on the missing `autoprefixer`, which the host still has from 0.1.0, hence its error reaching Tailwind instead; the same cause). **Fix**: `vite.config.js` sets `css: { postcss: { plugins: [] } }`. Given PostCSS settings of its own, Vite never searches for a config file, and Tailwind 4 runs as the `@tailwindcss/vite` plugin, needing no PostCSS. With both leftover files present the scratch build then succeeded, and the CSS it wrote has the same hash (`index-Cjmn8mSK.css`, 29.16 kB) as the build without the fix, so nothing else changed. README (Deploying) says why the setting is there. A leftover `tailwind.config.js` is harmless: Tailwind 4 reads one only when the CSS names it with `@config`. If Airo has a setting to empty `/app` before unpacking (`cleanAppDirBeforeExtract`), turning it on would also stop other deleted files lingering; that is Glenn's to look at, not needed for this fix. **Deployed** by Glenn the same day, who checked the live site against a list (health showing 1.0.13 on mysql; the account menu's four pages; Installation saving in /private/trainability-coach; Review Coach IQ → Changes starting with "Loaded from the files: 139 families, 301 versions, 14 conditions"; Billy once the key is set) and reported: "Everything looks good". A cloud session can't reach trainabilitycoach.com, so the check was his. This was also the first deploy since 0.1.0: every build from 1.0.1 to 1.0.13 went live together.

- **The library in the app, not the code** (17 Oct 2026; Glenn: "So we have to keep committing here to update the library? We have to keep committing? Is there another way so it's app controlled?", then "Yes, use LIH", then "Brainstorm"). Build 1.0.12. Coach IQ's exercise library and conditions table moved from `coach-iq/exercises.json` and `conditions.json` into Coach's own database, edited on Review Coach IQ, with a history to undo. **The checker, shared**: the rules in `scripts/iq.mjs` moved, unchanged, into `server/iq-check.js` (`checkLibrary({movements, exercises, conditions})` → problems, master names and easier steps; it no longer writes `master` onto what it's given, which the script did), so the app and `npm run check-iq` run the same rules; one word changed, "same master name" became "same full name". `iq.mjs` now uses it, and its `--apply` (writing downloaded review marks into the files) gave way to `--import <file>`, which writes an export from the app into the files. `conditions.json` is written in its hand-made layout (a field to a line, each fact list on one line) by `conditionsText`, checked by importing the files' own contents and getting no diff at all. **The store**, `server/iq-store.js`: tables `coach_iq_docs` (kind "family", "exercise" or "condition"; its id or key; `pos` for the files' order, new rows last; `data`, the same JSON as the files; MEDIUMTEXT) and `coach_iq_history` (lih… ids, Glenn's tag: summary, `changes` as JSON with each touched row before and after, who, when, `undoes`, `undone_by`). The library starts as the files in memory, so Billy and the screens work even if the database never answers; `load()` (on start, after `reviews.load()`) reads the table, and the first time, with it empty, fills it from the files, writing in any approvals and flags already made under "App now, file later" (so none is lost in the move), with one history row "Loaded from the files: 139 families, 301 versions, 14 conditions" that can't be undone. `change(changes, who, summary)` builds the whole library as it would be, runs `checkLibrary`, refuses with `Refused(problems)` if anything is wrong (nothing written), else writes each row and one lih row and swaps the library in memory; listeners rebuild (`library.js`: families, versions, search keys, easier steps; `limitations.js`: the conditions). `undo(id)` checks each touched row still matches what the change left (else refused: "… has changed since. Undo the later change first."), then applies the befores as a new change, which `undoes` the old, marked `undone_by`; undoing an addition removes the row. `history({id})` finds a row's changes; `exportLibrary()` gives the files' shape. Writes are one after another, not in a transaction (db.js has none); a failure halfway is unlikely and the next start reads what was written. **Editing**, `server/iq-edit.js`: `vocabulary()` (every word list the editor offers), `versionFrom` (only known fields, tidied lists, optional fields left out rather than empty, unknown existing fields kept; a renamed version gets its old name in `formerNames`, so a program using it is still understood, and search still finds it), `familyFrom`, `conditionFrom` (key from the label, lowercase with hyphens), and `easierChanges` (choosing a version's easier steps means adding it to their harder lists, since easier steps are never stored). **Routes**, all the Primary Master's: `GET /api/coach-iq/library/vocabulary`; `PUT` and `POST /api/coach-iq/library/exercises` (with `easier`), `PUT …/exercises/:id/retired` (retire, or bring back as a draft); `PUT` and `POST …/families` (a new family comes with its first version: a family can't be empty); `PUT` and `POST …/conditions`; `POST …/suggestions/:id` (a trainer's suggestion made a version: their names tied to their own exercise are tied to the library's, and theirs is archived with `accepted_into`); `GET …/history` and `POST …/history/:id/undo`; `GET …/export`. New ids come from `freshId`, which skips any already in the library. A refusal answers 400 with "That would break the library, so nothing was saved." and the reasons; a refused undo says "That change can't be undone just now.". The Approve/Flag route now writes the status into the library too (approve: reviewed, dated today; flag, or taking back an approval: draft), as a change of its own ("Approved Goblet squat"), so `--apply` and Download reviews are gone and `reviews.exportMarks` with them. **A column on a live table**: `accepted_into` on `coach_private_exercises`, which went live in build 1.0.9, so `CREATE TABLE IF NOT EXISTS` couldn't add it; `db.js` gained `COLUMNS` and `hasColumn` (PRAGMA on SQLite, information_schema on MySQL), adding each missing column once on start. **The page**: `src/review/LibraryEditor.jsx` (the forms for a version, a family and a condition; chips; a search-to-add picker for easier and harder steps; a list of changes with Undo; the refusal shown in a pale red box) and `src/tabs/ReviewTab.jsx`: each card gets Edit, Retire or Bring back (retired cards stay in their family, faded, marked Retired, with no Approve/Flag), and History (its changes under it, each with Undo); Edit the family under the family's name; + Add a version of …, + Add a family (two steps: the family, then Next: its first version, then Add the family; going back keeps what was typed); conditions get Edit and + Add a condition; Suggestions get Add to the library (the version form, family chosen); a new **Changes** tab lists every change with Undo; **Export the library** replaces Download reviews. Manual 3.9 rewritten as "Reviewing and editing Coach IQ" with a table of what to tap. `coach-iq/README.md` has a new section, "The library lives in the app", in Glenn's words. **Tested** on scratch SQLite with the mock Studio, through the API: a trainer gets 404 on every route; loading from the files once and its history row; renaming (old name kept and still found by search); a level change refused with the reasons; adding a version, refused at intermediate with no easier step, then saved with one; retiring (no longer offered) and bringing back; adding a family with its first version (first refused because the library already has a "Wall sit"; the check worked) and editing it; adding a condition and a bad one refused; Approve writing reviewed and today's date into the library, Take back making it a draft; a trainer's suggestion added, their name following it to the library and their own copy gone; undo of a family edit, a family addition refused while it had been edited since, then allowed, then refused a second time; export; `--import` of the export (only the new rows changed in the files) and of the files' own contents (no diff), files restored after; a restart reading the library and history back from the database. In Chromium at phone width: rename, the refusal box, a card's history, retire and bring back, add a version, edit a condition, undo from Changes, and a new family in two steps; no page errors beyond the expected 400 of the refused change. Untested: MariaDB (MEDIUMTEXT and the information_schema column check), and two app processes editing at once (Airo runs one).

- **Studio's look: Roboto, its heading sizes and its button levels** (17 Oct 2026; Glenn asked "Are using the same font as studio? Same design conventions on font sizes and buttons?", and after the comparison, "Yes go ahead"). Build 1.0.11. Not from Next up. **What was different**, read from Studio's `src/theme.jsx` and CONTRIBUTING.md ("Buttons and links"): Studio loads Roboto from Google Fonts and sets it throughout (Glenn, 3 Oct 2026: "Roboto throughout"); Coach loaded no web font, so it showed the device's own (San Francisco on Apple), with Roboto only a fallback. Studio shows `font-semibold` as 500 (Roboto's 600 is nearly bold) and sets headings in `.iw-display` (Roboto 500, each Tailwind size about a fifth smaller: text-2xl is 20px); Coach's page titles were 24px bold. Studio has eight control levels (primary gradient pill with a glow, ember, quiet outline over a pale wash at 12px, row, link with an icon and no underline, quiet grey text, view, icon square); Coach had a flat 10px primary, links that underlined on hover and stood in for secondary buttons, Cancel in the link colour, and Billy's panel icon used as the icon button everywhere. **What changed**: `index.html` loads Roboto 300 to 700 (preconnects, `display=swap`), and `body` uses it ahead of the system faces. `src/index.css`: `.font-semibold:not(.cx-display)` is 500; `cx-display` is Studio's `.iw-display` with the same scaled sizes; new fixed fills for white words that stay the same in dark (`--fill-cerulean` #007BA7 white 4.9:1, `--fill-deep` #0B5C8A 7.0:1, `--fill-ember` #B23A27 5.6:1), and `--sky-soft` for the secondary wash (light #E8F2FB, dark #1D3346). The levels, in Coach's blues where Studio has magenta and lilac: `cx-btn-primary` (135-degree cerulean to deep blue gradient, white, pill, blue glow; not sky, since white on sky is under 3:1), `cx-btn-ember`, `cx-btn-quiet` (accent outline over an accent-soft to sky-soft wash, 12px), `cx-btn-row`, `cx-link` (no underline), `cx-quiet` (iron), `cx-icon-btn` (2rem square on --paper, Studio's), and busy buttons at full strength (`button[aria-busy="true"]:disabled`). The view level wasn't needed: Coach's pill rows are choices inside a page. **Each screen moved to its level**: page titles `cx-display text-2xl uppercase` (TabHeading) and the greeting `cx-display text-3xl`/`4xl`; Login's second Back to login (after a reset) from primary to quiet, Send temporary password busy with a spinner, Open Studio without its underline; Home's Studio link inline in its sentence (accent, semibold, no icon, as Studio does for a link inside a sentence); Clients' Try again a row button; My equipment's Add a full-width secondary ("adding to a list is a secondary button inside the card"), Remove this place a row button, Rename and + Add a place links, icons as `cx-icon-btn`; a client's limitations: + Add a limitation full-width secondary, Save busy as Saving…, Cancel quiet, and deleting now Studio's inline confirmation (a pale red box asking *Delete this limitation? Its trainers will no longer see it.*, a red **Delete** and **Keep it** in ink-soft, since iron on the pale red is too faint), where it was two small links; My exercises: Find what it is and + Add an exercise of my own full-width secondary, Take back a row, Cancel quiet, icons; Review Coach IQ: Approve and Flag are row buttons sharing the card's width (each card had a primary, and Studio allows one per screen), Take back a row, the family name `cx-display`; Installation: Save folder busy as Saving…, Let the app choose secondary. Billy's panel kept its own icons and its primary send button, as in Studio. **`npm run check-ui`** (`scripts/check-ui.mjs`), after Studio's: it finds each `<button>` and `<a>` by scanning to the `>` outside braces and quotes (Studio's lesson: a regex stops at the first `=>`) and fails on a way out (Cancel, Keep it, Back to login …) wearing a loud level, two levels on one control, an underline, or Billy's panel icon outside his panel; a `ui-exception:` comment on the line before excuses one and is printed every run. Run against the code from before this pass it found 15 problems; after, none. CLAUDE.md now says the look matches Studio's and names the check. Manual: the limitation delete wording (Keep it, the pale red box); the other button words were unchanged. Also in this commit: the library-in-the-app item in Next up, and Glenn's tag **lih** for its history records in `server/ids.js` (not used yet). Tested on scratch SQLite with the mock Studio and Claude: before and after screenshots of every screen, light and dark, at phone width, with no page errors; the font server answered from here. Not done: the manual's own pictures (`npm run screenshots`) still show the old buttons, because they are taken against Studio's fixture with a test account, which a cloud session can't run; retake them on the Mac.

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
   - [2.6 Putting Coach on your Home Screen](#26-putting-coach-on-your-home-screen)
3. [Finding your way around](#3-finding-your-way-around)
   - [3.1 The bar at the top](#31-the-bar-at-the-top)
   - [3.2 Switching between Coach and Studio](#32-switching-between-coach-and-studio)
   - [3.3 The bar at the bottom](#33-the-bar-at-the-bottom)
   - [3.4 The home screen](#34-the-home-screen)
   - [3.5 Your account menu](#35-your-account-menu)
   - [3.6 Light or dark](#36-light-or-dark)
   - [3.7 My equipment](#37-my-equipment)
   - [3.8 My exercises](#38-my-exercises)
   - [3.9 Reviewing and editing Coach IQ (Primary Master only)](#39-reviewing-and-editing-coach-iq-primary-master-only)
   - [3.10 Installation (Primary Master only)](#310-installation-primary-master-only)
   - [3.11 Reading a book into Coach IQ (Primary Master only)](#311-reading-a-book-into-coach-iq-primary-master-only)
4. [Your clients](#4-your-clients)
   - [4.1 Opening your clients](#41-opening-your-clients)
   - [4.2 Reading the list](#42-reading-the-list)
   - [4.3 Seeing a client's details](#43-seeing-a-clients-details)
   - [4.4 Finding a client](#44-finding-a-client)
   - [4.5 Archived clients](#45-archived-clients)
   - [4.6 Adding or changing a client](#46-adding-or-changing-a-client)
   - [4.7 A client's limitations](#47-a-clients-limitations)
5. [Designing programs](#5-designing-programs)
   - [5.1 Starting a program](#51-starting-a-program)
   - [5.2 Adding exercises](#52-adding-exercises)
   - [5.3 Sets, reps and the rest](#53-sets-reps-and-the-rest)
   - [5.4 What Coach IQ says](#54-what-coach-iq-says)
   - [5.5 Days, order and supersets](#55-days-order-and-supersets)
   - [5.6 Printing it for the client](#56-printing-it-for-the-client)
6. [Asking Billy](#6-asking-billy)
   - [6.1 Opening Billy](#61-opening-billy)
   - [6.2 Asking a question](#62-asking-a-question)
   - [6.3 Giving Billy a photo or a PDF](#63-giving-billy-a-photo-or-a-pdf)
   - [6.4 Starting again](#64-starting-again)
   - [6.5 What Billy can't do](#65-what-billy-cant-do)
7. [Words this app uses](#7-words-this-app-uses)
8. [When something goes wrong](#8-when-something-goes-wrong)

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
   **COACH** underneath. Under the logo, *You belong here.* changes language
   every few seconds, as on Studio's sign-in screen; then, in blue, *Please
   use the email you used when you signed up with Trainability.* The version
   the app is on is in your account menu once you are signed in (3.5).
3. Tap the **Your email address** box and type your email address, the same
   one you use for Studio. With a @trainabilitystudio.com address you can type
   just the part before the @: the app adds the rest.
4. Tap **Continue**. It says **One moment…** while the app checks which way
   in your email takes.
5. The box now shows your **Email** (greyed; tap **Use a different email** to
   change it) and an empty **Password** box. Type your password, the same as
   in Studio.
6. If this is your own phone or computer, tick **Keep me logged in**. Leave it
   unticked on a shared machine — see 2.2.
7. Tap the blue **Log in** button. It says **Signing in…** for a moment while
   the app checks.

You are now signed in, and you land on the home screen (3.4).

**An email that isn't a trainer's.** Coach is for Trainability's trainers for
now; clients will be able to sign in here later. If the email is not a team
account (a client's, or one nobody has), the box says *Coach is for
Trainability's trainers for now. Clients will be able to sign in here soon.*,
with **Go to my page**, which opens the client's own page in Studio, and **Use
a different email**.

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

1. On the sign-in screen, type your email and tap **Continue**, then tap
   **Forgot password?** underneath the Log in button.
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

#### 2.6 Putting Coach on your Home Screen

On a phone or tablet, the sign-in screen has a strip along the bottom. Coach
then has its own icon, named **Coach**, and opens full screen from it.

**On an iPhone or iPad** the strip says **Add Coach to your Home Screen**.

1. Tap it. A box shows three steps.
2. Tap **OK**, then tap the **Share** button: at the bottom of Safari on an
   iPhone, at the top on an iPad.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

**On an Android phone** the strip says **Install the app**. Tap it, then
**Install** in the box your phone shows.

Not now? Tap the **×** at the end of the strip. It stays away on that phone
for a month. The strip does not show once Coach is on your Home Screen, or on
a computer.

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
  business — tap it to ask him something (chapter 6).
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
| **Programs** | A clipboard with a list | Your programs (chapter 5). |
| **Messages** | A speech bubble | Messages — coming soon. |

The one you are on sits in a filled blue circle, which slides across when you
tap another. On a computer, pointing at a button shows its name.

**Messages** is not built yet. It opens a page
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
| **Programs** | Programs you design for your clients, with Coach IQ beside you. |
| **Messages** | Check-ins and notes between you and your clients. |

**Clients** is ready: next to its name it says how many clients you have,
such as **5 active clients**. **Programs** is ready too. **Today** and
**Messages** are marked **Coming soon**.
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
   - **Review Coach IQ** — only for the Primary Master: passing and editing
     the library (3.9).
   - **Installation** — only for the Primary Master: settings for this copy of
     Coach on its server (3.10).
   - **Units** — **Imperial** (pounds, inches, feet, yards, miles) or
     **Metric** (kilograms, centimetres, metres, kilometres). Tap one to
     choose it; it is shaded blue when chosen. It starts on **Imperial**.
     Weights and distances in Coach IQ, and in Billy's answers, are then
     shown in your units only, rounded to what a gym has: loads to 5 lb or
     2.5 kg. It is your own choice; other trainers keep theirs.
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
2. Across the top are your places. Every place in Studio is one of them,
   under the name Studio gives it: your own place in Studio (your default
   place there) first, saying *Your place in Studio. Its name comes from
   Studio, so it's changed there.*, then Studio's others (*One of Studio's
   places.*), then places of your own, such as **Where I usually train**.
   Studio's places can't be renamed or removed here; they follow Studio, and
   one Studio closes goes away, its answers kept. Tap a place to see its
   equipment.
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

At your place in Studio, answers marked **Set for everyone** were given by
the Primary Master for every trainer there. They can't be changed here, by
you or by Billy; ask the Primary Master. Anything they left unanswered you
can answer yourself.

**The Primary Master** also sees **Places in Studio, set for every trainer**
under their own places: every place in Studio. Tap one and answer **The
basics** and **Particular pieces** as above (*At Trainability Downtown, for
every trainer, is there…*). Each answer is set at once for every trainer
whose place in Studio it is.

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

#### 3.9 Reviewing and editing Coach IQ (Primary Master only)

Coach IQ's library of exercises, its conditions table and its principles (how
Trainability designs a program) live in Coach itself. Every exercise, condition
and principle starts as a draft. The Primary Master passes each one here, and
keeps Coach IQ right: changing, adding and retiring exercises, adding trainers'
suggestions, and reading books into the principles. Nobody else sees this
page.

1. Tap your photo or initials in the top right corner, then **Review Coach
   IQ**.
2. At the top are three counts with bars: how many exercises, conditions and
   principles are approved so far, and how many are flagged.
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

**Changing an exercise.** Tap **Edit** on its card. Change what needs
changing: its everyday name, other names, family, its details (equipment,
position and so on; **Usual** leaves one out of its full name), level, what it
works, what it involves, the joints it loads, a particular piece it needs, how
it is counted, and its easier and harder steps (search to add one, tap **×**
to take one off). Tap **Save**. A renamed exercise keeps its old name as
something it is also called, so programs that use the old name are still
understood.

If the change would break the library (two exercises with the same name, a
harder step that is easier, an exercise above beginner with no easier step
leading to it), nothing is saved and a pale red box says why. Change it and
tap **Save** again, or tap **Cancel**.

**Other things you can do:**

| To do this | Tap this |
|---|---|
| Add an exercise to a family | **+ Add a version of** the family, at the foot of its cards |
| Add a family | **+ Add a family** beside the family list. Fill in the family, tap **Next: its first version**, then fill in that and tap **Add the family**. A family can't be empty |
| Change a family | **Edit the family**, under its name |
| Stop offering an exercise | **Retire** on its card. It stays in the library, so programs that use it are still understood, but nobody is offered it. **Bring back** undoes it |
| See what has changed on one card | **History** on the card |

6. **Conditions** works the same way, one card for each condition: what to
   avoid, what to make easier or supported, whether a doctor's go-ahead comes
   first, and when to send them on. Tap **Edit** to change one, or **+ Add a
   condition** at the foot of the list.
7. **Principles** lists the topics down the side (Terms, Reps, Rest …). Tap
   one to read it. Weights and distances are shown in your units (3.5),
   whatever unit was written; **Edit** shows the text as written. Under its
   title it says when it was reviewed and which books it comes from; a topic not yet approved is marked **Draft**, and
   Billy doesn't use it until you approve it. **Approve** and **Flag** work
   as for an exercise. Tap **Edit** to change its title, the line saying what
   it covers, or its text, then **Save**. In the text, "## " starts a
   heading, "- " a point and "1. " a numbered step, and words between two
   stars on each side are bold. **+ Add a topic**, at the foot of the list,
   starts a new one.
8. **Suggestions** shows exercises trainers have suggested for everybody's
   library, who suggested each, and why. Tap **Add to the library**, choose
   its family and fill in its details, then tap **Add to the library** again.
   The trainer's names for it now mean the library's exercise.
9. **Changes** lists every change to the library, newest first, with who made
   it and when. **Undo** puts back what a change touched. If something it
   touched has changed since, undo the later change first.
10. **Books** is where a book is read into the principles (3.11).

Every change and every approval counts straight away: Billy uses the library
as it now stands. **Export the library**, at the top, downloads all of it as
one file, a snapshot to keep; Claude can write it into Coach's own copy of the
library when you ask.

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

#### 3.11 Reading a book into Coach IQ (Primary Master only)

Coach can read a book about training and suggest what it adds to the
principles. It reads the book in your own words, not the book's, and asks you
about anything it shouldn't decide alone. Nothing changes until you accept it.

1. Open **Review Coach IQ** (3.9) and tap **Books**.
2. Under **Read a book**, tap the file button and choose the book's PDF (up to
   100 MB). Its name and size appear under the button.
3. Tap **Read the book**. A bar shows the PDF going up.
4. The book appears below as a card, saying **Waiting to be read**, then
   **Reading**, with a bar and the part it is on, such as *Reading part 2 of
   5 (pages 41–80)*. A long book takes a while. You can leave the page; the
   reading carries on.
5. When it says **Ready for you**, tap **Go through it**. At the top is what
   the book is and what it adds. Below, one card for each topic it adds to,
   marked **Changes** or **New topic**, with a list of what changed.
6. Where the book is out of date, is one coach's view, or disagrees with what
   is there, the card asks you, one point at a time: the question, what the
   book and the text say, and two to four answers. The one Coach recommends is
   chosen already and marked **(recommended)**, with why. Choose another, or
   write your own answer in **Or in your own words**. Tap **Next point**, and
   after the last one, **Write it up**.
7. The card says **Writing your answers in. This takes a minute or two.**
   Then it shows the text as it would go in, with each answer written in
   with your name and the day.
8. Read it. To change something first, tap **Change the text first**, change
   it, and tap **Keep these changes**.
9. Tap **Accept** to put it into the principles, approved, with the book named
   as a source. Tap **Reject** to leave the topic as it is. A topic with
   nothing to ask you goes straight to step 8.
10. When every topic is accepted or rejected, the book says **Done**.

Under each card, **Read the proposed text** shows the whole topic as the book
would have it, and **Read the topic as it was** shows it as it stands now.
An accepted topic can be undone under **Changes**, like any other change.

If the topic was changed after the book was read, **Accept** says so and
saves nothing: copy what you want into the topic under **Principles**, and
reject the book's version.

If reading stops, the card says **Stopped** and why; tap **Try again** to
carry on from where it stopped. **Put away** stops using a book: its PDF is
thrown away and nothing more is read or accepted from it. The PDF is thrown
away anyway once the book has been read. Reading a book uses Billy's key and
costs Claude's time, a few dollars for a long book; the card shows how much it
read and wrote.

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
trainer who wrote a limitation can delete it: tap the bin beside it. A pale
red box asks *Delete this limitation?*; tap **Delete**, or **Keep it** to
leave it.

<div style="page-break-after: always;"></div>

---

### 5. Designing programs

A program is a plan of training days for one of your clients: on each day,
the exercises, and for each exercise as much or as little as you want to say
about it. As you build it, Coach IQ checks it and suggests what could come
next, and Billy can talk it over with you. Only you see your programs.

#### 5.1 Starting a program

1. Tap **Programs** on the bar at the bottom (the clipboard).
2. Tap **New program**. It asks first: *What kind of program are you
   thinking of?* Coach IQ uses your answers to suggest exercises for each
   day.
3. Tap one:
   - **Full body**: every day works the whole body.
   - **Upper and lower**: days take turns, upper body, then lower body.
   - **Push, pull, legs**: days take turns, pushing, pulling, then legs.
   - **A circuit**: exercises one after another with little rest, for
     conditioning.
   - **Mobility and flexibility**: moving better, with mobility, balance and
     breathing.
4. Under **Days a week**, the usual number for that kind is chosen; tap
   another if you like.
5. Under **Anything to focus on?**, tap any of **Legs and glutes**, **Upper
   body**, **Core**, **Balance and stability**, **Posture** and
   **Conditioning**, or none. Tap one again to take it off.
6. Under **How long is a session?**, tap **30 min**, **45 min**, **60 min**,
   **75 min** or **90 min**. Then tap **Next**.
7. Choose the **Client**. The **Name** fills in as *Avery's program*; change
   it if you like.
8. **What it's for** is chosen to suit the kind (**Muscle size** for upper and
   lower, say); change it if you like (**Strength**, **Power**, **Muscle
   size**, **Strength endurance**, **Fat loss and conditioning**, **General
   fitness** or **Mobility**). **The client's level** (**Beginner**,
   **Intermediate** or **Advanced**) is filled in from the programs you have
   made for them before, with Coach IQ's reason underneath: the level of the
   last one, or the next level up once they have been on programs at one
   level for 12 weeks without stepping back (*Coach IQ: 1 program with you,
   on beginner programs for 15 weeks without stepping back: time for
   intermediate.*). Change it if you know better. For a client with no
   programs yet it says *No programs for Jordan yet. What's their fitness
   level?*: choose one, as the program can't start without it. Then choose
   **Where they train**: one of your places from My equipment (3.7),
   starting on your place in Studio if you have one. If the client has a gym
   in Studio (their home gym, or a membership), it starts there instead and
   says *Jordan's gym in Studio.*, with anything the Primary Master set
   there. It is read from Studio each time, so a change there shows at once.
   Add
   **Notes** if you want. **Back to the kind of program** goes back a step.
9. Tap **Start designing**. The program opens with its days already made, as
   many as you chose: **Upper A**, **Lower A**, **Upper B**, **Lower B** for
   upper and lower; **Push**, **Pull**, **Legs** for push, pull, legs;
   **Day A**, **Day B** … for full body and mobility; **Circuit A** … for a
   circuit.

Your programs are listed on the Programs page, newest change first, with who
each is for. Tap one to open it; **All programs** takes you back. To change
the client, name, goal, level, place, focus, session length or notes later,
tap **Edit the details**.
The box button beside a program in the list (**Put away**) takes it off the
list; it is kept, not deleted.

#### 5.2 Adding exercises

1. Under a day, tap **Add an exercise**. A box opens: *Add an exercise to
   Day A*.
2. At the top is a yellow card headed **Coach IQ**, with two questions you
   can answer or leave. **What are we working on?** Tap the kind of training:
   **Strength** (lifts and resistance work), **Power** (jumps, throws,
   swings), **Cardio** (running, rowing, intervals), **Balance** or
   **Mobility** (stretches and breathing); tap it again to clear it. Under **Muscle groups**, tap any of **Chest**,
   **Shoulders**, **Back**, **Arms**, **Core** and **Legs**: that means the
   whole group, and its own muscles open underneath (*Legs: all of them, or
   tap to narrow*); tap some of them to narrow further, such as **glutes**.
   Tap the group again to close it. Coach IQ's suggestions below narrow to
   match (*Coach IQ suggests: Strength · hamstrings*, or *legs*), different movements
   first, each saying what it works, such as *Works the biceps.* The next
   step of something the client did in an earlier program comes first, and
   says so (*A step on from Goblet squat, from an earlier program.*); the
   easier ones they have moved past come last. Stretches
   only come up when you choose **Mobility**. If
   nothing fits the place, the client's level and limitations, it says so:
   choose fewer muscles, or another kind of movement. **Ask Billy for
   ideas** closes the box and asks Billy, with what you chose. The next
   time you add an exercise to the same program, the card opens with the
   same answers (on this phone or computer), so you only change what's
   different.
3. **Which exercise?** Type any name you use for it: your own name, one of
   your own exercises, or the library's name, and tap it in the list. Before
   you type, the box lists what **Coach IQ suggests** for that day, with why;
   tap one of those instead if you like.
4. The box now shows the exercise: its name, its full name in the library,
   its **Level**, what it **Works** and what it **Needs**, and anything Coach
   IQ has to say about it for this client and place, with the same marks as
   in 5.4 (a red octagon to stop, an orange triangle to take care). To pick a
   different one, tap **Change exercise**.
5. Under **How it's done (all optional)**, Coach IQ's starting point is
   filled in, such as **1–3** sets of **8–12** with **3 min** rest. Change
   anything, or fill in more (5.3). **Coach IQ's starting point** puts its
   numbers back.
6. Tap **Add to Day A**. The exercise appears on the day with what you filled
   in. If something can't be saved (a rest written oddly, say), the box stays
   open and says why in red.

**From a suggestion.** Under each day, **Could come next** lists exercises
Coach IQ suggests for what that day trains (*Could come next on an upper body
day*), one for each kind of movement the day doesn't have yet (a squat, a
hinge, a push, a row …), taking turns with what you chose to focus on (*A
focus of this program: core.*). Every one already fits the place's
equipment, the client's level and their limitations, and says where to
start, such as *Start with 1–3 × 8–12 · rest 90 s*. A line in orange says
what to make easier for the client. Tap **Add**: the same box opens at step
4, with that exercise and its starting point. When the day holds about as
much as your session length allows, it says so. To change what a day trains,
tap its pencil and choose under **What this day trains**.

#### 5.3 Sets, reps and the rest

Only the exercise is needed. In the box, under **How it's done**, fill in
what you want:

| Box | For example | |
|---|---|---|
| **Sets** | 3 | Or a range, such as 1–3. |
| **Reps** | 8–12 | Or a time (30 s), or each side. |
| **Load** | 45 lb | In your units (3.5). |
| **Effort** | 2 in reserve | Or RPE 7. |
| **Tempo** | 3-1-1-0 | Down, pause, up, pause. |
| **Rest** | 90 s, or 2 min | Between sets. |
| **Note** | A cue to remember | |

What you filled in shows under the exercise on the day, such as *3 × 10 · 45
lb · tempo 3-1-1-0 · rest 2 min*; an exercise with nothing filled in says *No
sets or reps yet.*

**To change an exercise already on a day**, tap its name or **Details** under
it. The same box opens with what it has; change anything, or tap **Change
exercise** to put another in its place, then tap **Save**.

#### 5.4 What Coach IQ says

Coach IQ checks the whole program every time you change it. At the top,
**Coach IQ's check** counts what it found; each point then shows where it
applies, under the exercise or the day, with where it comes from in
brackets.

| Mark | Means | For example |
|---|---|---|
| Red octagon | Stop: swap it | An exercise needing equipment the place doesn't have, or one the client's limitations say to avoid |
| Orange triangle | Take care | Something to make easier for the client, or above their level |
| Grey circle | A note | Reps or rest outside the usual range for the goal, too many sets for one session, a tempo written oddly, a step back from something the client did in an earlier program |

They are guidance: your word wins. If one is wrong, it shows where Coach IQ
needs fixing; tell the Primary Master.

**Swap**, under an exercise, lists exercises that could stand in for it,
already fitting the place, the level and the limitations. Tap **Use it**.

**Ask Billy about it**, at the top, and **Ask Billy about** a day, open
Billy's panel with the question asked.

If a client's gym in Studio has changed since their program was made for
one of Studio's places, opening the program says so (*Jordan's gym in Studio
is Trainability Eastgate; this program is for Trainability Northside.*). Tap
**Use Trainability Eastgate** to move it there, or leave it as it is. A place
of your own, such as a client's home, is never questioned. He reads the program, its check and
the suggestions, and talks it through; he changes nothing himself.

#### 5.5 Days, order and supersets

- **Add a day**, at the bottom, adds the next day in the program's turn:
  Upper C after Lower B, Day D after Day C.
- Beside a day's name: the arrows move it up or down, the pencil renames it
  (and gives it a note), and the bin takes it out with its exercises.
- Beside each exercise: the arrows move it up or down the day, and the bin
  takes it out.
- **A superset**: in its box (**Details**), tick **Done together with the
  exercise above (a superset)**. The two then share a number, such as **2a** and
  **2b**.

#### 5.6 Printing it for the client

1. Tap **Print for the client**, at the top of the program. It opens in a
   new tab.
2. The page shows the program's name, who it is for and the date, then each
   day's exercises in your names for them, with whatever you filled in, in
   your units. Coach IQ's check is not on it.
3. Tap **Print**, and print it or save it as a PDF to send.

<div style="page-break-after: always;"></div>

---

### 6. Asking Billy

Billy is the assistant you may know from Studio. In Coach he can tell you
about the clients on your list, and he can read a photo or a PDF you give him
— a client's food log, a form they filled in, a program — and answer
questions about it.

If you do not see his face in the bar at the top, Billy has not been set up
for your business yet.

#### 6.1 Opening Billy

1. Tap **Billy's face** in the bar at the top, next to your photo.
2. His panel opens under the bar, joined to his button, with a box at the
   bottom that says **Ask Billy…** Everything else on the screen goes grey
   and blurred behind him.

To close the panel, tap the arrow where his face was, tap anywhere on the
grey screen behind him, or press Esc on a keyboard. Tapping your photo
closes him too and opens your menu; opening Billy closes your menu. Only one
is open at a time. Closing it keeps the conversation: open it again and it is all
still there. While it is closed, a small blue dot on his face means he has
answered and the answer is waiting.

#### 6.2 Asking a question

1. Tap the **Ask Billy…** box and type your question, such as *When did
   Avery last train?* or *Which of my clients have nothing booked?*
2. Tap the blue arrow button, or press Enter on a keyboard.
3. While he works it out, the panel says **Billy is looking…** His answer
   then appears under your question.

You can carry on asking: he remembers what was said earlier in the same
conversation, so *What about Jordan?* works after a question about Avery.

#### 6.3 Giving Billy a photo or a PDF

1. Tap the **paper clip** to the left of the **Ask Billy…** box.
2. Choose a photo or a PDF. On a phone you can take a photo there and then.
3. It appears above the box with its name. To take it off again, tap the
   **×** beside it.
4. Type what you want to know about it, such as *How much protein is in this
   day?*, and tap the blue arrow. If you type nothing, Billy is asked to have a
   look at it.

Billy reads JPEG, PNG, GIF and WebP photos, and PDFs up to 15 MB. A large
photo is made smaller before it is sent, which does not stop him reading it.

#### 6.4 Starting again

Tap the **round arrow** at the top right of the panel (**New conversation**).
The conversation is cleared and Billy starts fresh. Leaving or reloading the
page clears it too: Coach does not keep your conversations with Billy.

#### 6.5 What Billy can't do

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
- **He works from Coach IQ's principles** (3.9) when he talks about reps,
  sets, load, tempo, rest, how often to train or planning over weeks: only
  the topics you have approved, never a draft. They are guidance; your word
  wins.
- **He reads your programs** (chapter 5), with Coach IQ's check and what
  could come next, and suggests from those; he never changes a program
  himself.
- **He talks in your units** (3.5): every weight and distance in pounds and
  feet, or kilograms and metres, rounded to what a gym has.
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

### 7. Words this app uses

| Word | What it means |
|---|---|
| **Coach** | This app, Trainability Coach, at trainabilitycoach.com. |
| **Studio** | Trainability Studio, the business's scheduling and billing app, at trainabilitystudio.com. Your account lives there. |
| **Temporary password** | A password emailed to you when yours is reset or forgotten. Use it once, then choose your own in Studio (2.4). |
| **Keep me logged in** | The tick box that keeps you signed in for up to 30 days on this device (2.2). |
| **Coming soon** | A part of Coach that is planned but not built yet. |
| **Active client** | A client on your list who you are still training. |
| **Program** | A plan of training days for one client, designed in Coach (chapter 5). Only the trainer who wrote it sees it. |
| **Billy** | The assistant in Coach and in Studio. In Coach he knows your clients and reads photos and PDFs (chapter 6). |
| **Library** | Coach's own list of exercises, each with a full name that says exactly what it is (3.8). |
| **Coach IQ** | Trainability's own know-how for designing training: the library, the conditions table, and the principles read from books. The Primary Master reviews and edits it (3.9). |
| **Limitation** | Something a client should not do, or should do with care, written down by one of their trainers (4.7). |
| **Archived client** | A client you have archived in Studio because you no longer train them. They are under **Archived** on the Clients page (4.5). |
| **Apps panel** | The panel that folds down from the Coach logo, for switching between Coach and Studio (3.2). |
| **Account menu** | The menu under your photo in the top right corner: who is signed in, your equipment and exercises, Units, Log out and the version (3.5). To go to Studio, use the apps panel under the logo (3.2). |
| **Version** | Which release of Coach you are using: a number such as 1.0.1, and the release's name, such as Caesious. Shown on the sign-in screen and at the foot of your account menu. |

<div style="page-break-after: always;"></div>

---

### 8. When something goes wrong

**"Type your email address first."**
**Continue** was tapped with no email, or one missing its @ or its ending.
Type the whole address, or just the part before the @ of a
@trainabilitystudio.com one.

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

**"Reading a book needs Billy's key on this server (ANTHROPIC_API_KEY). Ask whoever runs the app."**
Books (3.11) uses Billy's key, and it isn't set up on this server. Pass the
message on.

**"That file couldn't be opened as a PDF. Check it opens on your computer, then try again."**
The file isn't a PDF, or it is damaged. Open it on your computer; if it opens,
save it again as a PDF and upload that.

**"That PDF is over 100 MB. Split it into two and upload the parts as two books."**
Save the first half and the second half of the book as two PDFs, and upload
each as its own book.

**"… has changed since this book was read. Copy what you want from this text into it on Principles, and reject this one."**
Somebody changed the topic after the book was read, so accepting would undo
their change. Open the topic under **Principles**, add what you want from the
book's text, then reject the book's version.

**You are back on the sign-in screen.**
Your sign-in ran out while the app was open. Sign in again (2.1).

**The temporary password email never came.**
Look in the junk or spam folder first. Each request replaces the last password
sent, so use only the newest email. If nothing arrives after a few minutes,
make sure the address is the one you use for Studio.
