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

## Reading a book in the app (asked 16 Oct 2026, not built)

"When it comes to the Coach IQ \"knowledge upload\" of PDF, can we can that
in-app? Have a functionality for the primary master?"

The proposal: a Coach IQ page that only the Primary Master sees. They upload a
PDF; Coach reads it in the background a part at a time (a book is longer than
one request takes), showing progress, and throws the PDF away once read. The
result is a draft, topic by topic, of what is new, what changed and where the
book disagrees with Coach IQ, which the Primary Master accepts, edits or
rejects; nothing reaches Billy until accepted, and every accepted change keeps
where it came from and when. Coach IQ then lives in Coach's database, with that
history in place of git's, and this file stays as its rules. Waiting on: what
database the Coach app can have on GoDaddy.

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

1. Glenn gives the books one PDF at a time, in the session. The PDFs are never
   committed to this repository: they stay on his Mac.
2. The first book sets the outline: one file per topic in this folder.
   Later books add to those topics, and a new file is made only for a subject
   nothing so far has covered.
3. Each book's principles are drafted into the topic files in our own words.
   Where it disagrees with what is already written, the draft says so for
   Glenn to settle.
4. Glenn reviews the draft; it is then committed, and `READ.md` gets the book.

## Files

- `README.md`: this page.
- `READ.md`: the books read into Coach IQ so far, for Glenn. Not shown to
  trainers and not given to Billy.
- `exercises.json`: the exercise library, the list Billy will read. Its
  starter list (177 exercises, 16 Oct 2026) was drafted by Claude from general
  knowledge for Glenn to review; the books add to it.
- `EXERCISES.md`: the same library as tables, for reading and review. Written
  by `npm run iq`; never edited by hand. `npm run check-iq` fails when the
  library has a word not on its lists, an easier or harder version that does
  not exist, or when this page is behind.
- One file per topic, made from the first book's outline.

Not to be confused with `NEURALBRAIN.md`, which is the project's own memory
of how Coach was built.
