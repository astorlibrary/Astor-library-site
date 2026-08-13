# Astor Library accounts and resource access

The site uses Supabase Auth for email/password accounts and a Cloudflare Worker for same-origin session cookies and presentation access. The first three slides of each deck are public. At normal website URLs, slide 4 onward is served only after the Worker validates a Supabase session.

## 1. Create and configure Supabase

1. Create a Supabase project in a suitable region.
2. Open the SQL editor and run every file in `supabase/migrations/` in timestamp order. The first migration creates accounts and consent records; the second creates the private saved-resource and recent-activity relationships plus self-service account deletion.
3. In **Authentication → URL configuration**, set:
   - Site URL: `https://astorlibrary.com`
   - Redirect URL: `https://astorlibrary.com/account/callback/**` (the callback carries a validated `next` query parameter)
   - Redirect URL: `https://astorlibrary.com/account/reset/**`
   - Add the equivalent local Wrangler URLs while testing, such as `http://localhost:8787/account/callback/**` and `http://localhost:8787/account/reset/**`.
4. Keep email confirmation enabled before protected access is launched. Keep Supabase **Secure email change** enabled so a sign-in email change requires confirmation from both the current and new addresses.
5. Configure production SMTP in Supabase Auth. The default Supabase mail service is intended for testing and has delivery/rate limitations. The SMTP provider is used only for account confirmation and password recovery; it is separate from marketing email.
6. Review Supabase password-strength and rate-limit settings before launch. The site validates Cloudflare Turnstile itself, so do not separately enable Supabase CAPTCHA without changing the Worker to pass the token to Supabase instead of consuming it at Siteverify.

The migrations create a private `profiles` table plus one deduplicated `resource_library_items` relationship for saved and recently viewed resources. Row-level security lets an authenticated user read only their own records. A signup marketing choice remains pending until Supabase confirms ownership of the email address; only then can it enter an export. Consent changes, resource mutations and account deletion go through narrow database functions that act only on the signed-in user.

## 2. Configure Cloudflare Worker secrets

Install dependencies, then set production values without committing them:

```sh
pnpm install
pnpm wrangler secret put SUPABASE_URL
pnpm wrangler secret put SUPABASE_PUBLISHABLE_KEY
pnpm wrangler secret put SITE_URL
pnpm wrangler secret put TURNSTILE_SITE_KEY
pnpm wrangler secret put TURNSTILE_SECRET_KEY
pnpm wrangler secret put RECOVERY_COOKIE_SECRET
```

Use `https://astorlibrary.com` for `SITE_URL`. Generate `RECOVERY_COOKIE_SECRET` from at least 32 random bytes; it signs a short-lived, user-bound password-recovery capability and must remain private. Create a Turnstile widget for the production hostname and supply its site and secret keys. Signup, signin and recovery fail closed in production when Turnstile is missing; local `localhost` development can run without it. For local work, copy `.dev.vars.example` to `.dev.vars` and insert the test-project values. `.dev.vars` is ignored by Git and the build explicitly omits environment files from `dist`.

The Supabase publishable key is designed for application use, but keeping deployment configuration outside the static bundle prevents accidental coupling. Never put a Supabase secret/service-role key in the Worker or client code for this feature.

### Presentation storage

All slides are intentionally publishable and ship in Cloudflare Workers Static Assets. No R2 subscription, bucket or object-staging step is required. `wrangler.toml` runs the Worker first only for `/api/*` and `/assets/presentations/*`; ordinary pages, books, styles and images remain direct static responses. The Worker validates the signed-in user before returning slide 4 onward through either the viewer API or a direct presentation-asset path.

## 3. Build and test

```sh
pnpm build
pnpm check
pnpm test
pnpm dev
```

Test email confirmation and recovery in the initiating browser, a different browser and a mail app's in-app browser. New templates use a token hash verified by the Worker after a deliberate click, so they are not tied to the browser that requested the email. Already-sent legacy PKCE links remain supported during the transition.

Before production release, verify:

- `/books/macbeth/` and other book pages remain public.
- `/resources/` and each resource landing page remain public.
- slides 1–3 load while signed out.
- slide 4 returns a sign-in gate while signed out.
- slide 4 loads after email confirmation and sign-in.
- sign-out blocks slide 4 again.
- password recovery returns to `/account/reset/`, accepts only a recent recovery-authenticated session, updates the password and revokes sessions.
- the marketing box is unticked by default and does not affect resource access.
- an unconfirmed signup never appears in the marketing export.
- opening a resource while signed in updates one recent record rather than appending an event for every visit.
- saving and unsaving a resource is reflected on its landing page, in the presentation viewer and on another signed-in device.
- a dashboard continue link returns to the last successfully viewed slide.
- saved and recent records from one account cannot be queried by another account or anonymously.
- account deletion requires the current password and explicit confirmation control, removes the account relationships and leaves the public resource library unaffected.
- changing the sign-in email requires the current password and the configured secure-email-change confirmations before the profile address changes.

### Private resource shelf

The account dashboard resolves resource titles, images and links from the public static catalogue. User relationship rows store only the authenticated user ID, stable presentation/resource ID, timestamps and the last slide reached. A separate private integrity catalogue stores only each valid resource ID and slide count so the database function cannot accept retired IDs or impossible progress; a test keeps it aligned with `presentation-data.js`. Saved resources are paged in groups of 50; the dashboard returns the latest 20 viewed resources, and each mutation prunes unsaved history beyond the latest 50 resource rows. Saved rows are retained until the user removes them. The `(user_id, resource_id)` keys prevent duplicate saved or recent rows.

No additional secret is required for the resource shelf. The existing Worker session calls Supabase through the signed-in user and the database enforces ownership again with row-level security. If the second migration has not been applied, the dashboard must be treated as unavailable rather than weakening those policies.

## 4. Export the opted-in list

The export script runs locally with an owner-only Supabase key and never sends the list to browser JavaScript:

```sh
SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
SUPABASE_SECRET_KEY="YOUR_SUPABASE_SECRET_KEY" \
pnpm export:marketing -- --output ../astor-opted-in.csv
```

The export pages through the complete confirmed, opted-in set and contains only `email`, `consented_at`, `source` and `consent_text_version`. It refuses to write inside the Git project and forces the CSV to file mode `0600` where supported. Store and share it as personal data. `--stdout` is available only when you deliberately need to pipe the CSV into another secure local process.

You can also export in the Supabase dashboard with:

```sql
select email, marketing_consent_at, marketing_consent_source, marketing_consent_text_version
from public.profiles
where marketing_consent = true and email_confirmed_at is not null
order by marketing_consent_at;
```

## 5. Connect a marketing-email provider later

No marketing provider is assumed. `public.profiles` is the source of truth for consent. A Resend, Mailchimp, Brevo or similar integration should read only rows where `marketing_consent = true`, and it must feed unsubscribe events back into `set_marketing_consent(false)` (or an owner-only equivalent) so the database does not drift from the provider.

Do not automatically add every account. Do not use Supabase authentication emails for marketing. Keep the consent wording/version and unsubscribe path when adding a provider.

## Website access boundary and repository visibility

`wrangler.toml` makes the Worker run before presentation assets and API requests. Direct website requests for slide 4 onward and every `.part-NNN` chunk therefore require a session. The viewer uses one authenticated slide endpoint, and the Worker reconstructs split slides from its internal Static Assets binding.

The GitHub repository and deployed asset bundle contain the complete slide files. The owner has confirmed that the educational content itself is publishable. The website account boundary is therefore an access and personal-library feature, not a confidentiality or DRM claim. The Worker still prevents ordinary deployed-site URLs from bypassing the intended sign-in experience.

## Owner checks before launch

- Complete the controller identity/contact details and retention decisions in the privacy notice if more detail is required for the organisation.
- Make and record the appropriate children/age and data-protection assessment for the intended school audience.
- Confirm provider data-processing terms, regions and international-transfer settings.
- Configure an unsubscribe mechanism before sending any marketing email.
- Add Cloudflare WAF rate-limit rules for `/api/auth/sign-in`, `/api/auth/sign-up`, `/api/auth/recover`, `/api/auth/update-email` and `/api/account/delete`, and confirm the corresponding Supabase Auth limits. Turnstile is an abuse-control layer, not a substitute for request limits.
