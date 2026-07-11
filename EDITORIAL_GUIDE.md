# Astor Library editorial guide

This guide is for every future page and revision.

## Voice

- Write for an intelligent reader, not for a search engine or a build log.
- Use clear British English and concrete nouns and verbs.
- Prefer a useful fact or interpretation to promotional language.
- Keep introductions short enough to read before scrolling.
- Do not describe the machinery of the website.
- Give each book its own opening. If an introduction could be moved unchanged to another title, rewrite it.
- Use connected prose for explanation and interpretation. Keep lists for genuine chronologies, records or compact reference material.
- Sound like one thoughtful reader speaking to another. Do not imitate a prospectus, sales page or revision-platform advert.

Avoid phrases such as:

- “source-led page”
- “records worth knowing”
- “this page uses the uploaded…”
- “the card uses the filename…”
- “cover expected” or “placeholder”
- “built for” when a direct description would be clearer

## Accuracy

- Check dates, titles, names, venues and publication details before publishing.
- Prefer first editions, library catalogues, museums, author societies, theatre archives, film institutes and established academic editions.
- Use Wikipedia to find a lead, not as the final authority for a disputed or precise claim.
- Replace Wikipedia links with library, archive, museum, theatre, author-society or scholarly sources during every research pass.
- If a fact cannot be checked, remove it or qualify it honestly.
- Separate fact from interpretation. Make it clear when a reading is one possible reading.

## Page structure

1. A concise, book-specific introduction to the work and why it matters.
2. The Astor edition and purchase link, where one exists.
3. A small set of genuinely useful quick facts.
4. Publication and textual history.
5. Context and interpretation.
6. Performance, adaptation or reception history where relevant.
7. A short list of credible sources.

Not every work needs every section. Do not pad a page to fit the template.

Long pages should help readers find their place. Keep section headings specific to the book, and make sure the automatically generated contents links still read naturally out of context.

## Images

- Use images only when they add historical, textual or visual context.
- Give every meaningful image a plain, specific alt description.
- Credit external images accurately in the caption.
- Never expose internal filenames, upload notes or missing-cover instructions to readers.

## Adding a new book

1. Add the book page and cover.
2. Add it to exactly one main collection page, except where a deliberate cross-listing is useful.
3. Add any matching free guide or study-edition connection in `scripts/rebuild-discovery.js`.
4. Run `node scripts/rebuild-library.js` to update the catalogue, Explore page and discovery index.
5. Run `node scripts/build-static.js`.
6. Run `node scripts/check-site.js` to catch broken links, structural errors, missing navigation and build wording.
7. Check the homepage, Explore page, catalogue, collection page and new book page on desktop and mobile.
