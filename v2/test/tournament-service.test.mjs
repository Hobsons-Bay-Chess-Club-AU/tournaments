import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const servicePath = new URL("../src/lib/tournamentService.ts", import.meta.url);

test("tournamentService defines methods and transforms supabase rows into tournament UI shapes", async () => {
  const content = await readFile(servicePath, "utf8");

  assert.match(content, /export async function getTournaments/, "must export getTournaments");
  assert.match(content, /export async function getTournamentBySlug/, "must export getTournamentBySlug");
  assert.match(content, /export async function getAllTournamentSlugs/, "must export getAllTournamentSlugs");
  assert.match(content, /export function mapSupabaseRowToTournament/, "must export mapSupabaseRowToTournament");
  assert.match(content, /export function normalizeTournamentData/, "must export normalizeTournamentData");

  // Fallback checks
  assert.match(content, /tournament\.json/, "must include tournament.json fallback");
  assert.match(content, /data_clean\.json/, "must include data_clean.json fallback");
  assert.match(content, /data\.json/, "must include data.json fallback");
});
