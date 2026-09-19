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
