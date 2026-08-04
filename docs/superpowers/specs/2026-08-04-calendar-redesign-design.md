# Calendar redesign — design

## Purpose

Redesign the Hobsons Bay Chess Club calendar for parents, children, and interested public visitors. It should make the full year, a selected month, and the next upcoming event easy to understand, especially on mobile.

## Scope

This is a single-route visual and responsive redesign of `/calendar`.

It preserves the existing CSV data source, parsing, search, filtering, month navigation, selected-date logic, registration destination, and senior/junior event links. The shared application header and footer are out of scope.

## Design direction

- Genre: playful, but not childish.
- Macrostructure: Workbench. The calendar is the primary experience rather than a collection of generic dashboard cards.
- Brand: retain the existing HBCC teal palette and Geist font stack. Add restrained semantic accent colours only where they make event categories easier to scan.
- Copy: retain factual data and actions. Add only concise orienting labels; do not invent club metrics, testimonials, or event data.

## Layout

### Desktop and tablet

- Page heading introduces the calendar and its planning purpose.
- A concise utility band provides registration, total filtered events, and the next upcoming event.
- Search, month selection, type filters, and reset action form one coherent filter area.
- The monthly calendar grid is the main surface.
- Selected-day information appears in a persistent adjacent details rail.

### Mobile

- Controls become a single-column, touch-friendly sequence.
- Month navigation uses short, single-line labels and remains visible without horizontal scrolling.
- The 7-column calendar remains usable with compact day cells; event indicators summarise rather than overcrowd cells.
- Selected-day details move below the calendar in normal document flow, instead of becoming a cramped side rail.
- Every interactive target has at least a 44 px touch area, clear focus visibility, and a non-hover equivalent.

## Interaction and accessibility

- Day buttons retain their current selection semantics, with a stronger selected and today state.
- Search and filters update the displayed entries as they do now.
- Filter, navigation, and registration controls use explicit transitions only for colour, opacity, and transform.
- Focus indicators appear immediately and visibly.
- Reduced-motion users receive no spatial movement.
- The layout will be checked at 320 px, 375 px, 414 px, and 768 px for overflow and wrapped interactive labels.

## File plan

- Modify `v2/src/app/calendar/CalendarClient.tsx` to apply the new semantic structure and class names without changing data behavior.
- Modify `v2/src/app/calendar/page.tsx` for the route-level heading and layout shell.
- Append only safe base and token imports to `v2/src/app/globals.css`.
- Add `v2/src/app/calendar/calendar.css` for the calendar route’s responsive styles.
- Add `v2/tokens.css` for named design tokens consumed by the calendar stylesheet.

No files will be deleted. No app-wide navigation, footer, data loading, or external links will be replaced.

## Verification

- Type-check/build the Next.js app.
- Manually inspect the calendar at 320 px, 375 px, 414 px, 768 px, and desktop width.
- Exercise search, filters, reset, month shifts, Today, day selection, registration, and senior/junior event links.

## Mobile refinement — approved

The mobile summary becomes a single compact strip: filtered event count on the left and the existing “Up next” action on the right. Registration and instructional utility cards are hidden below 640 px so the calendar receives the available breathing room.

Selecting a calendar day on mobile opens a native `<dialog>` styled as a bottom sheet. It contains the selected date, event cards, event links, and an explicit close control. Escape and the close control dismiss it. Desktop retains the existing adjacent selected-day details rail and does not use the dialog.

The refinement changes only `v2/src/app/calendar/CalendarClient.tsx`, `v2/src/app/calendar/calendar.css`, and `v2/test/calendar-redesign.test.mjs`. No data, filtering, registration, or link logic changes.
