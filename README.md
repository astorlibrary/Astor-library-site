# Astor-library-site
Website for Astor Library

Future additions should follow [EDITORIAL_GUIDE.md](EDITORIAL_GUIDE.md).

After adding or revising a book, run:

```sh
node scripts/rebuild-library.js
node scripts/build-static.js
node scripts/check-site.js
```

The first command rebuilds the full catalogue, the Explore page and the site-wide discovery index. Do not edit the generated book cards in `library/index.html` or `explore/index.html` by hand.

`assets/content-index.json` connects book pages to matching free guides, study editions and collections. When a new guide or study edition belongs to a book, add that connection in `scripts/rebuild-discovery.js`.

`dist/` is the generated version of the site used for publishing. It is ignored by Git. Edit the source pages, rebuild it, then run the site check before publishing.
