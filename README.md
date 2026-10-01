# Astor-library-site
Website for Astor Library

Future additions should follow [EDITORIAL_GUIDE.md](EDITORIAL_GUIDE.md).

After adding or revising a book, run:

```sh
node scripts/rebuild-library.js
node scripts/generate-book-thumbnails.js
node scripts/build-static.js
node scripts/check-site.js
npm test
```

The first command rebuilds the full catalogue, the Explore page and the site-wide discovery index. The thumbnail step refreshes lightweight listing images for books, study editions and free resources. Do not edit the generated book cards in `library/index.html` or `explore/index.html` by hand.

`assets/content-index.json` connects book pages to matching free guides, study editions and collections. When a new guide or study edition belongs to a book, add that connection in `scripts/rebuild-discovery.js`.

`dist/` is the generated version of the site used for publishing. It is ignored by Git. Edit the source pages, rebuild it, then run the site check before publishing.

## Publishing and book links

Start each update from the current GitHub `main` branch and merge any newer work
before publishing. A cover-image upload must not be deployed from an older local
checkout. The September restoration brings the newer About page, book-led homepage
and one-book revision layout into `main` along with the catalogue updates.

Publish the complete checked source with `wrangler deploy --keep-vars`, retaining
both Astor domains and the `/go/*`, `/api/*` and `/assets/presentations/*` Worker
routes. Verify the homepage, `/about/`, `/play/` and a `/go/` link on the live site
afterwards. Keep the published source on GitHub so the next editor starts from it.

Permanent Amazon destinations are in `worker/book-links.json`; format buttons are
in `scripts/book-formats.json`. See [docs/BOOK-LINKS.md](docs/BOOK-LINKS.md) for new
titles, Kindle editions, country fallbacks and the supplied September descriptions.

## Light and dark themes

The site has its original light theme and a warm-charcoal dark one. A reader's
choice is kept in `localStorage` (`astor-theme`); until they make one, the page
follows the system setting.

- `assets/theme.css` holds the whole dark palette and the toggle's styles.
  `build-static.js` adds it as the last stylesheet, puts a few lines ahead of every
  stylesheet that set `data-theme` on `<html>` before first paint, and builds the
  toggle into the shared header. `assets/site.js` wires it up.
- The other stylesheets keep their light colours where they were. A colour that
  needs a dark counterpart is written `var(--token, <light colour>)`. The token is
  defined only in dark mode, so light mode takes the fallback and is unchanged. For
  new work use the tokens listed at the top of the dark block in `theme.css`
  (`--surface`, `--text`, `--wine-text` and so on) and always give them a light
  fallback; `tests/theme.test.mjs` fails on a bare token.
- Navy bands, wine buttons, book covers and the seasonal artwork look the same in
  both themes, so do not put a `filter` on images. Seasonal pages keep their night
  heroes and take only a dark reading area tinted with their own colour.
- Print is always light.

## Study data

`data/books/<slug>.json` holds one structured record per title: plot, characters,
themes, techniques, quotations with references, timeline, settings, critical
positions and essay questions. One record feeds the study toolkit on the book
page, the generated study page, the explorers under `/explore/`, all nine
revision games, the flashcard decks, the daily puzzle and the teachers' area,
so a correction reaches every one of them in the same build.

`scripts/book-data.js` is the schema; `check-site.js` and the test suite both
run it. Every quotation must carry a `reference` and a `source` naming the
public-domain text it was checked against, or the build fails.

Themes and techniques use identifiers shared across titles. Where more than one
book uses an identifier and names it differently, `data/vocabulary.json` supplies
the canonical name for the glossary and the cross-library filters; each book
keeps its own wording on its own page. `node scripts/rebuild-vocabulary.js`
reports what is missing and `--draft` proposes entries to edit.

Adding a title to the whole platform means adding one file to `data/books/` and
running `node scripts/rebuild-library.js`. See
[docs/REDEVELOPMENT-SUMMARY.md](docs/REDEVELOPMENT-SUMMARY.md) for the full map.
