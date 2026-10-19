import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../src/app/page.tsx", import.meta.url);

test("homepage uses tournamentService to load tournaments from database", async () => {
  const content = await readFile(pagePath, "utf8");

  assert.match(content, /import.*getTournaments.*from ["']@\/lib\/tournamentService["']/, "must import getTournaments");
  assert.doesNotMatch(content, /fetch\(process\.env\.NEXT_PUBLIC_APP_URL \+ "\/tournament\.json/, "must not directly fetch tournament.json");
  assert.match(content, /getTournaments\(\)\.then\(/, "must call getTournaments() in useEffect");
});
