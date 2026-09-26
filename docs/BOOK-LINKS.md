# Astor Amazon links

Customers use permanent links such as `https://astorlibrary.com/go/macbeth`.
The existing Cloudflare Worker routes UK, US, Canadian and Australian visitors to
verified Amazon listings. Other countries and unconfirmed local listings see a
small Astor country chooser. No external universal-link service, geolocation API,
cookies or affiliate tracking is used.

## Change a destination or add a book

1. Edit `worker/book-links.json`. Each key under `books` is its permanent URL slug.
2. Copy an existing entry, set the title and physical format, and paste the verified
   country-specific Amazon URLs. Use clean `https://www.amazon.co.uk/dp/ASIN` URLs
   (and the corresponding verified US, Canadian and Australian hosts).
3. Confirm the title, Astor/Triton edition and selected format on each Amazon page.
   Do not assume the same ASIN works in every country. Use `kind: "product"` only
   after checking the page. An unconfirmed country may be omitted, or use an
   explicit `kind: "search"` Amazon search URL; it will not redirect automatically.
4. Put `https://astorlibrary.com/go/your-slug` in the site's existing purchase-link
   field. For a book's format box this is `scripts/book-formats.json`; retain the
   same image, label and edition information. Update its canonical catalogue data
   when adding a new book through the normal site workflow.
5. Run the build, site checks and tests, then deploy the Worker with `--keep-vars`.
   A registry-only change still needs a Worker deployment.

Never rename or remove a published slug. Keep an old spelling in `aliases` if a
shorter name is added. Paperback, hardback, introduced, study and expanded scholarly
editions have separate URLs. `great-gatsby` is an alias of `the-great-gatsby`.

## Check a route

- `/go/macbeth` uses Cloudflare's visitor country.
- `/go/macbeth?country=GB` selects the UK (`UK` is also accepted).
- `?country=US`, `?country=CA` and `?country=AU` select other stores.
- `/go/macbeth?choose=1` always shows the country chooser.

Redirects use temporary HTTP 302 responses with `private, no-store`, allowing
future destination changes and preventing one visitor's country being cached for
another. The public Astor URL itself remains permanent.

## Associates IDs later

`associates` is deliberately empty. Only if Haydn supplies his own IDs, add them
under `GB`, `US`, `CA` and `AU`. The Worker applies each ID only to its own store.
Do not copy tags from another service or from old retailer URLs.

## Migration exceptions (26 September 2026)

- Animal Farm: old link opened a generic George Orwell search; original paperback
  ASIN still needed. All countries currently use the labelled search chooser.
- Henry VI Part 1: old link incorrectly opened Part 2; corrected to B0GCP9QDPJ,
  verified against the website cover and all four Amazon stores.
- The War of the Worlds paperback: exact edition verified in US/CA/AU; its UK
  product page returns Amazon's unavailable-page message. UK uses the chooser.
- The Scarlet Letter and the combined Venus and Adonis / Rape of Lucrece paperback
  buttons previously opened hardbacks; corrected to Amazon's paired paperbacks.
- Othello study: retained its Amazon paperback; the old choice page also offered
  an unrelated audiobook. Great Gatsby paperback and hardback were already correct.

The complete migration audit, including the 209 old URLs and country destinations,
is in `docs/book-link-audit.json`. It is historical evidence, not runtime routing data.
