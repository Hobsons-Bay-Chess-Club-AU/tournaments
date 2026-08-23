import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("local-cache writes a FIDE ZIP into the requested monthly directory", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "hbcc-rating-cache-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const sourceFile = join(directory, "players_list.zip");
  const masterDataDirectory = join(directory, "master-data");
  await writeFile(sourceFile, "fixture FIDE ZIP");

  const result = spawnSync(
    process.execPath,
    [
      "src/cache-fide-rating-list.mjs",
      "--month", "Jun-2026",
      "--source", sourceFile,
      "--master-data-dir", masterDataDirectory,
    ],
    { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    await readFile(join(masterDataDirectory, "Jun-2026", "players_list.zip"), "utf8"),
    "fixture FIDE ZIP",
  );
});
