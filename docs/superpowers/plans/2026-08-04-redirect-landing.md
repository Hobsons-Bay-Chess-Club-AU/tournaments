# Redirect Landing Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy index's Bootstrap flash with a playful, full-screen HBCC-branded CSS-only redirect landing screen.

**Architecture:** Add a self-contained transition section at the start of `body` in the existing Handlebars template. Template-local CSS hides all other direct body children, then renders the transition scene above them while the existing meta refresh redirects to `/v2` after 1.5 seconds. A Node built-in test validates the static contract of the generated template without adding a test dependency.

**Tech Stack:** Handlebars HTML template, vanilla CSS animations, Node.js `node:test` and `node:assert/strict`.

## Global Constraints

- Modify only the legacy index template and its focused static-contract test.
- Keep the current Handlebars tournament markup intact beneath the landing screen as a no-CSS fallback.
- Keep redirect behavior client-side and set the meta-refresh delay to exactly `1.5` seconds.
- Use no JavaScript, image, font, or animation dependency for the landing screen.
- Keep a visible `/v2` link and disable nonessential animation under `prefers-reduced-motion: reduce`.

---

### Task 1: Lock down the redirect landing contract

**Files:**
- Create: `test/redirect-landing.test.mjs`
- Test: `test/redirect-landing.test.mjs`

**Interfaces:**
- Consumes: UTF-8 text at `www/index.html.hbs`.
- Produces: an executable Node test that fails until the template contains the transition section, a 1.5-second redirect, complete legacy-content suppression, and a reduced-motion override.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const template = await readFile(
  new URL("../www/index.html.hbs", import.meta.url),
  "utf8",
);

test("redirect template presents only the CSS landing screen before v2 loads", () => {
  assert.match(template, /http-equiv="refresh" content="1\.5; url=\/v2"/);
  assert.match(template, /<section class="redirect-landing" aria-labelledby="redirect-title">/);
  assert.match(template, /body > :not\(\.redirect-landing\)\s*\{\s*display: none;/);
  assert.match(template, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(template, /href="\/v2"/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/redirect-landing.test.mjs`

Expected: FAIL because the current refresh is immediate and the landing section and CSS contract do not exist.

- [ ] **Step 3: Commit the failing test**

```bash
git add test/redirect-landing.test.mjs
git commit -m "test: define redirect landing contract"
```

### Task 2: Add the CSS-only transition scene

**Files:**
- Modify: `www/index.html.hbs:5-38` — update the meta-refresh delay and replace the small inline style block with the self-contained transition styles.
- Modify: `www/index.html.hbs:41` — insert the transition section as the first `body` child.
- Test: `test/redirect-landing.test.mjs`

**Interfaces:**
- Consumes: the class names and literal HTML assertions defined in `test/redirect-landing.test.mjs`.
- Produces: `.redirect-landing`, `.redirect-grid`, `.redirect-piece`, `.redirect-content`, and `.redirect-progress` elements styled entirely by the template-local stylesheet.

- [ ] **Step 1: Implement the minimum template changes**

Update the existing refresh tag to:

```html
<meta http-equiv="refresh" content="1.5; url=/v2" />
```

Place this transition section immediately after the opening `<body class="hidden">` tag:

```html
<section class="redirect-landing" aria-labelledby="redirect-title">
  <div class="redirect-grid" aria-hidden="true"></div>
  <span class="redirect-piece redirect-piece--knight" aria-hidden="true">♞</span>
  <span class="redirect-piece redirect-piece--bishop" aria-hidden="true">♝</span>
  <span class="redirect-piece redirect-piece--pawn" aria-hidden="true">♟</span>
  <div class="redirect-content">
    <p class="redirect-eyebrow">Hobsons Bay Chess Club</p>
    <h1 id="redirect-title">Your next move starts here.</h1>
    <p class="redirect-message">Setting up the new tournament experience…</p>
    <div class="redirect-progress" aria-hidden="true"><span></span></div>
    <a class="redirect-link" href="/v2">Continue to tournaments</a>
  </div>
</section>
```

Replace the old legacy body and link styles with scoped landing CSS that:

```css
html, body { min-height: 100%; margin: 0; }
body > :not(.redirect-landing) { display: none; }
.redirect-landing { position: fixed; inset: 0; isolation: isolate; overflow: hidden; display: grid; place-items: center; background: #063c7a; color: #fff; }
@media (prefers-reduced-motion: reduce) { .redirect-landing *, .redirect-landing::before, .redirect-landing::after { animation: none !important; } }
```

Add the detailed keyframes and element rules needed for a drifting checkerboard, staggered floating chess pieces, text entrance, and 1.5-second progress completion. Keep decorative layers `aria-hidden` and make the content readable at 320px width.

- [ ] **Step 2: Run the static contract test**

Run: `node --test test/redirect-landing.test.mjs`

Expected: PASS with one passing test.

- [ ] **Step 3: Inspect the rendered page**

Run: `node -e 'import("handlebars").then(async ({default: Handlebars}) => { const fs = await import("node:fs"); const source = fs.readFileSync("www/index.html.hbs", "utf8"); fs.writeFileSync("/tmp/hbcc-redirect-landing.html", Handlebars.compile(source)({ juniors: [], seniors: [], archive: [], updatedAt: "" })); })'`

Open `/tmp/hbcc-redirect-landing.html` in a browser and confirm at desktop and 320px widths that only the landing scene is visible, its link targets `/v2`, and the loading bar finishes before the redirect. Enable reduced motion in the browser or inspector and confirm decorative movement stops.

- [ ] **Step 4: Run final automated verification**

Run: `node --test test/redirect-landing.test.mjs && git diff --check`

Expected: exit code 0; one passing test and no whitespace errors.

- [ ] **Step 5: Commit the implementation**

```bash
git add www/index.html.hbs test/redirect-landing.test.mjs
git commit -m "feat: add animated v2 redirect landing"
```
