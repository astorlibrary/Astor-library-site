# Astor-library-site
Website for Astor Library

Future additions should follow [EDITORIAL_GUIDE.md](EDITORIAL_GUIDE.md).

After adding a book to its collection page, run:

```sh
node scripts/rebuild-library.js
node scripts/check-site.js
node scripts/build-static.js
```

`library/index.html` is rebuilt from the collection pages. Do not edit its book cards by hand.

`dist/` is the generated version of the site used for publishing. Edit the source pages instead, then rebuild it.
