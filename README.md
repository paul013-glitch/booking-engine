# SurfCamp OS

A lightweight surf camp booking SaaS with a real Netlify-backed multi-tenant shell.

## Pages

- `index.html` - SaaS signup / lead capture
- `book.html` - guest booking flow with 5 steps and live summary
- `admin.html` - camp backend editor for branding, rooms, packages, add-ons, and bookings

## Notes

- Beige, minimal visual style
- Airbnb-style date picker
- Optional weekday arrival rules
- Demo camp: Amigos Surf Camp
- Netlify Identity is used for admin sign-in
- Netlify Functions + Netlify Blobs store camp workspaces server-side
- Each camp gets a stable public booking URL

## Netlify Identity setup

1. Open your site settings in Netlify
2. Enable **Identity**
3. Allow the camp owner accounts you want to use
4. Open `admin.html` and sign in from the auth panel

The admin editor stays hidden until a user signs in.

## Netlify Blobs setup

If the workspace API shows a Blobs configuration error, add these site environment variables in Netlify:

- `SITE_ID` with your Netlify project/site id
- `NETLIFY_BLOBS_CONTEXT` with the Base64-encoded JSON context for Blobs, or
- `NETLIFY_BLOBS_TOKEN` with a Netlify personal access token

The functions will read `NETLIFY_BLOBS_CONTEXT` first, then fall back to `SITE_ID` plus a token.

## Next real backend steps

1. Add Stripe Checkout and webhook confirmation
2. Send booking confirmation emails
3. Add inventory locking for holds and cancellations
4. Split the workspace API into finer admin endpoints when the app grows
