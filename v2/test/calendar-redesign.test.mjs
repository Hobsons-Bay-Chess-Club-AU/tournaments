import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const calendarClientPath = new URL("../src/app/calendar/CalendarClient.tsx", import.meta.url);
const calendarPagePath = new URL("../src/app/calendar/page.tsx", import.meta.url);
const tokensPath = new URL("../tokens.css", import.meta.url);
const calendarStylesPath = new URL("../src/app/calendar/calendar.css", import.meta.url);

test("calendar page exposes a mobile-first planning workspace", async () => {
    const [client, page] = await Promise.all([
        readFile(calendarClientPath, "utf8"),
        readFile(calendarPagePath, "utf8"),
    ]);

    assert.match(page, /calendar-page__intro/);
    assert.match(client, /calendar-workspace/);
    assert.match(client, /calendar-day--selected/);
    assert.match(client, /aria-label=\{`View events for \$\{formatDateLabel\(day\.date\)\}`\}/);
    assert.match(client, /aria-pressed=\{isActive\}/);
    assert.match(client, /useRef<HTMLDialogElement>\(null\)/);
    assert.match(client, /function openDayDetails\(dateKey: string, button: HTMLButtonElement\)/);
    assert.match(client, /<dialog ref=\{detailsDialogRef\}/);
    assert.match(client, /const \[selectedTypes, setSelectedTypes\] = useState<string\[\]>\(\[\]\)/);
    assert.match(client, /function toggleEventType\(type: string\)/);
    assert.match(client, /<dialog\s+ref=\{filterDialogRef\}/);
    assert.match(client, /type="checkbox"/);
});

test("calendar tokens keep tinted surfaces and interactive state coverage", async () => {
    const [tokens, styles] = await Promise.all([
        readFile(tokensPath, "utf8"),
        readFile(calendarStylesPath, "utf8"),
    ]);

    assert.doesNotMatch(tokens, /--color-calendar-surface:\s*oklch\(100% 0 0\)/);
    assert.match(tokens, /--color-calendar-teal-ink:/);
    assert.match(styles, /\.calendar-page :is\(button, a, input, select\):disabled/);
    assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(styles, /\.calendar-utility__registration \{\s+background: var\(--color-calendar-surface\);/);
    assert.match(styles, /\.calendar-utility__registration,\s*\.calendar-utility__hint \{\s*display: none;/);
    assert.match(styles, /\.calendar-details-dialog\[open\]/);
    assert.match(styles, /\.calendar-details-dialog::backdrop/);
    assert.match(styles, /\.calendar-details \{\s*display: none;/);
    assert.match(styles, /\.calendar-details-dialog \{\s*[^}]*inset: auto 0 0;/s);
    assert.match(styles, /\.calendar-filter-trigger \{[^}]*flex-direction: column;/s);
    assert.match(styles, /\.calendar-filter-dialog::backdrop/);
});
