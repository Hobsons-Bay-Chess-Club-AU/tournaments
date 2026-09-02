import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const eventPagePath = new URL("../src/app/upcoming/[slug]/page.tsx", import.meta.url);
const attendeesTablePath = new URL("../src/components/UpcomingAttendeesTable.tsx", import.meta.url);

test("upcoming attendees expose FIDE standard and ACF classic ratings in a responsive table", async () => {
  const table = await readFile(attendeesTablePath, "utf8");

  assert.match(table, /overflow-x-auto/);
  assert.match(table, /<th[^>]*>Ratings<\/th>/);
  assert.match(table, /contact\.fideStandard/);
  assert.match(table, /contact\.acfClassic/);
  assert.match(table, />FIDE<\/span>/);
  assert.match(table, />ACF<\/span>/);
});

test("upcoming attendees sort by ACF rating before FIDE rating", async () => {
  const page = await readFile(eventPagePath, "utf8");

  assert.match(page, /\.sort\(\(a, b\) =>/);
  assert.match(page, /b\.acfClassic \|\| 0\) - \(a\.acfClassic \|\| 0\)/);
  assert.match(page, /b\.fideStandard \|\| 0\) - \(a\.fideStandard \|\| 0\)/);
});

test("rating values open a player details dialog with every available rating type", async () => {
  const table = await readFile(attendeesTablePath, "utf8");

  assert.match(table, /"use client"/);
  assert.match(table, /<dialog/);
  assert.match(table, /onClick=\{\(event\) => openDetails\(contact, event\)\}/);
  assert.match(table, /FIDE Ratings/);
  assert.match(table, /FIDE ID/);
  assert.match(table, /ACF ID/);
  assert.match(table, /Standard/);
  assert.match(table, /Rapid/);
  assert.match(table, /Blitz/);
  assert.match(table, /ACF Ratings/);
  assert.match(table, /Classic/);
  assert.match(table, /Quick/);
});
