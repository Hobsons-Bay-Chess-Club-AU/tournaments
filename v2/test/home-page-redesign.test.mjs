import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homePath = new URL("../src/app/page.tsx", import.meta.url);
const heroPath = new URL("../src/components/HomeHero.tsx", import.meta.url);
const filtersPath = new URL("../src/components/FilterTabs.tsx", import.meta.url);

test("home page exposes a compact masthead and accessible tournament catalogue", async () => {
  const [home, hero, filters] = await Promise.all([
    readFile(homePath, "utf8"),
    readFile(heroPath, "utf8"),
    readFile(filtersPath, "utf8"),
  ]);

  assert.match(hero, /id="tournaments"/);
  assert.match(hero, /Browse tournaments/);
  assert.match(hero, /bg-primary-900/);
  assert.doesNotMatch(hero, /from-purple|to-indigo|from-yellow|to-orange|to-red/);
  assert.match(home, /<h2[^>]*>Tournaments<\/h2>/);
  assert.match(home, /aria-label="Tournament year"/);
  assert.match(home, /aria-label="Previous tournament year"/);
  assert.match(home, /aria-label="Next tournament year"/);
  assert.match(filters, /overflow-x-auto/);
  assert.match(filters, /min-h-11/);
});
