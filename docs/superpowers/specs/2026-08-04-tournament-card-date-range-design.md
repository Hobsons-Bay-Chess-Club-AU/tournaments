# Tournament Card Date-Range Rail Design

## Goal

Improve date-range readability inside the home-page tournament card without changing its routing, standings display, menu, filters, or brand treatment.

## Experience

The title and location remain beneath the status/category row. The card content then responds to standings availability:

- When top-three standings exist, the content area becomes two columns: a narrow vertical start-to-end date rail on the left and the player list on the right. The rail uses date chips joined by a downward connector/arrow; `From` and `To` labels are intentionally omitted because the direction communicates the range.
- When standings are unavailable, the date content uses the full width as a horizontal treatment. One-day events retain their compact date chip; multi-day events show start and end date chips joined by a rightward arrow.

The destination action remains at the bottom. The design uses existing Tailwind `primary-*` utilities and collapses safely within the card's existing mobile layout.

## Scope

Modify only `v2/src/components/TournamentCard.tsx`. No data, page, menu, filter, route, or global-style change is needed.

## Verification

Run `npx tsc --noEmit` from `v2/`. Inspect one-day and multi-day card instances to confirm one-day cards retain their current chip and multi-day cards show both dates in the vertical rail without wrapping or horizontal overflow.
