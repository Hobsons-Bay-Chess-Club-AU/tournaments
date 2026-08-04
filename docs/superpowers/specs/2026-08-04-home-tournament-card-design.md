# Home Tournament Card Design

## Goal

Redesign only the home-page tournament card to make event selection clearer and more engaging for players and parents, while preserving the current HBCC teal brand, Tailwind setup, and menu structure.

## Scope

Create a focused `TournamentCard` component and replace the inline card markup in the home page. No navigation, filter, paginator, hero, or menu structure changes are included.

## Card Experience

Each card uses a playful event-ticket hierarchy:

- A compact top row communicates event status, category, and date.
- The tournament title and location form the primary readable content.
- A clear destination label reads `View standings` for completed events and `Open tournament` otherwise; the whole card remains the link target.
- When standings data is available, a compact 1–2–3 strip shows the top players. Missing data omits the strip entirely without fabricated placeholders.

The card stays single-column at narrow widths, uses existing Tailwind `primary-*` utilities, and adds only restrained transform/opacity motion with a visible keyboard focus indicator and reduced-motion fallback.

## Data Contract

`src/prepare-data.mjs` will attach the following optional property to every entry in `www/tournament.json`:

```ts
top_players: Array<{ name: string; point: number; elo: string; title: string }>;
```

The generator reads the parsed, enriched `standings.html` table. It selects up to three valid player rows, preferring the table position when present and otherwise ordering by points descending. Each player uses the enriched player identity, title, and rating; `top_players` is omitted when no valid standings rows exist.

## Files

- Modify `src/prepare-data.mjs` to derive and publish `top_players`.
- Create `v2/src/components/TournamentCard.tsx` for the Tailwind card UI.
- Create `v2/src/components/TournamentCard.preview.tsx` as a non-production Hallmark state wrapper.
- Modify `v2/src/app/page.tsx` to pass each tournament to the component.

## Verification

Run the data preparation script against the existing tournament corpus and inspect generated `www/tournament.json` for valid `top_players` entries. Run `npm run build` from `v2/` and inspect the home page at 320, 375, 414, and 768 CSS pixels. Confirm both destination variants, an available leaderboard strip, omitted strip, focus visibility, and reduced-motion behavior.
