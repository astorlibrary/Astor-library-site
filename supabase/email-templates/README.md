# Astor Library Supabase Auth email templates

These templates use Astor Library's established publishing palette and editorial voice. They are deliberately simple, image-free and fully inline-styled so they remain readable in clients that suppress images, external CSS or rich formatting.

## Dashboard subjects

| Supabase template | Subject |
| --- | --- |
| Confirm sign up | `Confirm your Astor Library account` |
| Reset password | `Reset your Astor Library password` |
| Change email address | `Confirm your new Astor Library email address` |
| Password changed | `Your Astor Library password was changed` |
| Email address changed | `Your Astor Library email address was changed` |

## One-time-link safety

The three action templates do **not** link straight to `{{ .ConfirmationURL }}`. Supabase documents that mail-security scanners can prefetch that single-use URL and consume it before the reader opens the message.

Instead they place Supabase's hashed one-time token in a URL fragment:

```text
{{ .SiteURL }}/account/action/#token_hash={{ .TokenHash }}&type=<action-type>
```

The `/account/action/` page is an integration requirement, not an optional cosmetic page. It must:

1. Parse only the fragment and accept a bounded token hash plus the exact expected action type (`email`, `recovery` or `email_change`).
2. Display the action being requested and a deliberate confirmation button. It must never fetch or verify the token during initial page load.
3. POST the token hash and action type to Astor Library's same-origin Worker only after a real button click. The Worker calls Supabase `verifyOtp` and writes the resulting session cookies in the browser that opened the email.
4. Keep support for already-sent legacy `#confirmation_url=` links during the transition, but do not publish new templates in that format.
5. Avoid analytics, link previews and service-worker prefetching on this page.

The token is placed in a fragment so it is not sent to Astor Library's server in the initial request. The explicit second click prevents ordinary mail scanning from consuming it, while server-side `verifyOtp` avoids binding the action to the browser that originally requested the email.

## Delivery settings

- Keep Resend open and click tracking disabled for authentication mail; tracked links can break Supabase confirmation URLs.
- Use a stable transactional sender such as `Astor Library <support@astorlibrary.com>` and keep marketing mail in a separate stream.
- Email OTP expiration is set to `86400` seconds (24 hours). This is Supabase's maximum and gives readers a practical window for confirmation, recovery and email-change links while every action remains single-use.
- Retain the verified SPF, DKIM and DMARC records and check Resend's bounce/suppression logs when an expected message does not arrive.
- Do not add unsubscribe wording to these operational account messages. Marketing consent and marketing mail remain separate.
- Send a complete end-to-end test to at least Gmail, Outlook and iCloud after publishing the templates. Confirm both the safe landing page and the eventual account action.

The image-free markup is intentional: it avoids remote asset failures and tracking-pixel signals while preserving a recognisable Astor Library presentation.
