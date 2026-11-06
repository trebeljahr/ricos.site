# Stripe donation links

Moved here from the README on 2026-11-06. Nothing about the setup changed.

The donate card reads Stripe Payment Link URLs from `.env.local`.

Use `.env.example` as the list of required keys. The `NEXT_PUBLIC_STRIPE_DONATION_*_URL` values are public checkout URLs, not Stripe API secrets. Keep actual Stripe secret keys out of client-facing env vars.

| Key | Link |
| --- | --- |
| `NEXT_PUBLIC_STRIPE_DONATION_ONETIME_CUSTOM_URL` | one-time, pay what you want |
| `NEXT_PUBLIC_STRIPE_DONATION_MONTHLY_3_URL` … `_25_URL` | monthly subscription tiers |
| `NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL` | the customer portal, where donors manage a subscription |

In the Stripe dashboard, point each Payment Link's after-payment redirect at `https://ricos.site/donate?thanks=1`. That query switches `/donate` to its thank-you state and pauses the donation strip under long posts for 90 days on that browser (`QUIET_PERIOD_MS` in `src/lib/donation.ts`).

Other projects link their donate buttons to `/donate?from=<slug>`. A slug from `src/lib/projects.ts` gets that project's header, in the colours from `src/lib/donationSources.ts`. An unknown slug shows the plain page.
