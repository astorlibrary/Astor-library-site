# Astor Library project map

## Stable project facts

- Canonical website: `https://astorlibrary.com`
- Secondary domain: `https://astorlibrary.co.uk`, permanently redirected to the canonical domain
- GitHub repository: `astorlibrary/Astor-library-site`
- Default branch: `main`
- Hosting/build configuration: `wrangler.toml`
- Static build output: `dist/`
- Production builds may begin when `main` moves

Astor Library publishes complete classic texts, study editions and free literature resources. Main editions are for general readers as well as students. Study editions are more explicitly designed for classrooms, revision and exam preparation.

## Find the trustworthy source

Search under the active workspace for `wrangler.toml`, `scripts/build-static.js` and `scripts/check-site.js` using `rg --files`. Several historical clones or release snapshots may exist.

Prefer, in order:

1. an authenticated checkout whose GitHub head matches current `main`;
2. the newest verified release tree whose recorded base matches `main`;
3. a fresh repository fetch through the connected GitHub app.

Do not silently use an older dirty clone. Compare the candidate source against current `main`, especially when the user says new covers, PDFs or resources were uploaded.

## Source architecture

The site is source HTML, CSS, JavaScript, JSON and image assets. Important build scripts include:

- `scripts/rebuild-library.js`: rebuild the main catalogue and invoke related content builders.
- `scripts/rebuild-discovery.js`: build Explore, writers, discovery data and the crawlable site index.
- `scripts/build-static.js`: produce `dist/`, global navigation, canonical metadata, structured data, sitemap and hosting files.
- `scripts/check-site.js`: validate links, structure, navigation, editorial safeguards and generated output.
- `scripts/subject-data.js`: define subject guides and their book relationships.
- `scripts/resource-data.js`: define free resources and their Astor landing pages.
- `scripts/book-data.js`: central book records where present.
- `scripts/author-profiles.js`: registered writer profiles.

Inspect the current scripts before assuming their exact responsibilities; the architecture evolves.

Generated discovery assets commonly include:

- `assets/content-index.json`
- `assets/book-thumbnails.json`
- `assets/book-thumbs/`

Do not edit generated output when an upstream data file or builder owns it.

## Content architecture

Core routes include:

- `/library/` for all books
- `/shakespeare/` for Shakespeare as a separate collection
- period collections such as `/victorian/` and `/american/`
- `/study/` for study editions
- `/resources/` for free resource landing pages
- `/authors/` for writer profiles
- `/subjects/` for form, genre and historical subject guides
- `/passage-room/` for annotated close readings
- `/teach/` for teaching rooms
- `/explore/` for site-wide discovery
- `/site-index/` for a complete crawlable index

Book and resource counts are expected to grow. Read current generated data instead of hardcoding past counts.

## Adding uploaded material

For a new main edition:

1. Locate its cover and confirm the retailer URL and supplied description.
2. Add or update the canonical book record.
3. Build a substantive individual book page.
4. Place it in exactly one correct collection.
5. Connect writer and subject pages.
6. Add a lightweight shelf thumbnail without replacing the full cover used on the lead page.

For a study edition, connect the study catalogue, purchase URL and any individual study page. For a free guide or linked website, create an Astor landing page that explains what the resource contains, how to use it and where to continue reading.
