import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const eventPagePath = new URL("../src/app/upcoming/[slug]/page.tsx", import.meta.url);

test("upcoming attendees expose FIDE standard and ACF classic ratings in a responsive table", async () => {
  const page = await readFile(eventPagePath, "utf8");

  assert.match(page, /overflow-x-auto/);
  assert.match(page, /<th[^>]*>Ratings<\/th>/);
  assert.match(page, /c\.fideStandard/);
  assert.match(page, /c\.acfClassic/);
  assert.match(page, />FIDE<\/span>/);
  assert.match(page, />ACF<\/span>/);
});
