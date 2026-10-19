import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pagePath = new URL("../src/app/[tournament]/page.tsx", import.meta.url);
const clientPath = new URL("../src/app/[tournament]/TournamentClient.tsx", import.meta.url);

test("tournament page routes and client load tournament from database service", async () => {
  const [pageContent, clientContent] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(clientPath, "utf8"),
  ]);

  assert.match(pageContent, /getAllTournamentSlugs/, "generateStaticParams must use getAllTournamentSlugs");
  assert.match(clientContent, /getTournamentBySlug/, "TournamentClient must use getTournamentBySlug");
});
