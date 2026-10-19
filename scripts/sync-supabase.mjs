#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { syncAllToSupabase, isSupabaseConfigured } from '../src/supabase.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

if (!isSupabaseConfigured()) {
    console.error('ERROR: Supabase is not configured. Please ensure SUPABASE_URL and SUPABASE_SECRET_KEY are set in scripts/.env or .env');
    process.exit(1);
}

console.log(`Starting Supabase sync from repository at: ${ROOT_DIR}`);

try {
    const result = await syncAllToSupabase(ROOT_DIR);
    if (result.success) {
        console.log('Supabase sync finished successfully!');
        process.exit(0);
    } else {
        console.error('Supabase sync finished with errors:', result.reason);
        process.exit(1);
    }
} catch (err) {
    console.error('Fatal error during Supabase sync:', err);
    process.exit(1);
}
