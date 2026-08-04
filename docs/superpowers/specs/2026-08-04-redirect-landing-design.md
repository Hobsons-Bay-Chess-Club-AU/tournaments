# Redirect Landing Screen Design

## Goal

Replace the visible Bootstrap-page flash at the legacy tournament index with a playful, branded CSS-only transition screen while the browser redirects to `/v2`.

## Scope

Only `www/index.html.hbs` changes. Its Handlebars tournament markup remains in place as a fallback and source content; the new stylesheet visually suppresses it during the redirect.

## Experience

The page will redirect to `/v2` after 1.5 seconds using its existing meta-refresh mechanism. During that interval, a fixed, full-viewport landing screen is the only visible content:

- Deep HBCC-blue background with layered brand-blue radial light.
- A CSS checkerboard field that drifts slowly behind the content.
- Decorative chess-piece glyphs that float and rotate at staggered speeds.
- A concise launch message such as “Your next move starts here”, animated into view.
- A labelled, animated progress line that completes over the same 1.5-second interval.

The visual is playful and energetic, rather than a dark premium or neon-arcade treatment, while retaining the site’s blue brand character.

## Accessibility and Resilience

The status text communicates the destination and includes a normal `/v2` link for users who want to proceed immediately. `prefers-reduced-motion: reduce` disables decorative motion while leaving the screen, message, and progress indicator visible. No JavaScript, external image, font, or animation dependency is introduced.

## Verification

Render the generated Handlebars output and inspect it with a browser at desktop and mobile widths. Confirm that no legacy navigation, cards, or Bootstrap styling are visible, the animation plays for the redirect interval, the `/v2` link works, and reduced-motion removes animation.
