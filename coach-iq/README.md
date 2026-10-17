# Coach IQ

Trainability's own book on designing workout programs: the principles and best
practices Billy works from when he helps a trainer design or check a program.
It is not a set of programs. It is written in our own words, from the books
Glenn has read, and it is the base the program reader will judge against later.

## What it has to know (Glenn, 16 Oct 2026)

"It needs to learn about different modalities, alternative exercises (based
on fitness level, disabilities, illnesses, limitations), but also be able to
keep it fun by suggesting other exercises that hits the same muscle
group/goal."

So Coach IQ is two parts:

1. **Principles**, in prose, one file per topic: how to design a program, and
   how to adapt it to a fitness level, a disability, an illness or a
   limitation, including when somebody needs a doctor's clearance first. It
   gives general adaptations and when to refer on; it never diagnoses.
2. **The exercise library**, as a list rather than prose, so alternatives can
   be found by matching. Each exercise records its movement (squat, hinge,
   push, pull, carry, rotation …), the muscles it works, its modality and
   equipment, its level, its easier and harder versions, and its cautions:
   the joints it loads and the conditions that call for care. An alternative
   is the same movement and muscles with a different tool or level, and
   nothing the client's limitation rules out; variety, to keep it fun, is the
   same goal by a different exercise.

## Equipment: asked little, learned as it goes (Glenn, 16 Oct 2026)

"Equipment should really be defined, i think we should ask for surface level
equipment, such is \"is there dumbbells? Barbells? Kettlebells? Machines?\" and
from there when the trainer creates a new program, Billy then asks them if
they have a for example a \"low row machine\" if not, we know they may have
dumbbells so we modify the modality to dumbells. Slowly the personal brain
will learn better"

- **A short checklist first**, yes or no: dumbbells, barbells and a rack,
  kettlebells, machines, cables, bands, a bench, cardio machines, and the
  like.
- **Details only when a program needs them.** When an exercise wants a
  particular piece ("a low row machine"), Billy asks, and the answer is kept
  so he never asks again.
- **Fall back by category.** Every exercise in the library names its specific
  equipment and the category it belongs to; without the low row machine but
  with dumbbells, it becomes a dumbbell row.
- **This is not Coach IQ: it is the trainer's personal memory** (Glenn: "Equipment
  memory should be part of the personal workout programs memory they have
  already."). Coach IQ is the shared book, the same for everybody, that Glenn
  reviews. Each trainer also has a personal memory of their own, learned as
  they use Coach: their programs once they are scanned, how they like to
  program, and the equipment they have. Equipment belongs to the trainer, not
  to a place; a trainer who works in more than one place has it noted, inside
  their memory, where each piece is.

Decided (Glenn, 16 Oct 2026):

- **Billy may write down a trainer's answer** ("Yes"): only what they have just
  told him, on view in their memory and correctable there.
- **Coach keeps the personal memory in a database of its own** ("go with your
  suggestion"), linked to Studio's trainers and clients by their ids. Studio is
  not changed.
- **The exercise library starts from a list Claude drafts** ("A starter list
  you draft"): common exercises with movement, muscles, modality and
  equipment, level, easier and harder versions and cautions, reviewed by
  Glenn; the books add to it.

## Reviewing it in the app (ideas audit, 24; built 17 Oct 2026)

The Primary Master (Studio's `isPrimaryMaster`: `isPrimary` and a master)
reviews Coach IQ on **Review Coach IQ**, from the account menu: each exercise
version, one family at a time, and each condition, Approve or Flag with a
comment (a flag must say what is wrong). Each mark is an `iqr…` record (Glenn's
tag) in Coach's database, kept with the ones before it as its history.

Glenn, 17 Oct 2026: **"App now, file later"**. A mark counts in the app at
once: an approved exercise or condition is no longer a draft to Billy or on
any screen, and a flag puts one that was reviewed back to draft. Since the
library moved into the app (below), the mark is written into the library
itself, so nothing waits for the files.

## The library lives in the app (Glenn, 17 Oct 2026; built in build 1.0.12)

"So we have to keep committing here to update the library? We have to keep
committing? Is there another way so it's app controlled?" Then: "Yes, use LIH."

- **The database is the library.** Its families, versions and conditions are
  rows in Coach's own database (`coach_iq_docs`), each the same JSON as in
  `exercises.json` and `conditions.json`. Those files load it the first time
  the app starts with an empty table (with any approvals already made written
  in), and stay here as its starting copy and a backup.
- **Edited on Review Coach IQ**, by the Primary Master: change, add or retire
  a version; add or change a family (a new family comes with its first
  version, since a family can't be empty); change or add a condition; make a
  trainer's suggestion a version of a family, their names for it following it
  there. A renamed version keeps its old name as a former name.
- **Every change is checked** with the same rules `npm run check-iq` runs
  (`server/iq-check.js`) and refused, with the reasons in plain words, if the
  library wouldn't hold together. Nothing is half saved.
- **Every change is kept** as a library history record, `lih…` (Glenn's
  tag): each row it touched before and after, who and when. **Undo** puts it
  back, as a change of its own, unless a row has changed since; then the later
  change is undone first. This is the library's history now, in place of
  git's.
- **Export the library** downloads it all as one file. `npm run iq --
  --import <file>` writes that into `exercises.json` and `conditions.json`
  (keeping their layout) and refreshes the pages here, when the copy in the
  code should catch up.
- A change to the library's **shape** (a new kind of attribute, a new word
  list) is still a change to the code; its **content** is not.

## Reading a book in the app (asked 16 Oct 2026; built 17 Oct 2026, build 1.0.16)

"When it comes to the Coach IQ \"knowledge upload\" of PDF, can we can that
in-app? Have a functionality for the primary master?" Built with "Do all 3"
(17 Oct 2026), alongside the principles moving into the app and Billy reading
them.

- **Review Coach IQ → Books**, the Primary Master's alone. They upload a PDF
  (up to 100 MB). It waits in the files folder (`books/`, under
  Installation's folder) while it is read, and is thrown away once it has
  been. Each book is an `iqb…` record (Glenn's tag).
- **Read in the background, a part at a time** (`server/books.js`): cut into
  parts of 40 pages (halved again while a part is over 18 MB), each read for
  notes in our own words; then the topics the book adds to are chosen from the
  notes and the principles as they stand; then each topic is written again.
  One thing at a time, each step saved, so a restart carries on.
- **Read by Opus 5.5** (Glenn, 17 Oct 2026: "Opus 5.5"); `BOOK_MODEL` changes
  it. The key is Billy's.
- **Nothing is decided alone.** Where the book is dated, one coach's view, or
  disagrees with what is there, the proposal raises an open point with two to
  four answers and a recommended one, as Glenn asked for the first book ("Ask
  me one by one and recommend answers"). The Primary Master answers them one
  at a time; the answers are written in, in their words, as
  (Name, date: "answer").
- **Nothing reaches the principles, or Billy, until it is accepted.** An
  accepted topic is saved as reviewed through the library's own checks and
  history (undoable under Changes), with the book among its sources. A topic
  changed since the book was read can't be overwritten: the screen says so.
- **Units.** Every weight and distance is written in imperial, rounded to
  what a gym has, and shown to each trainer in their own units (below).
- **Not copied.** Every request says the book is learned from, never copied:
  no sentences, tables, lists or branded systems; facts, numbers and ranges in
  plain words.

## Units (Glenn, 17 Oct 2026; build 1.0.17)

"I see some of the books recommend in imperial and kg… let's default by
metric and lbs. but let's have a setting where we can change this. Let's try
to round up numbers on both denominations." Then, asked: **imperial** by
default, **only the chosen unit** shown, rounded **to gym-friendly steps**,
and the setting is **each trainer's own**.

- Each trainer chooses Imperial or Metric under Units in their account menu
  (`coach_trainer_settings`, `server/trainer-settings.js`).
- `src/lib/units.js` converts any text: a number with a unit (kg, lb, m, yd,
  cm, inches written as "inch", ft, km, mi, and their words, ranges too) in
  the other system becomes the reader's, rounded to 5 lb (1 lb under 10),
  2.5 kg (1 kg under 10), and tidy distances. A percentage or "1 in 3" is
  never touched; a unit already in the reader's system is left as written.
- The principles are shown converted on Review Coach IQ (the text itself
  keeps what was written), Billy's principles tool gives them in the
  trainer's units, and his prompt tells him to answer in their units only.
- Books write every amount in imperial, already rounded, so the stored text
  is consistent.

## Exercise names (Glenn, 16 Oct 2026)

"I'd also like to introduce a proper naming convention for the exercises. Each
trainer can call every exercise differently, but it would be good to have a
name that explains the exercise by: position, velocity, plane, modality etc,
can we build our \"own\" master name and have display names for trainers?"

Every exercise has three kinds of name:

1. **A master name**, Trainability's own, made from the exercise's attributes
   in a fixed order and never typed by hand, so it explains the exercise and
   no two can share one. The attributes, in order: direction, position,
   support, limbs, equipment, attachment, load, grip, velocity, plane.
2. **A common name**, what most trainers call it, shown by default.
3. **Each trainer's own names**, kept in their personal memory. Coach shows a
   trainer their own name, Billy and the program reader understand all of
   them, and a client sees their trainer's name ("Their trainers name, the
   trainer creates the program so their word wins").

Decided: an attribute at its usual setting (standing, bilateral, controlled)
is left out of the master name ("Leave them out"); the plane is named only
when the movement does not already say it ("When it isn't obvious");
exercises are grouped in families, a base movement with each version defined
by its attributes, which is also how alternatives are found, for equipment
and for people with limitations ("Families would be great, also perfect for
finding alternative exercises, and people with limitations"). The order
(Glenn: "I'd go with C"): the movement first, then the attributes,

    Movement — direction, position, support, limbs, equipment, attachment,
               load, grip, velocity, plane

as in *Split Squat — Rear-Foot-Elevated, Dumbbell*, *Pull-Up — Bodyweight,
Supinated-Grip* (common name: chin-up), *Lunge — Reverse, Dumbbell* or
*Triceps Pushdown — Cable, Rope*. The direction comes first (Glenn: "First")
and the attachment right after the equipment ("After the equipment"), both
from the ideas audit. Velocity is named only when it is not
that movement's usual (Glenn: "name the velocity only when it differs from the
exercise's usual"): *Swing — Kettlebell*, not "Ballistic". Equipment is
always named, except Bodyweight in a family that is only ever bodyweight, and
where the movement's own name already says it (*Leg Press*, *Box Jump*); a
support the movement's name already says is left out too (*Wall Sit*). The
rules and their words are in `server/coach-iq.js`, shared by the checker and,
later, by Billy.

From the ideas audit (Glenn, 16 Oct 2026, all to build):

- **Ids are permanent.** Every exercise has an `exr…` id and every family an
  `exf…` id, Studio's kind of id with Glenn's tags (`server/ids.js`). A name
  may change; an id never does. A renamed exercise keeps its old names in
  `formerNames`, so a scan in the old words still finds it. An exercise is
  retired (`status: "retired"`, with `replacedBy` when something takes its
  place), never deleted, so old programs still find it.
- **What a set is, is not a name.** A tempo, a pause, slow lowering, a partial
  range and the weight are the program's to say. So the negative pull-up is a
  pull-up done with slow lowering ("negative pull-up" is one of its names),
  and the velocity words are only those that change the movement: Explosive,
  Ballistic, Isometric, Jumping.
- **How an exercise is counted**: reps, time, distance or calories (several
  where a program might use either, the usual first), and whether the numbers
  are per side. Weights are in **pounds** unless written otherwise (Glenn:
  "Pounds (lb)"), and dumbbells and kettlebells are counted per hand.
- **Level is the skill and strength an exercise needs, whatever the weight**
  (Glenn: "Skill and strength"). How hard it is on the body is told by its
  facts (high-impact, spinal-load …), not by its level.
- **Equipment is worked out, not typed.** What an exercise needs comes from
  its equipment, its support and its position (a seated dumbbell press needs
  a bench; hanging needs a pull-up bar), plus anything its family always
  needs. Only a particular piece (`piece`, such as "Low row machine") is
  written by hand.
- **Easier and harder.** Only the harder steps are written; the easier ones
  are worked out from them. A step stays on the same equipment where the next
  family has it, never goes down a level, and never loops; a bodyweight
  version leads to its loaded siblings. Everything above beginner has a way
  in from something easier.
- **No two exercises answer to the same name**, ignoring capitals, hyphens
  and plurals, across common names, other names and former names.
- **What each family is for** (ideas audit, 8): its purposes (strength,
  power, muscle building, endurance, mobility, balance and fall prevention,
  conditioning, control) and its usual place in a session (warm-up, main
  lift, accessory, finisher, cool-down), so variety means "the same purpose
  by another exercise". Proposed words, for the first book to refine.
- **For the clients Glenn sees** (ideas audit, 15: older adults, injury and
  post-rehab, pregnancy and postpartum, chronic conditions): chair-based and
  seated work, balance (its own pattern), getting up from the floor,
  step-downs, rotator cuff work, breathing and pelvic floor (their own
  pattern), tibialis raises. A chair is a support word.
- **Conditions and what to avoid** (ideas audit, 21): `conditions.json`, a
  table Glenn approves row by row (all drafts until then): each condition's
  facts and joints to avoid and to modify, whether a doctor's clearance comes
  first, and when to refer on; written out with its effect on the library in
  `CONDITIONS.md`. Glenn, 17 Oct 2026: "Let's just go with conditions table
  you have for now": the table is in use as drafted, every row still marked
  draft until he approves it formally (Billy says so if asked). Five facts were added for it (kneeling, deep hip bending or
  crossing the legs, quick head movement, all-out effort, strong pressure in
  the belly), and facts that follow from a position (kneeling, lying on the
  back or face down) are worked out, not typed.
- **A client's limitations** (ideas audit, 22) are written by their trainer in
  plain words, never a diagnosis, tied to conditions and facts; every trainer
  of the client sees them with who wrote each, and only the writer deletes
  one. Billy reads them before suggesting anything, and gets only what
  designing training needs about a client (an age, not a birthday, and no
  email or phone).
- **A trainer's own names and exercises** (ideas audit, 3): a trainer's name
  for an exercise (exx…) is kept in their memory, tied to the library or to an
  exercise of their own (exr…, the library's tag, so one can join it
  unchanged); a name nothing matches waits under "Names to sort out". A
  trainer can suggest one of their own exercises to Glenn for the shared
  library; the review page (idea 24) is where he will see them.
- **Billy's library tools filter in code** (ideas audit, 4): "find this
  exercise" takes any name (the trainer's own first, then their own
  exercises, then the library's names, common names and old names);
  "find alternatives" returns only versions that fit the place's equipment,
  the level and the client's limitations, the same movement first, widening
  to the same pattern and main muscles (same purposes first) when fewer than
  three in the family fit. Unanswered equipment comes back as a question to
  ask, never as a yes.
- **A document is read, never obeyed** (ideas audit, 23): nothing in a photo
  or PDF is taken as an instruction, and nothing reaches a trainer's memory
  from a message that carries one.
- **Every exercise says where it came from and whether Glenn has passed it**:
  `origin` (starter, book or trainer), `status` (draft, reviewed or retired)
  and `reviewed` (the date). All 230 are drafts until he reviews them.

## The rules (Glenn, 16 Oct 2026)

- **The trainer's word always wins.** Coach IQ is guidance and assistance only.
  When a trainer's program differs from it, Billy may say so once, plainly,
  then follows the trainer. He never overrules or argues.
- **Our own book, no sources shown.** Coach IQ is written as Trainability's
  own, in our own words. It never quotes a book at length and never names
  one. Trainers do not see where a principle came from.
- **Where books disagree, it gives the range**, not a side: what most of them
  say, and where the sensible options lie, so the trainer can choose.
- **Glenn reviews everything** before it is committed. Nothing goes in
  unread.

## How it is written

1. The first book was read in a Claude session (17 Oct 2026) and set the
   outline: one topic each, in `principles/`. Since build 1.0.16 the
   principles live in the app with the library (iq-store.js), edited and
   approved on Review Coach IQ → Principles; the files are their starting
   copy and a backup, refreshed from an export (`npm run iq -- --import`).
2. Later books are read in the app, on Review Coach IQ → Books (above). They
   add to the topics, and a new topic is made only for a subject nothing so
   far covers. PDFs are never committed to this repository.
3. Where a book disagrees with what is already written, it is put to Glenn
   to settle, with a recommended answer; nothing goes in until he accepts it.
4. The books read in the app are listed under Books, with what each added;
   `READ.md` keeps the ones read before.

## Files

- `README.md`: this page.
- `READ.md`: the books read into Coach IQ before reading moved into the app, for Glenn. Not shown to
  trainers and not given to Billy.
- `exercises.json`: the exercise library's starting copy (the library itself
  lives in the app; above), refreshed from an export when wanted: its
  families (`movements`, keyed by exf… id, with how they are usually counted
  and anything they always need) and their versions (`exercises`, each with a
  permanent exr… id, its attributes, common and other names, muscles, level,
  harder steps, cautions, origin and review status). The starter list (177
  exercises drafted by Claude, 16 Oct 2026) became 106 families and 230
  versions after the ideas audit; for Glenn to review, and the books add to it.
- `conditions.json`: the conditions table's starting copy, the same way.
- `EXERCISES.md`: the same library as tables, for reading and review. Written
  by `npm run iq`; never edited by hand. `npm run check-iq` (and
  `npm run check-docs`, which runs it) fails when an id, a word or a name is
  wrong or shared, a harder step is missing, lower, or loops, something above
  beginner has no way in, or this page is behind.
- `principles/`: the principles' starting copy, one file per topic, made from
  the first book's outline (17 Oct 2026); its README lists them. The
  principles themselves live in the app (build 1.0.16), and Billy reads the
  approved ones there (`server/principles.js`).

Not to be confused with `NEURALBRAIN.md`, which is the project's own memory
of how Coach was built.
