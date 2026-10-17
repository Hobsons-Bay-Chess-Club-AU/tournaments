# Home Page Redesign Design

## Goal

Redesign the v2 tournament home page into a clear, responsive tournament catalogue while preserving Hobsons Bay Chess Club's established teal brand.

## Scope

- Update the home page shell, hero, tournament-catalogue controls, and responsive layout.
- Preserve existing tournament data loading, status logic, filtering behavior, card content, routes, and brand color values.
- Do not add external dependencies, change tournament data, or alter non-home routes.

## Visual Direction

Use a compact editorial archive layout rather than the current decorative, multi-colour hero. The page uses the existing deep teal scale (`#105463` and its existing shades) with neutral paper/surface backgrounds and established calendar tokens. Existing yellow/orange/red and purple/indigo hero accents are removed.

The hero becomes a focused deep-teal masthead with:

- A clear `h1` and short archive promise.
- One primary catalogue action that links to the tournament section.
- Timeline and leaderboard links as secondary text actions.
- Subtle CSS-only checkerboard geometry, with no decorative pulse animation.

## Catalogue Structure

Below the hero, a centred `max-w-7xl` catalogue region provides responsive gutters and a stable content frame. It contains:

1. A `Tournaments` heading and live result count.
2. Year navigation promoted to a top toolbar, with accessible previous/next buttons and the current year.
3. A horizontally scrollable, touch-friendly category filter rail on small screens. Filter controls retain their current state and filtering contract.
4. The existing tournament-card grid, retained as the primary way to scan events.
5. The existing bottom year controls are removed because the same state is available at the top of the catalogue.

The cards retain their present date, status, destination, and optional standings anatomy. The surrounding surface, borders, spacing, focus styling, and responsive grid are aligned to the same calm teal-and-paper system.

## Accessibility and Responsive Behaviour

- Keep sequential headings: one page `h1`, followed by the catalogue `h2`.
- Give controls clear labels, visible keyboard focus, and at least 44px target height.
- Do not depend on colour alone for status or the selected filter.
- Prevent horizontal page overflow; only the filter rail may scroll horizontally on compact screens.
- Use transform/opacity-only hover motion and disable non-essential motion under `prefers-reduced-motion`.
- Use a layout that remains readable at 375px, 768px, 1024px, and 1440px.

## Implementation Files

- `v2/src/components/HomeHero.tsx`: compact, brand-coherent masthead and navigation hierarchy.
- `v2/src/components/FilterTabs.tsx`: accessible, scrollable filter controls for compact screens.
- `v2/src/app/page.tsx`: catalogue shell, result count, top year controls, and responsive grid framing.
- `v2/src/app/globals.css`: scoped reusable utility styles only if Tailwind utilities are insufficient for reduced-motion or geometry.

## Verification

- Add or update a focused automated check for the new home-page hierarchy/controls where the existing test setup permits.
- Run the applicable test, lint/type validation, and `npm run build` from `v2`.
- Inspect desktop and mobile layouts and confirm no page-level horizontal overflow, keyboard focus, filter controls, year controls, no-results state, and reduced-motion behaviour.
