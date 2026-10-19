import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const supabaseModulePath = new URL("../src/lib/supabase.ts", import.meta.url);
const pkgPath = new URL("../package.json", import.meta.url);

test("supabase client module exposes client with environment fallback defaults", async () => {
  const [pkgContent, moduleContent] = await Promise.all([
    readFile(pkgPath, "utf8"),
    readFile(supabaseModulePath, "utf8"),
  ]);

  const pkg = JSON.parse(pkgContent);
  assert.ok(
    pkg.dependencies["@supabase/supabase-js"],
    "package.json must include @supabase/supabase-js dependency"
  );

  assert.match(moduleContent, /createClient/, "must use createClient from @supabase/supabase-js");
  assert.match(moduleContent, /NEXT_PUBLIC_SUPABASE_URL/, "must read NEXT_PUBLIC_SUPABASE_URL");
  assert.match(moduleContent, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY/, "must read public key");
  assert.match(moduleContent, /https:\/\/oezanuqlynjqwgkownxd\.supabase\.co/, "must have default fallback URL");
  assert.match(moduleContent, /export (const supabase|function getSupabaseClient)/, "must export supabase client");
});
