# Astor Library: the 2026 redevelopment

What was built, how it works, how to extend it, and what was deliberately left
out. The working plan that preceded it is in
[docs/redevelopment-plan.md](redevelopment-plan.md).

---

## 1. The short version

Astor Library was a very good reading site. Every page was prose, every visit
was identical, and there was nothing on it to *do*. This redevelopment keeps
the reading and adds the working: a structured study record for each of the
most-studied titles, a study guide for every one of them built from that
record, six explorer tools that work across the whole library, nine
revision games, spaced-repetition flashcards, an essay planner, an argument
builder, a daily puzzle, a personal dashboard, a teachers' area and a
site-wide search palette.

The architectural decision behind all of it: **one structured record per
title, and everything else is generated from it.** A quotation entered once
becomes a card on the book page, an entry in the explorer, a flashcard, a
printable worksheet line and a question in four different games. Correcting it
once corrects it everywhere.

| | Before | After |
| --- | --- | --- |
| Source pages | 393 | 433 |
| On-site study pages | 11 | 29 |
| Structured book records | 0 | 57 |
| Checked quotations on the site | 0 | 1,307 |
| Characters described | 0 | 510 |
| Theme and technique entries | 0 | 221 and 221, under 74 shared names |
| Dated timeline events | 0 | 646 |
| Mapped settings | 0 | 321 |
| Interactive tools | 0 | 22 pages |
| Automated checks | 1,354-line checker, 47 tests | 1,496-line checker, 98 tests |

The site loads no third-party script and sets no cookie for a reader who has
not asked for one. The one thing fetched from elsewhere is the map tiles on
the map of settings, from OpenFreeMap; everything else is served from here.

---

## 2. The new site map

Primary navigation keeps its five destinations and gains a sixth.

```
01 Books              /library/            (unchanged)
02 Browse library     mega panel           + a "Study tools" column (below)
03 Free resources     /resources/          (unchanged)
04 Study editions     /study/              + 18 generated study pages
05 Passage Room       /passage-room/       (unchanged)
06 Play & revise      /play/               NEW
   Search             palette, / or Ctrl-K NEW behaviour on the existing link
   My library         /my-library/         NEW utility link
```

### New pages

```
/play/                              hub: which games a chosen book supports, your scores, your streak
/play/who-said-it/                  name the speaker of a line
/play/fill-the-line/                put the missing words back into a speech
/play/theme-match/                  which theme is this line carrying
/play/technique-spotter/            name the device, and read what it is doing
/play/character-identification/     identify a character from a description that never names them
/play/order-the-plot/               put acts, chapters and scenes back in sequence
/play/which-book/                   one line, the whole library
/play/context-sprint/               place an event in the right year, against near misses
/play/opening-lines/                name the book from its first sentence
/play/flashcards/                   spaced repetition over a title's quotations
/play/essay-forge/                  build an essay plan paragraph by paragraph
/play/defend-the-reading/           argue a reading against the strongest case on the other side
/today/                             passage of the day, a book for today, an anniversary, the Daily Five
/explore/quotations/                every quotation, filterable by theme, technique, character, period, form
/explore/timeline/                  every dated event on one scale
/explore/characters/                SVG relationship maps that redraw act by act
/explore/themes/                    every shared theme, book by book
/offline/                           what the device holds when there is no signal
/explore/techniques/                glossary: each term defined once, then shown at work
/explore/map/                       where the books happen
/explore/compare/                   two titles side by side, with paired quotations
/my-library/                        saved, recent, progress, streak, scores, commonplace book
/for-teachers/                      lesson starters, six worksheet generators, projector mode
```

Plus a study guide for every title with a record (`/guides/`, then
`/guides/<slug>/` and one page per section), an invitation to it on every
`/books/<slug>/` and `/study/<slug>/` page that has a record, and eighteen
generated study pages for editions that previously sent readers straight to a
retailer.

---

## 3. How the content is structured

### `data/books/<slug>.json`

One file per title. `scripts/book-data.js` is both the loader and the schema;
`check-site.js` and the test suite both run its validator, so an unchecked
field is a field that will drift.

```jsonc
{
  "slug": "macbeth",
  "title": "Macbeth",
  "author": "William Shakespeare",
  "href": "/books/macbeth/",          // must resolve to a real page
  "studyHref": "/study/macbeth/",     // optional
  "buyUrl": "https://astorlibrary.com/go/book-slug",  // copied from the book page, never invented
  "form": "play",                     // play | novel | novella | story collection | poem | memoir | non-fiction
  "genre": "Tragedy",
  "period": "Shakespeare",            // one of the eight collection names
  "written": "c. 1606",
  "firstPublished": 1623,
  "setting": "Eleventh-century Scotland…",
  "readingTime": 135,                 // minutes
  "difficulty": 3,                    // 1-5, for a first-time reader
  "lengthNote": "Around 2,100 lines…",
  "openingLine": "When shall we three meet again…",
  "summary": "…",                     // book-specific; the validator rejects a thin one
  "referenceStyle": "act.scene.line, Globe/Moby line numbering",
  "sourceText": { "label": "Globe/Moby text of Macbeth", "note": "…" },

  "atAGlance":  [{ "label", "value", "note" }],
  "structure":  [{ "id", "label", "title", "summary", "scenes": [{ "ref", "title", "summary" }] }],
  "characters": [{ "id", "name", "role", "summary", "clue", "firstAppearance", "traits",
                   "relationships": [{ "to", "label", "kind", "stages": ["act-1"] }] }],
  "themes":     [{ "id", "name", "summary", "development" }],
  "techniques": [{ "id", "name", "definition", "inThisBook" }],
  "quotations": [{ "id", "text", "speaker", "reference", "stage", "context", "analysis",
                   "themes": [], "techniques": [], "characters": [], "source", "cloze": [] }],
  "timeline":   [{ "year", "label", "detail", "kind": "work|author|context|reception" }],
  "places":     [{ "name", "lat", "lon", "note" }],
  "criticalViews":      [{ "position", "summary", "counter" }],
  "essayQuestions":     [{ "question", "focus", "plan": ["…"] }],
  "discussionQuestions": ["…"],
  "related":    [{ "href", "why" }],
  "videos":     []                    // empty everywhere; see §7
}
```

Minimums the validator enforces: three structural stages, four characters,
three themes, eight quotations, a `reference` and a `source` on every
quotation, analysis of at least fifteen words, a speaker on every line from a
play, and referential integrity — a quotation cannot be tagged with a theme,
technique, character or stage the book does not declare, and a `cloze` word
must actually appear in its line.

### `data/vocabulary.json`

Theme and technique identifiers are shared across titles, so that filtering by
`ambition` or `frame-narrative` reaches every book that uses the term. Each
book still names the idea in its own words on its own page — Wuthering
Heights calls its nature theme "Weather, moor and the two houses" — but where
more than one book uses an identifier and names it differently, this file
supplies the one name the glossary and the cross-library filters use.

`node scripts/rebuild-vocabulary.js` reports which shared identifiers still
need one; `--draft` prints a starting point that preserves everything already
curated. `check-site.js` fails the build until every shared identifier has a
canonical name, which is what stops two different ideas quietly merging under
one heading as the library grows.

### Generated indexes

| File | Built by | Read by |
| --- | --- | --- |
| `assets/study-index.json` | `rebuild-study-data.js` | every explorer, the library-wide games, the daily puzzle, the teachers' page |
| `assets/search-index.json` | `rebuild-study-data.js` | the search palette only, and only once it is opened |

The study index is the whole library's study material in one request, so a
reader opening the quotation explorer makes one fetch rather than thirty. The
search index is deliberately small and separate, because the palette can be
opened from any page on the site.

---

## 4. How each feature works

### The study guides

The study material first lived on the book page, as a tabbed toolkit of
nine panels. It now has a guide of its own; see *Book pages, study guides
and Revise* below. `scripts/study-toolkit.js` still renders every panel and
`assets/astor/toolkit.mjs` still adds the save button, the per-act progress
ticks and ring, the quotation filters, the commonplace-book control on each
quotation, the reading plan, the revision sheet and the two maps.

### The games

`assets/astor/questions.mjs` is a pure module — no DOM — that turns records
into questions. That is why the same code builds the round a reader plays and
the round the test suite checks. Nine builders, six taking one book and three
taking the whole library. Question shapes: `choice`, `cloze`, `order`.

`assets/astor/engine.mjs` runs any of them in the same panel with the same
keyboard rules: number keys choose, Enter checks and advances, R restarts. The
end screen lists what was missed with a button to keep each line.

There is no separate question bank. From one Macbeth record the builders
produce 22 who-said-it questions, 22 cloze questions, 22 theme questions, 15
technique questions, 9 character questions and 5 ordering rounds, and every
explanation shown after an answer is the analysis printed on the book page.

Distractors are chosen to be hard rather than decorative: wrong speakers come
from the same play, wrong titles prefer the same *form*, wrong years are
within eighty years of the right one, and the cloze word bank is drawn from
the same book's vocabulary so register gives nothing away.

Every question has exactly one right answer, and the tests check it:

- **Who said it** never offers two names for one person. Speakers are entered
  short ("Scrooge", "Gloucester") and the cast in full, so wrong answers
  exclude any alias of the speaker, anyone the line involves, and aliases of
  each other; two cast members who share a name (Macbeth, Lady Macbeth) still
  appear together, because telling them apart is the point.
- **Theme match** and **technique spotter** ask about a line's first tag and
  draw wrong answers only from tags the line does not carry. (They first used
  only single-tagged lines, which left carefully tagged records with no
  questions; across the library the change took theme match from 317
  questions to 1,472.)

### The Daily Five

`dailyRound(index, day)` seeds a generator from the date string itself, so
every browser in the world computes the same five questions for the same day
with no server involved. One question from each of five kinds, never repeating
within a round. The result is a five-square grid that shows how many were
right and nothing about what they were.

### Flashcards

A five-box Leitner schedule at one, two, four, eight and sixteen days, held in
`assets/astor/store.mjs`. A card answered correctly moves up a box; a card
missed drops to the first and returns tomorrow. `dueCards()` decides what a
session contains.

### The explorers

- **Quotations** — filters on theme, technique, book, period and form, plus
  free text over the line, the speaker, the title and the analysis. Filters
  are reflected in the address, so a filtered view can be linked, and shown
  as chips above the results with their own remove. Cards arrive twenty-four
  at a time; on a phone the filter panel folds behind its heading.
- **Timeline** — every dated event on one scale, stacked into rows so nothing
  overlaps, with filters for period, book, kind of event and stretch of time.
  On a phone, which has no width to lay years along, it runs down the page
  instead, the year on the left and what happened on the right.
  It opens on the span holding most of its events, because a thousand years on
  one axis puts 1606 and 1611 in the same pixel. Selecting an event shows what
  else was happening within twelve years.
- **Character maps** — inline SVG, no library, drawn at the size of the box
  it sits in rather than scaled down from a fixed canvas, so the type is the
  same size on a phone as on a desk. Characters sit around a ring that becomes
  a tall ellipse on a narrow screen; their names sit outside it where the
  lines cannot reach them. Names are never shortened (an earlier pass turned
  "The Ghost of Christmas Yet to Come" into "The Come" and "King Richard II"
  into "King II"): each is measured in the type it is set in, wrapped onto two
  or three lines, and the ring is then narrowed until every name is inside the
  drawing and grown taller until no name touches another name or a node. A
  record may give a character a `shortName` where the full one is unwieldy.
  A tie declared from both ends is drawn once; line styles match the key; and
  each node carries an invisible 40-pixel disc so a fingertip finds it. All 57
  maps were measured at every act and section (399 drawings) at 320, 375, 768
  and 1280 pixels, and in the book-page embed: no overlap, no clipping. Lines
  are curved and carry no text: choosing a character lights
  their connections and dims the rest, and the panel beneath spells each one
  out with the parts of the book it holds in. Relationships that declare
  their stages appear and disappear as you step through the acts. The same
  map is embedded in the Characters tab of every book page, loaded the first
  time the tab is opened.
- **Themes** — every theme in the records, ordered by how many books share
  it, each opened to the books' own accounts of it side by side, how it
  develops in each, and a line from each that carries it, with a way through
  to every quotation carrying the theme and to a comparison of two of the
  books. Each theme on a book page links to its entry.
- **Techniques** — each term defined once from the shared vocabulary, then
  shown doing a particular job in a particular line in every book that uses
  it. Two hundred terms are reached through an A to Z bar and a search box;
  each entry opens on its definition and unfolds its examples when asked.
- **Map** — a real map. MapLibre GL (hosted in `assets/vendor/`) draws
  OpenStreetMap tiles served by OpenFreeMap, which needs no key and allows
  commercial use. Places that share a spot are one marker; markers that crowd
  each other gather into numbered clusters that open as you zoom; invisible
  stand-ins the size of each marker keep names off them. Choosing a marker
  lists what happens there, folded by book when there are many. The same map
  is embedded in the Context tab of every book page with a record, fitted to
  that book's places.

  Two earlier versions are worth recording, because the lesson stuck: dots on
  a graticule (which is not a map), then Natural Earth coastlines drawn from
  files this site serves itself (better, but "just a blank backdrop" to
  anyone expecting a map). The coastline version survives as
  `assets/astor/map-outline.mjs` and takes over whenever the real map cannot
  run: no WebGL, no tiles, a container with no height, or any thrown error.
  `scripts/build-map-geography.js` still prepares its coastline files.

  The map sets its own height in JavaScript rather than trusting the
  stylesheet. A phone holding an hour-old stylesheet with a fresh script once
  gave the map no height at all, which looked exactly like no map.

- **Compare** — two titles side by side, starting from the themes and
  techniques they share and pairing the quotations that carry them, because
  that is where a comparative paragraph actually begins.

### Reading plans and the revision sheet

The Revise tab of every book page carries two more things built from the
record.

**Plan your reading.** Choose a finishing date and the days of the week you
have free, and the book's acts or sections are shared out across them —
whole parts, never split, weighted by how many scenes or chapters each
carries, with a rough time for each sitting derived from the record's reading
time. Ticking a sitting marks its parts as read, so the plot tab and the plan
agree. The plan is kept in local storage, appears on My Library with its next
sitting, and downloads as a plain iCalendar file (one all-day event per
sitting) that any calendar application imports. The arithmetic lives in
`assets/astor/plan.mjs` with no DOM in it, and is tested against every record.

**One page to take with you.** A revision sheet — the shape of the book, who
is who, the themes in a sentence each, eight lines worth knowing with their
references (one per theme first, so the sheet covers the whole book), the
techniques, and three questions to practise on — drawn on the page and sent
to the printer on its own, with nothing else from the page around it.

### The mixed round, the catalogue and the homepage

A tenth game, the mixed round, draws a few questions of every kind a title
supports so a session changes its footing each time. The catalogue cards say
which titles carry a study guide, with reading time and difficulty from the
record, and a filter shows only those. The homepage carries the passage of
the day — the same one the Today page shows, chosen by the same arithmetic —
with the reader's own result if the device has one.

The five Expanded Scholarly Editions share the base play's guide through an
`editions` field on the record; with them, 114 book pages and 36 study pages
invite readers to a guide.

### Offline

A service worker (`sw.js`, stamped at build time with a version drawn from
the files it keeps) holds the study modules, the stylesheets, the quotation
index and each book's record on the device, and a copy of every study, play,
explore or book page the reader opens. Pages are network-first with the copy
as fallback; data is served from the copy while a fresh one is fetched;
nothing under `/api/`, `/account/` or sign-in is touched. A deploy that
changes any kept file is a new worker and a fresh cache. `/offline/` lists
what the device holds.

### Personalisation

`assets/astor/store.mjs` holds everything in one `localStorage` record:
saved books, recently viewed, per-book progress, game scores, revision streak,
the commonplace book, the flashcard schedule and daily results. There is no
account and nothing leaves the device.

Every read returns an empty value and every write is discarded when storage is
unavailable, blocked or full, so a browser with storage switched off still
renders every page correctly — it simply stops remembering. That path is
covered by tests.

Progress is *declared*, not inferred: a reader ticks an act when they have
read it, rather than having it guessed from how far they scrolled.

### Close readings and the guides

A guide's overview opens its *Read next* list with the Passage Room's close
readings of that book, and the book page keeps its own shelf of them, so the
ninety annotated passages and the study records point at each other.

### The search palette

`/` or `Ctrl-K` (or the existing Search link) anywhere on the site. It fetches
its index the first time it opens, never on page load, and searches books,
writers, subjects, collections, guides, study editions, close readings,
seasons, characters, themes, techniques, quotations and the tools — so
"Fleance", "equivocation" and "who said it" all reach a page.

### For teachers

Six generators, all producing printable output from the chosen title: lesson
starters, a quotation worksheet with ruled space, a character worksheet, a
sequencing worksheet, a discussion sheet built from the discussion questions
and critical positions, and a knowledge check with answers. `astor-study.css`
carries a print block that drops every control and opens every tab panel.
Projector mode puts one quotation on the wall at `clamp(30px, 6vw, 72px)`,
driven by the arrow keys, Escape to close.

### The Revise redesign (October 2026)

Every page under `/play/` and `/today/` now shares one design, set by the
`rx` block at the end of `assets/astor-study.css`. Each page takes the colour
and cover of the book being revised; right is always green and wrong always
red. The question data, schedules and saved progress are unchanged.

- **One study bar** (`studyBar()` in `revise-kit.mjs`) heads every one-book
  tool: the cover, title and author, *Change book*, and a row of every
  activity the book supports, so moving from a quiz to the flashcards for the
  same book is one tap (the row has since become one menu; see *Book pages,
  study guides and Revise* below). *Change book* opens a dialog of covers with search,
  recent books and a period filter (`openShelf()`), which replaced the old
  select list. `assets/revise-index.json` now carries each title's `period`.
- **The Revise home** opens on a jacket for the book: cover, opening line, a
  ring for the key lines known, the next session, and flashcards due. Below
  it, every key line is a square on a map, coloured by how well it is known;
  choosing one shows the line and its note. Activities are cards grouped as
  *Learn the words*, *Understand the ideas*, *Know the story* and *Write about
  it*, each showing a real example from the book.
- **The quiz stage** (`quiz-round.mjs`) answers each kind of question in its
  own way: speakers as monogrammed roundels, characters from a "character
  file" with the name struck out, book questions as the covers themselves,
  years laid on a timeline (with "you were 12 years out" afterwards), plot
  order by dragging cards or using arrows. After an answer every option
  explains itself (who that character is, what that theme or technique
  means) and a *Why not X?* note addresses the reader's own wrong choice.
  *Narrow it down* and *Show first letters* are hints; a line answered
  correctly after a hint scores, but is not promoted in the flashcard boxes.
  The results page has a score ring, a mark for each question, a pattern in
  the misses where there is one, each miss with its reason, and one next
  step.
- **Flashcards** turn in three dimensions and can be worked three ways:
  *Recall* (the line; say who, where and why), *Complete* (the moment and the
  first words; say the line) and *Memorise* (the line with more of its words
  reduced to first letters each step). Space turns, the arrow keys mark, and
  a turned card can be swiped. The five boxes are drawn as stacks under the
  card. The chosen mode is remembered in `astor-flashcard-mode`.
- **The essay planner** is four steps — question, argument, paragraphs,
  review — with coaching on whether the argument and each paragraph do their
  job, starters to click in, the model route to compare against, and an
  evidence picker that puts the quotations fitting that paragraph's step
  first. Plans are kept per book and question in `astor-essay-plans` and can
  be copied, downloaded or printed on their own.
- **Defend the reading** is set as a debate: the reading against the
  objection, with a balance that tips as evidence is added, then the unused
  line that tells most against the reader's case, to answer in writing.
- **Today** is set as an almanac: the date, the Daily Five as the main event
  (no hints), then the passage, book and anniversary of the day with covers.

**Second pass: games, not worksheets.** Each activity page now opens with
its name and one sentence; the "How it works" and "Why this helps" sections
are gone. On a phone the breadcrumb and heading give way to the study bar,
so the question is on the first screen. The progress bar fills green and red
with a running score and streak; each game carries its emblem and its own
dress (speech bubble, highlighted specimen, coloured theme tiles, ruled
paper, character file). After an answer only the right option and the
reader's own carry a note; the verdict is one line with Next beside it (it
stays in view at the foot of the screen on a phone), and the full note is
folded under *Why?*. Completion screens count the score up inside its ring,
award up to three stars, and fold the misses away behind one line.

**Final polish.** Stars mean the same thing in every activity: one for
finishing, two for 70 per cent or better (7 out of 10, 4 out of 5 on Today),
three for a perfect round (`starsFor()` in `quiz-round.mjs`). The completion
screen shows the key with the next star picked out, and the Revise home shows
each quiz's best stars. Misses on the completion screen are soft numbered
tiles under "Try the ones I missed again". In Order the plot the checked
cards slide into the right order, each saying where the reader had it.
Anything the pages scroll to stops clear of the sticky site header
(`--rx-header`, measured in `revise-kit.mjs`), the activity row shows arrows
when there is more to swipe to, and the end-of-page links sit in a compact
row on phones.

*(Superseded: the editions described in the next passages, with their cover
bands, emblems and per-book palettes, were removed in late October 2026; see
"A plainer guide and Revise" below. Only the book's colour remains.)*

**Editions: every book its own design.** Revise now dresses itself in the
book being studied, taken from that book's Astor edition, while navigation,
controls, game mechanics and accessibility stay identical everywhere. There is
one interface and one stylesheet; what varies is a small set of tokens and
three choices, worked out for each title at build time:

- *Colours.* `scripts/build-edition-colours.mjs` (run by hand, like
  `build-book-accents.js`) reads every cover in Chromium and records the
  ground it is printed on and its ink in `assets/edition-colours.json`.
  `scripts/editions.js` turns that ground and the book's accent into a light
  and a dark palette (paper, surface, ink, soft text, accent text, button,
  hero, right, wrong, star). Every pair that carries text is pushed until it
  meets its contrast ratio, so no edition can ship unreadable.
- *Mode.* A cover printed on a deep colour (Jane Eyre's green) or a Gothic,
  ghost, horror or sensation title starts dark; the rest start light. Dark is
  simply one aspect of a book's design. The sun/moon button in the study bar
  and the Revise home lets the reader override it (stored as
  `astor-revise-mode`; choosing the book's own mode clears the override), and
  a reader who set the whole site dark gets the dark palette.
- *Register.* From the book's period, form and genre: `layout` (centred for
  tragedies, poems and epics; page for Regency, Victorian and earlier prose;
  framed for Gothic, comedies and modern novels), `voice` (italic, roman or
  caps display type) and `texture` (plain, laid paper, ruled lines, grain or
  a lamplit glow). Layout changes how a question, the feedback, the
  completion screen, the Revise home's hero and the quotation map are
  composed; it never moves a control.

`scripts/edition-overrides.json` adjusts any title by hand (accent, ground,
mode, layout, voice, texture, or individual palette colours); Macbeth's
deeper red and Hamlet's ink-violet are set there. Each book's edition is
written into `assets/revise-index.json`; `applyEdition()` in
`revise-kit.mjs` sets the `--ed-*` tokens and the `data-edition`,
`data-ed-mode`, `data-ed-layout`, `data-ed-voice` and `data-ed-texture`
attributes on `<html>`, and the "rx: editions" block of `astor-study.css`
does the rest. Pages that range across the library (Today, Which book?)
keep the house edition. A new book gets its edition automatically when the
study data is rebuilt; run the colour sampler once for its cover.

**The cover.** Every Astor cover is a flat ground scattered with small line
drawings chosen for the book: Macbeth's crowns, ravens and thistles,
Frankenstein's flasks, hearts and lightning. `scripts/build-edition-art.mjs`
(run by hand) finds those drawings, erases the lettering, and writes two
masks per book to `assets/editions/`: the cover's own field of drawings and
a strip of up to eight different emblems, plus the drawings' ink colour in
`assets/edition-art.json`. Revise then wears the cover:

- each activity page opens on a band of the cover's ground and drawings,
  with the activity's name lettered in spaced capitals like a cover title;
  the question, flashcard or planner sits on it as a page;
- progress is a row of the book's emblems, lit as each answer is won;
- each question is headed by one emblem, and a right answer throws a few of
  them off the button;
- the completion screen is set as the cover, with the score for its title;
- the Revise home's hero is the cover, opened, and each activity card
  carries an emblem.

In light mode the band is the cover's true ground and ink; in dark mode a
pale cover turns to night with its drawings in the accent. A mid-tone cover
is deepened just enough for its lettering to pass contrast. For the few
covers whose titles touch their drawings, `eraseTitle` and `dropMotifs` in
`scripts/edition-overrides.json` clear what the detector misses.

**One design, every edition.** A refinement pass gave every activity the
same underlying parts, so a game looks like itself in every book while each
book keeps its own colours, drawings, type and frame:

- *The card.* What is asked, headed by one of the book's emblems; the
  prompt (centred, set on the page, or framed, by edition); the answers as
  one kind of tile with a monogram for people; hints and Skip at the foot.
  Editions vary two radii (`--rx-r-card`, `--rx-r-tile`), not the structure.
- *The verdict* sits in the card, below the answers, tinted for right,
  wrong or shown, with the answer in bold and Next beside it; it never
  covers the answers, and the page scrolls only as far as it needs to.
- *Phones.* The book bar, activity row, activity name and progress take
  about 60px less than before; titles wrap to two lines rather than clip;
  the activity row fades at whichever end has more instead of putting
  arrows over the labels (arrows remain for a mouse).
- *Results* say something true about the round (`resultWords()` in
  `quiz-round.mjs`): a headline for the score ("One away from perfect.",
  "A tough round."), a comparison with the reader's best and last go on the
  book ("A new best, up from 5.", "Up from 3 last time."), where the misses
  cluster, and the next star. A new best of half marks or more earns a
  badge. The words sit on a panel of the cover's ground so the drawings
  never cross them. The second go at missed questions is labelled, has no
  stars, and ends with how many were put right.
- *Order the plot* shows "The story so far" with a dot for every event,
  and says "Nearly" for one or two slips.
- *Flashcards, the essay planner and debate* use the same card and tiles;
  the essay planner's example argument names the book's own writer.
- *Keyboard focus* is drawn in each edition's accent, so the ring stays
  visible on Jane Eyre's green as well as Macbeth's ivory.
- *The Revise home* puts "Start here" on the session button and the
  activities straight after the hero; on a phone each activity is a compact
  row with its emblem on the cover's ground.

**Refinement: flashcards, navigation, the essay planner.** A further pass
kept the cover-based design and worked on use:

- *Flashcards* are as tall as what is on them: only the side showing sets
  the card's height, and the card grows or shrinks to the other side as it
  turns. Each mode says what it asks in one sentence under the switch.
  Recall's back answers the front (who, then where, then why); Complete's
  back sets the words the reader had to supply apart from those given;
  Memorise counts its four steps in the card's corner, has "Show more
  words" to step back, and a hidden word can be tapped to peek at it.
- *On phones* the activity row is replaced by one control: the current
  activity's name, lettered on the cover, which opens to every activity the
  book has as a grid of named tiles. Nothing is cut short.
- *Lettering on the cover* (an activity's name, the progress count) has a
  halo of the cover's own ground, and a soft patch of it behind the heading
  block, so a drawing passing behind never crosses the words. The drawings
  themselves are untouched.
- *The Revise home* sets its cover as one row on tablet and desktop: the
  activities start about 680px down instead of 870–1,230px.
- *The essay planner*: writing boxes grow with the writing; each part of a
  paragraph (Point, Evidence, Analysis) says what it is for beside its
  label; sentence starters swipe as one row on a phone; the review page,
  help, links and coaching take the edition's colours; the review's actions
  sit in one row.
- *Debate* uses the same cards and tiles; the reading and the objection are
  marked as two sides of an argument rather than in right/wrong colours.
- *Keyboard focus* and the book title in the study bar are comfortable
  targets in every edition.

**Content review (October 2026).** The study records behind Revise were
checked against the books themselves, using the Standard Ebooks texts:

- *Every quotation* in the 36 books whose source is a Standard Ebooks text
  was found word for word in it, and all 773 chapter references point to
  the right chapter (scripts/verify-quotations.js, run offline against the
  texts). In the 21 most-studied books every quotation was also checked
  for speaker and reference by hand.
- *220 corrections* were made to what surrounds the quotations: wrong
  speakers, contexts that misplace a line, analyses that miscount words or
  chapters or misstate a plot fact, character facts, technique tags that
  break their own definitions, and first appearances counted consistently
  (the first time a character is on stage or on the page). Every
  correction was checked against the source text by a second reviewer
  before it was made; anything that was only a matter of reading was left
  alone.
- *The question builder*: one person can no longer be offered twice under
  two names (characters may list `aliases`), a name always matches itself,
  speakers read correctly inside a sentence ("spoken by the Witches", "the
  Third Apparition"), and the word bank no longer keeps a stray quotation
  mark.
- *Still to do*: the same field-by-field review for the remaining 88
  books. Their quotations were checked automatically where a text was
  available; the 84 lines that could only be compared with a different
  edition (mostly Shakespeare against the MIT text) still need a reader.

Order the plot is now played by tapping the events in the order they
happen: a correct tap places the card, a wrong one counts as a slip, so the
story assembles itself without dragging.

`tests/revise-experience.test.mjs` checks that every question in every
one-book activity comes from the chosen book, that the study bar offers
exactly the activities a book can run, that every activity page carries
the study bar and its instructions, that every book has a valid edition, and
that both palettes of every edition keep text readable, and that every book
has its cover drawings and legible lettering on its band, and that the
completion screen's words match the round (score, best, last go, second go).

### Revise on the live site (October 2026)

Some failures could happen for a returning reader on the live site but not
in a fresh test browser. These are now fixed:

- **Pages start last.** `revise-hub.mjs` called `start()` above its
  `let shelf` declaration. The owner's browser checked `shelf` as soon as
  `shelf = await loadShelf()` began, so every Revise home page said "The books
  didn't load. Reason: ReferenceError: Cannot access 'shelf' before
  initialization". The test browser, which only checks after the `await`,
  never failed. Every study module now starts its page as its last
  statement, and `tests/revise-experience.test.mjs` fails if a module
  declares anything after its first top-level call.

- **One module version per page.** Browsers keep `/assets/*.mjs` for up to
  an hour (`max-age=300, stale-while-revalidate=3600`), while pages, styles
  and data always arrive fresh. After a deploy, a reader could therefore run
  stale modules against a new page, or old and new modules together. An
  import then failed, and the page sat on "Finding your book…".
  `build-static.js` now stamps every `/assets/astor/` module, every import
  between modules and the service worker's module list with one version
  drawn from all of them. A new export can never meet an old importer.
- **Older Safari.** Fill the line used a lookbehind `RegExp`, which Safari
  only supports from 16.4. On older Safari it threw and took the Revise home
  page, Today and the mixed round down with it. `wholeWordAt()` in
  `questions.mjs` now checks the preceding characters by hand, with identical
  results on every word lookup in the catalogue. Change book falls back to a
  fixed panel where `<dialog>` is missing (Safari before 15.4), and so does
  the search palette.
- **One activity cannot take the others down.** Every builder runs through
  `buildSafely()` (in `revise-kit.mjs`), so an activity that throws is left
  out. The hub then says which activity couldn't be prepared and why. The
  hub draws its cover, activities, lines and library quizzes separately, and
  Today and the mixed round skip a builder that throws.
- **Books that lack an activity.** Quiz pages open, and offer in Change book,
  only books that have the activity: 65 books have no Order the plot and 28
  have no Who said it?. A remembered book without it used to open on "There
  aren't enough questions of this kind". If the address asks for such a
  book, a note says so and another book opens.
- **Failures say why.** Load failures show their reason, e.g.
  "/assets/revise-index.json answered 403". `assets/revise-watch.js`, a
  classic script ahead of the modules on each Revise page, reports a study
  module that cannot load or run instead of leaving the page on its
  placeholder. It ignores errors from other scripts.
- **Damaged saved data.** `store.mjs` and the essay planner repair a saved
  record of the wrong shape when they read it, rather than stopping the page.
- **Offline.** The service worker now keeps `/assets/revise-index.json`, so
  Revise opens offline after one visit.

Every push to `main` and to the Revise branch deploys to the live site
through Workers Builds. A branch must merge `main` before it pushes, or its
deploy takes `main`'s newer fixes off the site.

### Book pages, study guides and Revise (October 2026)

Each title is now three connected places, each with one job: the book page
to discover and buy the edition, the study guide to read and learn, and
Revise to practise. Each links to the other two: a row of three tabs
(`bookWays()` in `scripts/guide-pages.js`) on the book page and at the head
of every guide page, the links at the foot of each guide page, and the foot
of Revise's activity menu.

- **Study guides.** `scripts/rebuild-guides.js` (run by
  `rebuild-library.js`) writes `/guides/` and, for each of the 109 titles
  with a record, an overview at `/guides/<slug>/` and one page per section
  it has: `plot`, `characters`, `themes`, `quotations`, `language`,
  `context` and `essays` (873 pages in all). The source pages are stubs;
  `addGuide()` in `build-static.js` fills each one from the record with
  the same panel functions the old toolkit used, so every word of it is
  still there, as real HTML. The overview holds the summary, the facts at a
  glance, a card for each section, the ways into Revise, the reading plan,
  the revision sheet and *Read next*. Each page has its own title,
  description and canonical address; a contents list sits beside the text
  on a desktop and folds into one *Contents* control on a phone. The
  guide wears the book's edition (`wearEdition()`), the same palette, band
  art and motifs as Revise, in light and dark.
- **Book pages** are publishing pages again. The hero now carries the
  cover; below it are the description, what the edition is and includes,
  the buying options, the facts, previews and the Passage Room shelf, all
  as before. The toolkit has given way to one invitation (`section.book-study`,
  `renderStudyInvite()`): a card for the guide, with links to its
  sections, and a card for Revise, in the book's colours. Macbeth's page
  went from about 44,500 characters of text to about 13,200; nothing that
  was on the page outside the toolkit was removed.
- **Old links still land.** The toolkit's fragments (`#astor-quotations`,
  `#astor-quote-…`, `#astor-character-…` and so on) forward from the book
  and study pages to the matching guide page and item, on load and on a
  same-page hash change. Search results, the explorers, the Revise home,
  quizzes, Today and My library now link to guide sections
  (`guideHref()` in `assets/astor/util.mjs`). Saved books, recent visits,
  reading progress, plans and the commonplace book use the same keys as
  before, so nothing a reader saved is lost.
- **A calmer Revise home.** The cover opens with the book's line, one card to
  start a session, and one line of progress beside *Change book* and the
  light/dark switch. The statistics panel and example previews are gone.
  Activities sit in three plain lists, *Practise*, *Learn* and *Write*, one
  line each with its best stars or what is due.
- **One activity menu.** The study bar on every activity is now the cover,
  title, *Change book* and one *Activities* menu, the same at every width,
  grouped like the home page and ending with links to the edition, the
  study guide and the book's Revise home. It replaces the horizontal row
  of activities and its arrows. The question comes straight after.
- **One light/dark switch.** On Revise pages the header's switch now
  dresses the book as well (`watchSiteTheme()` in `revise-kit.mjs`), and
  the header and footer take the book's mode (`matchSiteTheme()`), so the
  switch always shows what the reader sees. The choice is kept in
  `astor-revise-mode`, as the Revise home's own button keeps it.

An independent review of the restructure then found and fixed: the Sign of
Four hero picking up a magazine scan from outside its edition card; "M. R.
James: Collected Ghost Stories" shortened to the author's name; headings
in the guides jumping from h1 to h4 (they now run h1, h2, h3, with the same
look, checked heading by heading); guide pages shared with the site logo
instead of the cover; the period order on `/guides/`; old `#astor-watch`,
`#astor-related` and `#astor-revise` links and percent-encoded links not
reaching their place; forwarded links landing under the sticky header;
the guide's Contents sliding under the header on phones and tablets; the
reading ring showing only on the plot page; My library's *Carry on*, kept
quotations and *Open the plan*, and the technique glossary and Compare,
still pointing at the edition page; a book saved from an Expanded
Scholarly Edition showing as unsaved on the guide; the Revise home's
progress line squeezed beside the cover on phones; *Your key lines*
scrolling under the header; keyboard focus rings lost against the cover
bands (they now take the band's lettering); guides printing in the dark
palette's pale inks (dark colours are now screen-only, and a printed guide
drops its navigation); and the Revise breadcrumb's current page being hard
to read on dark editions.

`tests/study-data.test.mjs` checks the guide pages (unique ids, quotation
ids kept, escaping). The restructure was checked by comparing every text
segment of the old toolkit with the new guides (73,658 segments, none
missing) and every other segment of the old book and study pages with the
new ones (27,517 segments).

### A plainer guide and Revise (late October 2026)

The guides and Revise had been designed to one formula: every piece of
information in its own box, cover bands and emblems on every page, pills,
icons, stars and small capitals everywhere. This pass takes most of that out
rather than restyling it. Everything a reader could read, do or save before
is still there; the sections above that describe edition palettes, cover
bands, emblems, monograms and stars describe what this pass removed.

The rules, all in `assets/study.css` (loaded after `astor-study.css` on guide,
edition and Revise pages):

- Plain paper, the site's own light and dark tokens. A book changes only one
  colour (`--book-accent`), used for links, the one strong button and a few
  rules. No page wears a cover band, a texture or a per-book palette, and no
  page switches the site's theme on the reader's behalf.
- Georgia for everything that is read; the sans only for the few labels and
  controls, never below 13px, body text 18 to 19px.
- No box unless it is a thing you hold (a flashcard) or press (a button).
  Separation comes from space and the occasional hairline.

**The guides.** The overview is a title page: cover, author, title, the
summary, *Begin with what happens*, then one contents list (numbered, with a
line on each section), a short *Alongside the guide* (Revise in a sentence,
the reading plan and revision sheet folded behind one line each), *Read
next* as a plain list, and the facts about the book at the foot like an
imprint page. Gone: the cover band, the edition/guide/Revise tab row, the
grid of section cards (which repeated the contents), the facts grid at the
top, the Revise card, the boxed planner and the row of links at the foot.

A section page is a reading column (38rem) with the one contents list beside
it on a wide screen and after it on a phone, so a phone opens on the text.
The panels in `scripts/study-toolkit.js` now write book-like markup (`gd-`
classes) with headings at their proper levels. Quotations are grouped under
the part of the book they come from; each is the line set large with a rule,
then the speaker and reference, then the moment in italics, then the
commentary, so the four read as different things by type alone. The theme
filter pills and the tag row on every quotation are gone (the quotation
explorer, linked at the foot, still filters). *Save* and *Mark as read* are
quiet text buttons; reading progress is one sentence on the plot page.

**Revise.** An activity opens on one quiet line naming the book (with
*Change book*), the activity's name with *Other activities* beside it, a
count and a hairline for progress, and then the question: the line set
large, the answers as ruled rows. The verdict is one sentence with *Next*
beside it; the note on the line folds under *Why?*. Removed: the cover band
and the emblems lit as progress, the score chip and streak, the emblem in
each card's corner, monograms on speakers, drawings thrown off right
answers, shakes, slides and the count-up, the 50:50 roundel, stars on the
completion screen and on the home. Results are the score, one line on what
it means, one button, and the questions missed with their answers, shown
rather than folded. Flashcards are a card that shows one side at a time
(no 3D turn), with *Not yet* and *Got it* under it; the five Leitner boxes
appear once, as figures, at the end of a sitting. The Revise home is the
book, one line of progress, one way to start, the activities in three plain
lists, the key lines folded, and the library quizzes as a list. The debate
lost its tipping-balance drawing.

The edition palettes, the lifted cover art and the activity icons
(`scripts/editions.js`, `edition-overrides.json`, `build-edition-colours.mjs`,
`build-edition-art.mjs`, `revise-icons.js`, `assets/edition-*.json` and the
218 masks in `assets/editions/`, about 7 MB) are gone too, and with them most
of `assets/revise-index.json`, which every Revise page loads first: 192 KB
became 62 KB. A test now checks the one thing left of them, that each book's
colour reads as a link on paper, as a button with cream lettering, and as a
link in dark mode.

**Book pages, built leaner.** On the built edition pages the purchase
choices appear once (the buy box; the hardback panel and the edition card's
shop button, which repeated its links, are dropped), the further-reading
shelf no longer repeats the close readings and free guides listed above it,
and the strip of four facts and the "On this page" line are left out, so a
page opens on the book, the buy box and the way into its guide. All of this
is done in `build-static.js` and `site.js`; the source pages, which
`check-site.js` reads, are unchanged. Section ids are kept, so links such as
`#movement` and `#hardback-edition` still land.

**Verse keeps its lines.** The records stored every quotation as one run of
words, so verse read as prose with stray capitals once it was set large.
`scripts/restore-lineation.js` finds each quotation from a play, poem or
poetry collection in the source text it was checked against and copies the
source's line breaks into it as `\n`. It takes them only when every new line
opens with a capital and none runs longer than a verse line, which keeps out
the prose the sources also break (the MIT Shakespeare's numbered prose lines,
Gutenberg's wrapping); the two poetry collections that marked line ends by
hand with " / " were converted too. 715 quotations in 41 records now carry
their lines, and `verify-quotations.js` still finds all of them. A quotation
set on its own shows the breaks (`white-space: pre-line`); one run into a
sentence, or copied into a plan, shows them as " / " (`inline()` and
`quoted()` in `revise-kit.mjs`), as an essay quotes verse.


---

## 5. Accuracy

**Every quotation on the site was located in a public-domain text before it
was published.** Two mirrors were used, both reachable from the build
environment:

- **Shakespeare** — the Globe/Moby text, which carries act, scene and line
  numbering. References are recorded as `act.scene.line` and labelled as Globe
  numbering, because modern editions differ by a line or two and the site says
  so rather than implying a single authority.
- **Prose and prose drama** — Standard Ebooks sources, which are proofed
  Project Gutenberg transcriptions. References use the division each work
  itself uses: chapter, stave, phase, epoch-and-narrative, letter, book.

A mechanical verifier was run over the finished data: it normalises each
quotation and each source text to the same form, locates the line, and checks
that the declared reference is the line or chapter the quotation actually
starts on.

**Final result: 1,307 quotations checked. All were found. 1,299 match their
source exactly; the remaining eight differ only in the terminal punctuation of
a quotation cut short — a colon or comma closed with a full stop, which is
ordinary editorial practice.** Five references that pointed at the second line
of a quotation rather than the first were corrected. Three prose quotations
that had silently dropped a narrative interruption were retyped against their
source.

Divergences from a source that are deliberate, and recorded in the data:

- *Macbeth* 1.1.12 is attributed to "The Witches"; the Globe text tags it
  `ALL`.
- The *Romeo and Juliet* prologue is attributed to "Chorus"; the Globe text
  leaves the speaker blank.
- *The Tempest* 1.2.461 ("Full fathom five") is attributed to Ariel, who sings
  it; the Globe text carries it inside Ferdinand's speech because of where the
  stage direction falls.
- *The Taming of the Shrew* uses the catalogue's spelling "Katherina"; the
  Globe text tags `KATHARINA`, and once `KATARINA`.
- The Shrew's Induction is cited as "Induction 1" and "Induction 2"; the Globe
  text numbers those scenes 0.1 and 0.2.
- *Twelfth Night* attributes Feste's lines to Feste; the Globe text prefixes
  them `Clown`, and the play names him at 2.4.
- *Coriolanus* attributes his early lines to Coriolanus; the Globe text tags
  them `MARCIUS`, since he has not yet been given the name.
- *The Woman in White* cites epoch, narrator and chapter, which is how the
  novel divides itself; the Standard Ebooks headings carry each narrator's
  full title instead.
- *Gulliver's Travels* cites the Letter to Sympson by its own heading; the
  source file files it under "Preface".

Other accuracy rules applied throughout:

- **No critic is quoted anywhere.** `criticalViews` describes critical
  *positions* in the site's own words, each with the strongest objection to it.
  No words are put in a named critic's mouth, and no reviews, sales figures,
  statistics or testimonials were invented.
- **No exam board is named**, anywhere, and `check-site.js` fails the build if
  one appears. The teachers' area says plainly that it is board-neutral and
  that material should be checked against a reader's own specification.
- **Uncertain dates are hedged or omitted.** Composition dates are given as
  "c. 1606" where that is what the evidence supports. Every contributor
  recorded what they could not verify and left it out rather than filling the
  field.
- **Buy links were copied exactly** from the existing book pages. None was
  invented, and none was changed.
- Where a corpus is a particular text, the record says so: *Frankenstein* here
  is the 1831 revision, not the 1818 first edition, and *The Picture of Dorian
  Gray* is the twenty-chapter 1891 book rather than the 1890 magazine version.

One judgement call to flag. The brief lists "supplied" among the banned
machinery phrases, alongside "uploaded" and "this page uses". It is read here
as banning the machinery sense — a page describing its own construction — and
not the ordinary literary one. The site already uses the word that way
sixty-odd times ("Harsnett's Declaration supplied Edgar's fiends"), and
`check-site.js` has never banned it, so banning it only in the new records
would have made them read differently from every page around them. Thirteen
ordinary uses remain in the records; the machinery senses are caught by the
existing checks. Easy to reverse if the intention was the stricter one.

One limitation worth naming. The source texts are not always the text the
Astor edition itself prints. The clearest case is *The Great Gatsby*, where
the source anglicises spelling — "judgements", "grey", "honour", "orgiastic" —
against the 1925 American first edition. Every quotation was copied from the
source exactly, as the brief required, and each record's `sourceText` says
which text that was; but somebody should decide, once, whether the site's
quotations follow the source texts or the Astor editions, and then make the
two agree. It is a decision about house policy rather than an error, and it is
recorded here so it is not discovered by a reader.

---

## 6. Quality gates

```sh
node scripts/rebuild-library.js     # catalogue, discovery, study pages, study data, vocabulary check
node scripts/build-static.js        # header, footer, metadata, JSON-LD, the guides and invitations, dist/
node scripts/check-site.js          # links, structure, editorial safeguards, the data layer
npm test                            # 108 tests
```

`npm run predeploy` chains build, check and test. CI additionally reruns
`rebuild-library.js` and fails on any diff, so every generated file must be
committed in its rebuilt state.

New checks in `check-site.js`:

- every record passes the schema
- every `href`, `studyHref` and `related.href` resolves to a real page
- every search-index entry points at a page that exists
- the published indexes cover exactly the records on disk
- every shared theme or technique identifier has a canonical name
- no technique name is entered under two different identifiers (this found
  five: `narratorial-voice`, `free-indirect`, `doubling-technique`, `songs`
  and `first-person-retrospect`, each a shared term entered again under a
  private id, so the glossary showed the term twice with half its examples
  under each; all five are merged)
- no record contains banned build wording, `sizes="auto"`, or an exam board
- play references are `act.scene.line` or a named division
- every generated page loads a module that exists, carries a `<noscript>`
  fallback and links the study stylesheet
- `docs/` never reaches `dist/`

New tests: `tests/study-data.test.mjs` (17), `tests/study-games.test.mjs`
(17), `tests/astor-store.test.mjs` (19), `tests/reading-plan.test.mjs` (8). They found two real bugs before
release — a cloze answer returned in the wrong case, so a correctly-filled
line failed to rebuild; and a character clue that contained the name it was
asking the player to guess.

The built site was also driven in a real browser (headless Chromium) across
every new page: tabs, filters, save buttons, progress ticks, all nine games,
the flashcards, the essay forge, the argument builder, the daily puzzle, all
six explorers, the dashboard, the teachers' generators, projector mode and the
search palette, plus keyboard-only play and a check for horizontal overflow at
390px. No console errors, no failed requests, no overflow.

A second pass, made after the first review, went through every new page in
a phone-emulating browser as well as at desk width and found what the first
had missed: the character map's labels piled into the middle of the drawing
and shrank with it on a phone; the map of settings drew three hundred labels
over each other; the quotation explorer and the glossary were a hundred and
seventy thousand and two hundred thousand pixels tall on a phone; the timeline
truncated every label to nothing at that width; and the book chooser's
`<select>` overflowed the viewport on every tool page. All of it is redrawn
or paged, and the screenshots at 390px and 1280px are clean.

---

## 7. What was not built, and why

**Videos (added later, 19 September).** The first build environment had no
internet access, so it shipped the click-to-load component with every record
set to `"videos": []`. A later pass with network access added 46 videos to
sixteen of the most-studied titles, from the RSC, Shakespeare's Globe, the
National Theatre, the British Library, the Folger, TED-Ed, CrashCourse, BBC
Teach, Yale and the Charles Dickens Museum. Each id was checked twice through
YouTube's oEmbed endpoint (`https://www.youtube.com/oembed?url=…`), which
returns the title and channel of a live public video and an error for anything
else, and the channel was matched against the record's `source`. The player
is embedded with `referrerpolicy="strict-origin-when-cross-origin"`: YouTube
refuses an embed that sends no origin at all.

To add one, verify the id the same way, then put an entry in a record:

```json
"videos": [{
  "title": "Macbeth: Act 1 Scene 7",
  "provider": "youtube-nocookie",
  "id": "<the video id>",
  "url": "https://www.youtube.com/watch?v=<the video id>",
  "note": "One sentence on what this is and why it is worth watching.",
  "source": "Royal Shakespeare Company"
}]
```

`provider` must be `youtube-nocookie` or `vimeo`; anything else fails the
build. The page contacts nobody until a reader presses Play.

**Critics' quotations.** In copyright, and unverifiable here. Positions are
described in the site's own words instead.

**Supabase integration.** The brief allowed it "only if it is clean to do so".
It would not have been: the personalisation store is device-local by design,
and putting reading history behind an account would have meant either a
migration path for anonymous data or a feature that only works once signed in.
Neither is an improvement on a store that works for everyone immediately. The
existing auth layer is untouched.

**Books without a record.** 57 of 141 titles have one, chosen by how widely
each is studied and by whether a checkable public-domain text was reachable.
The remaining 84 book pages are exactly as they were — no broken links, no
empty panels, no "coming soon". A title joins the platform when its record
does.

**Line numbers where a source has none.** *Paradise Lost* is referenced by
book rather than book and line, because the source text carries no line
numbers and counting them would have produced numbers nobody could check.
*Mrs Dalloway* has no chapters at all, so its quotations are placed by the
episode of the day they fall in. Both records say so in `referenceStyle`.

---

## 8. Adding a book

1. Write `data/books/<slug>.json`. Copy an existing record for the shape.
   Put the plain-text URL of the public-domain source in `sourceText.url`
   (a Project Gutenberg "Plain Text UTF-8" file), then run
   `node scripts/verify-quotations.js <slug>`: it fetches the text once into
   `.cache/`, and every quotation and the opening line must be found in it
   word for word. Hyphenation and dashes are ignored; spelling is not.
2. Reuse an existing theme or technique identifier where you mean the same
   idea. If you introduce a shared one, run
   `node scripts/rebuild-vocabulary.js --draft` and edit the canonical name.
3. `node scripts/rebuild-library.js` — this validates the record, regenerates
   the indexes, writes a study page if the title has an Astor study edition,
   and flips its hub card to point at the page.
4. For a play, poem or poetry collection, `node scripts/restore-lineation.js
   --write <slug>` gives its verse quotations their line ends. The book's
   colour comes from `scripts/build-book-accents.js`; the test suite checks
   it reads as a link and a button in both themes.
5. `node scripts/build-static.js && node scripts/check-site.js && npm test`.

The book page, the study page, the explorers, the glossary, the timeline, the
map, the search palette, nine games, a flashcard deck, the essay forge, the
argument builder, the teachers' generators and the daily puzzle all pick it up
from that one file.

---

## 9. Recommended next steps

1. **Verified videos.** Add ids for the RSC, National Theatre, Globe Player,
   British Library and university lectures from a machine with network access,
   one title at a time. The component is waiting.
2. **The remaining 84 titles.** The source-text work is the slow part; the
   platform work is done. Priorities by likely use: the rest of the history
   plays and late romances, the remaining Victorian novels, and the seasonal
   collections and story anthologies, which have no records at all.
3. **Decide the source-text policy** described at the end of §5, and make the
   quotations and the Astor editions agree.
4. **Watch the shared vocabulary.** It is the one thing that degrades quietly
   as the library grows. `node scripts/rebuild-vocabulary.js` should be run
   whenever a batch of records lands, and the canonical names read as a set
   rather than one at a time.
