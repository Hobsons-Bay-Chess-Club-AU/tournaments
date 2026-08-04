# Tournament Card Date-Range Rail Design

## Goal

Improve date-range readability inside the home-page tournament card without changing its routing, standings display, menu, filters, or brand treatment.

## Experience

The title and location remain beneath the status/category row. The card content then responds to standings availability:

- When top-three standings exist, the content area becomes two equal-height columns: a narrow vertical start-to-end date rail on the left and a three-row player list on the right. The rail uses date chips joined by a downward connector/arrow; `From` and `To` labels are intentionally omitted because the direction communicates the range. First, second, and third place use progressively lighter HBCC-teal rank chips.
- When standings are unavailable, the date content uses the full width as a horizontal treatment. One-day events retain their compact date chip; multi-day events use larger start and end chips pinned to the left and right edges, with a rightward arrow centered between them.

The destination action remains at the bottom. The design uses existing Tailwind `primary-*` utilities and collapses safely within the card's existing mobile layout.

## Scope

Modify only `v2/src/components/TournamentCard.tsx`. No data, page, menu, filter, route, or global-style change is needed.

## Verification

Run `npx tsc --noEmit` from `v2/`. Inspect one-day and multi-day card instances to confirm one-day cards retain their current chip, the range row stays balanced against three standings, and the empty range treatment neither wraps nor overflows.
