# Astor Library release workflow

## Rebuild and validate

Use `node` from the system path when it is available. If it is missing, call the
workspace dependency loader and use the Node.js executable path it returns. Do
not assume the same home folder or runtime path on every computer. From the
trusted site root:

```sh
NODE=/path/returned/by/the/workspace/dependency/loader
for file in scripts/*.js assets/*.js; do "$NODE" --check "$file" || exit 1; done
"$NODE" scripts/rebuild-library.js
"$NODE" scripts/build-static.js
"$NODE" scripts/check-site.js
```

Run only relevant builders if a smaller task has a documented narrower path, but always run `build-static.js` and `check-site.js` before a release.

Do not weaken a check merely because new intentional content changes an expected count. Update the check to express the new invariant, then prove it passes.

Confirm:

- generated and source HTML page counts agree;
- the sitemap contains every preferred page and only `astorlibrary.com` URLs;
- no internal links or fragments are broken;
- every page has one main region, one H1, metadata and a canonical URL;
- shared navigation includes the current principal sections;
- book covers below the lead image are lazy and lightweight;
- no page loads more than one main image eagerly;
- mobile navigation has a usable no-JavaScript fallback;
- no build wording appears in reader-facing text.

## Performance checks

Measure the result rather than saying it “should be faster”. For large shelves, total the source-cover payload and thumbnail payload, count eager images and check that each shelf uses the thumbnail map. Preserve a full-quality cover for the individual page's lead image.

## Prepare GitHub publication

Use the connected GitHub app when local `gh` or Git is unavailable. Before publishing:

1. Verify repository `astorlibrary/Astor-library-site` and current `main` SHA.
2. Inventory only the intended changed and new files. Exclude `dist/` when it is gitignored.
3. Confirm there are no unrelated uploads or user changes in the same paths.
4. Create one intentional commit based on the verified current head.
5. Recheck `main` immediately before updating the ref.

For a large connector release, avoid one enormous tree request:

- create binary blobs first and retain their SHAs;
- create oversized text files as standalone blobs;
- attach ordinary UTF-8 files in tree batches of about 80–95 KB;
- use each returned tree SHA as the next batch's base;
- verify final path count, blob checksums and modes;
- create one commit only after the detached tree is complete.

## Production approval

Moving default branch `main` may deploy `astorlibrary.com`. If exact approval has not already been given, ask the user to confirm:

> I approve moving astorlibrary/Astor-library-site main from OLD_SHA to NEW_SHA with force=false, understanding this may deploy astorlibrary.com.

Then call `update_ref` once with `force=false`. Never force. Never retry through an indirect route after a safety rejection; surface the exact approval or context requirement.

## Verify the release

After the ref moves:

1. Verify the new GitHub head independently.
2. Inspect commit status or deployment checks.
3. Allow the host time to build.
4. Check representative new and changed live routes, the homepage, sitemap and mobile navigation.
5. Report the commit link, validation result and whether the live host has caught up. Do not claim the website is live merely because the GitHub ref moved.
