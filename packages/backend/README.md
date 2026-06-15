# Backend Setup

## Resend for Convex

The Convex Resend component is configured in `convex/convex.config.ts`.
Transactional contact-form emails are sent through `convex/email.ts` and
`convex/contact.ts`.

Required Convex environment variables:

```txt
RESEND_API_KEY=<Resend API key>
RESEND_WEBHOOK_SECRET=<Resend webhook signing secret>
```

The webhook endpoint is:

```txt
<CONVEX_SITE_URL>/resend-webhook
```

For this deployment, `CONVEX_SITE_URL` is currently:

```txt
https://earnest-lobster-575.eu-west-1.convex.site
```

Create a Resend webhook pointing at that URL and subscribe it to the `email.*`
events so the Convex component can track delivery, bounce, complaint, delayed,
failed, suppressed, opened, and clicked events.
