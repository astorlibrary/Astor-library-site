# Astor-library-site
Website for Astor Library

Future additions should follow [EDITORIAL_GUIDE.md](EDITORIAL_GUIDE.md).

After adding or revising a book, run:

```sh
node scripts/rebuild-library.js
node scripts/generate-book-thumbnails.js
node scripts/build-static.js
node scripts/check-site.js
```

The first command rebuilds the full catalogue, the Explore page and the site-wide discovery index. The thumbnail step refreshes lightweight listing images for books, study editions and free resources. Do not edit the generated book cards in `library/index.html` or `explore/index.html` by hand.

`assets/content-index.json` connects book pages to matching free guides, study editions and collections. When a new guide or study edition belongs to a book, add that connection in `scripts/rebuild-discovery.js`.

`dist/` is the generated version of the site used for publishing. It is ignored by Git. Edit the source pages, rebuild it, then run the site check before publishing.

The eight collection pages (`/american/`, `/shakespeare/` and so on) are plain records in source: an introduction owned by `scripts/rebuild-edition-update.js` and one shelf card per book. `scripts/collection-page.js` lays them out at build time using `scripts/collection-data.js`, which lists the collections in order, the three covers shown in each heading and the dates used to sort the shelf. Add a book to a collection by adding its card; the published page sorts and groups it automatically.
