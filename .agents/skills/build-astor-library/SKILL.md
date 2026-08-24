---
name: build-astor-library
description: Develop, expand, audit, validate and publish the Astor Library literature website. Use whenever Codex is asked to continue improving Astor Library; add books, study editions, free resources, writer pages, subject guides, close readings or teaching rooms; revise the homepage or navigation; improve mobile design, performance, accessibility, editorial quality or search visibility; match uploaded covers and PDFs; or release tested changes to astorlibrary/Astor-library-site.
---

# Build Astor Library

Treat Astor Library as a long-term independent literature institution, not a generic book shop or disposable landing page. Keep the original literary work at the centre and make every addition genuinely useful to readers, students and teachers.

## Start with the current state

1. Read [references/project-map.md](references/project-map.md) completely.
2. Locate the newest trustworthy source tree. Do not assume an older local clone is current.
3. Inspect the current GitHub `main` head and recent uploads before editing.
4. Run the existing checker once to establish a baseline when the task is substantial.
5. Preserve unrelated user files and uploaded assets.

Tell the user what is being improved in simple language. Avoid technical shorthand in progress updates.

## Route the task

- For prose, page structure, homepage design, writer pages, book pages, guides or teaching material, read [references/editorial-standard.md](references/editorial-standard.md) completely.
- For new books, editions, covers, PDFs or web resources, read both the project map and editorial standard before changing catalogue data.
- For rebuilding, validation, performance work or publication, read [references/release-workflow.md](references/release-workflow.md) completely.
- For mixed requests, use all three references.

## Implement the work

- Improve substance and presentation together. A decorative redesign does not compensate for a thin page.
- Prefer durable data or generator changes over hand-patching generated copies.
- Edit source files, not `dist/`. Rebuild `dist/` only through the project build.
- Match uploaded covers and resources by title despite harmless hyphen, number or spacing differences. Inspect ambiguous assets rather than guessing.
- Keep Shakespeare as its own collection; do not fold it back into Renaissance and Early Modern.
- Give free resources their own useful Astor landing pages. Do not make catalogue cards jump straight to a PDF or outside website.
- Use authoritative primary or institutional sources for factual literary history. Browse when facts, links or current performance records may have changed.
- Build internal routes between books, writers, subjects, passages, teaching rooms, study editions and resources.
- Design mobile-first. Preserve cover proportions, prevent horizontal overflow and make navigation work even if JavaScript fails.
- Protect loading speed. Lazy-load below-the-fold images, use lightweight thumbnails for shelves and reserve eager loading for one meaningful lead image.
- Maintain canonical URLs on `https://astorlibrary.com`; the `.co.uk` domain is a permanent redirect only.

## Validate before hand-off

Run the project rebuild and checker described in the release workflow. Fix failures rather than weakening checks to hide a real defect. Review the changed pages for:

- accurate title, author, edition link and cover;
- unique human prose without build notes or AI filler;
- useful page depth and clear internal links;
- mobile-safe image dimensions and navigation;
- metadata, canonical URL and structured data;
- no broken local links, duplicate IDs or redirect pages.

Report concrete outcomes: which areas improved, how many pages were checked and whether publication occurred.

## Publish safely

Do not interpret “improve”, “continue” or “build” as permission to deploy. Publish only when the user explicitly asks to publish or push.

Updating GitHub `main` can trigger production deployment. Before moving `main`, state the repository, old commit, new commit, `force=false`, and deployment risk, then obtain explicit approval unless the user has already approved those exact details. Never force-update `main`. If `main` changes during preparation, stop and reconcile rather than overwriting it.

Use one intentional release commit where possible. Verify the new GitHub head and then check the live routes after deployment.
