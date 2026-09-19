# Astor Library: redevelopment plan

A working document for the 2026 expansion. It records what the site already
does, what is being added, and the reasoning behind each decision. It is not
the deliverable; the site is.

## 1. What already exists

The site is a static build of roughly 390 source pages, deployed on Cloudflare
Workers. Static files are served from `dist/`; `worker/index.mjs` handles
Supabase auth, Turnstile and the gated presentation slides.

| Area | Count | Notes |
| --- | --- | --- |
| Book pages (`books/`) | 141 | Rich on textual, publication and performance history |
| Author pages (`authors/`) | 44 | Generated shelves plus hand-written profiles |
| Free guides (`resources/`) | 62 | Essay-style study material |
| Study editions (`study/`) | 41 listed, 12 with on-site pages | Six built to the `henry-v` skeleton |
| Passage Room close readings | 90 | Hand-declared in `rebuild-discovery.js` |
| Collections, subjects, seasons, routes | 40+ | Period pages, 12 subject guides, 8 seasonal rooms |

The build pipeline is `rebuild-library.js` → `build-static.js` → `check-site.js`
→ `npm test`. `rebuild-library.js` pulls in a dozen sibling `rebuild-*` scripts
and regenerates the catalogue, Explore page, subject guides, author shelves, the
Passage Room hub, the seasonal collections and `assets/content-index.json` (462
searchable entries). `build-static.js` injects the global header, footer,
metadata, JSON-LD, thumbnails and cache rules into every page on the way to
`dist/`. `check-site.js` is a 2,000-line editorial and structural conscience:
broken links, duplicate ids, missing alt text, banned build wording, image
loading hints, navigation completeness.

### What the site does not do

Everything on the site is read-only prose. A reader arrives, reads a page and
leaves. There is nothing to *do*, nothing that remembers them, and nothing that
brings them back tomorrow. Specifically:

- Book pages carry no characters, themes, key quotations, plot spine or
  analysis — only publication and performance history.
- There are no quizzes, games, flashcards or revision activities of any kind.
- Nothing is personalised: no saved books, no reading history, no progress.
- There is no way to search or compare *across* books — quotations, themes and
  characters are locked inside individual pages of prose.
- There is nothing for teachers beyond the prose itself.
- The site is identical on every visit, so there is no reason to return.

## 2. The shape of the expansion

The central architectural decision is a **structured content layer**:
`data/books/<slug>.json`, one file per title, holding the book's characters,
themes, plot spine, quotations (each with a verified reference), techniques,
timeline, settings and contextual facts.

That single body of content then powers, without being re-authored:

- the study toolkit injected into book pages and study pages
- the cross-library quotation explorer, timeline, character maps and glossary
- every revision game and quiz (question banks are *derived* from the data)
- the flashcard decks and spaced repetition schedule
- the daily puzzle and passage of the day
- the compare-two-texts tool
- teachers' worksheets and projector mode

One quotation entered once appears as a card on the book page, an item in the
explorer, a question in four different games, a flashcard and a printable.
Adding a book to the whole platform means adding one JSON file.

### Workstreams

**WS1 — Data foundation.** JSON schema, loader (`scripts/book-data.js`),
schema validation wired into `check-site.js` and the test suite. Per-book data
files for the most-studied titles first, then breadth.

**WS2 — Personalisation core.** `assets/astor/store.js`: a small
localStorage-backed store for saved books, recently viewed, per-book progress,
game scores, revision streak and the commonplace book. No login, no tracking,
no third-party scripts; every feature degrades to a static page if storage is
unavailable. `/my-library/` is the dashboard.

**WS3 — Play & revise.** A new top-level destination, `/play/`, with a shared
game engine and ten games, plus per-book quizzes and a spaced-repetition
flashcard system.

**WS4 — Explore tools.** Quotation explorer, interactive timeline, character
relationship maps, technique glossary, settings map, compare-two-texts.

**WS5 — Daily.** `/today/` — passage of the day, "on this day", and the Daily
Five puzzle with a shareable result grid. Date-driven and deterministic, so
every reader sees the same thing on the same day without a server.

**WS6 — Book and study pages.** A generated study toolkit region on every book
page that has data; generated study pages for titles that have data but no
on-site study page.

**WS7 — For teachers.** `/for-teachers/` with lesson starters, discussion
questions, printable worksheets (print stylesheet), and projector mode.

**WS8 — Navigation and search.** A sixth primary destination (Play & revise), a
"My library" utility link, and a command-palette search (`/` or `Ctrl-K`) over
books, characters, themes, quotations, guides and passages.

## 3. Accuracy

The environment has no general internet egress, so quotations are verified
against two public-domain text mirrors that are reachable:

- **Shakespeare**: the Globe/Moby text via `TheMITTech/shakespeare`, which
  carries act, scene and line numbering. References are recorded as
  `act.scene.line` and labelled as Globe/Moby line numbering, which is the
  traditional numbering most editions print. Line numbers vary between modern
  editions, and the site says so rather than implying a single authority.
- **Prose and drama in prose**: Standard Ebooks sources, which are proofed
  Project Gutenberg transcriptions. References are recorded as chapter,
  stave, book or letter as the work itself divides.

Every quotation in `data/books/*.json` carries a `reference` and a `source`
field, and `check-site.js` fails the build if either is missing. A quotation
that could not be located in the corpus was not published.

Two things are deliberately **not** built:

- **Videos.** The brief asks for privacy-friendly click-to-load embeds of real
  RSC, National Theatre, British Library, Globe or university material. With no
  network access there is no way to verify that a given video id is live, is
  what it claims to be, or is still publicly available, and inventing ids is
  worse than omitting them. The facade component is built, documented and
  styled, and reads its ids from `data/books/*.json`; the `videos` array is
  empty everywhere and the section does not render until real, checked ids are
  added. `docs/REDEVELOPMENT-SUMMARY.md` explains how to add them.
- **Critics' quotations.** Modern criticism is in copyright and unverifiable
  here. Critical *positions* are described in the site's own words and
  attributed by name and date only where the attribution is standard and
  checkable; no words are put in a critic's mouth.

Exam-board names are used only where a specification is not in doubt, and the
teachers' area is written to be board-neutral rather than claiming coverage it
cannot guarantee.

## 4. Design

The existing identity stays: burgundy `#6E1F2B` on warm paper `#f7efe7`,
Georgia for display, system sans for reading text, the `01`/`02` navigation
numerals, square-cornered cards with hairline borders. New components are built
from the same tokens and added to `assets/styles.css` and a new
`assets/astor-play.css` rather than a parallel design language.

Interactive components follow four rules:

1. **Server-free.** Everything runs from static JSON and vanilla ES modules. No
   build step, no framework, no third-party script.
2. **Fail visible.** Every interactive region is rendered from markup that is
   already useful without JavaScript, or is explicitly progressive (a
   `<noscript>`-safe fallback that links to the static material).
3. **Keyboard first.** Every game is fully playable from the keyboard, with
   visible focus, `aria-live` feedback and no pointer-only affordance.
4. **Quiet motion.** All animation sits behind `prefers-reduced-motion`.

## 5. Quality gates

`check-site.js` gains a data-layer section: JSON schema validation for every
`data/books/*.json`, a check that every quotation has a reference and source,
that every internal href in the data resolves to a real page, that every
character, theme and technique id referenced by a quotation exists, and that no
data file contains banned editorial wording or `sizes="auto"`. New tests cover
the store, the game engines, the daily seed and the data schema. `npm run
predeploy` must pass clean.
