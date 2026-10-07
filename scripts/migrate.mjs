#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { getSupabase, isSupabaseConfigured } from '../src/supabase.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'supabase', 'migrations');

function getTimestamp() {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// 1. Create a new migration file if --new or new is requested
const newArgIdx = process.argv.findIndex(arg => arg === '--new' || arg === 'new');
if (newArgIdx !== -1) {
    const rawName = process.argv[newArgIdx + 1];
    if (!rawName) {
        console.error('ERROR: Please provide a migration name, e.g.: npm run supabase:migration:new -- add_new_column');
        process.exit(1);
    }
    const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const timestamp = getTimestamp();
    const filename = `${timestamp}_${cleanName}.sql`;
    const targetFile = path.join(MIGRATIONS_DIR, filename);

    if (!fs.existsSync(MIGRATIONS_DIR)) {
        fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    const template = `-- Migration: ${filename}
-- Description: ${cleanName}

-- Write your schema changes (ALTER TABLE, CREATE TABLE, CREATE INDEX, etc.) below:

`;

    fs.writeFileSync(targetFile, template, 'utf8');
    console.log(`Created new migration file:`);
    console.log(`  ${targetFile}`);
    process.exit(0);
}

// 2. Discover migration files
if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

console.log('========================================================');
console.log('Supabase Migration Manager');
console.log('========================================================');
console.log(`Found ${migrationFiles.length} local migration file(s) in supabase/migrations/`);

if (!isSupabaseConfigured()) {
    console.error('ERROR: Supabase credentials not found in scripts/.env or .env');
    process.exit(1);
}

const supabase = getSupabase();

async function run() {
    // Check if _migrations table exists
    const { data: appliedRows, error: checkError } = await supabase
        .from('_migrations')
        .select('version, name, applied_at')
        .order('version', { ascending: true });

    if (checkError) {
        // Check if DATABASE_URL or SUPABASE_ACCESS_TOKEN is available in env
        const dbUrl = process.env.DATABASE_URL;
        const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
        const dbPassword = process.env.SUPABASE_DB_PASSWORD;

        if (dbUrl || (accessToken && dbPassword)) {
            console.log('\n[INFO] Attempting to apply migrations via Supabase CLI...');
            const args = ['supabase', 'db', 'push', '--include-all'];
            if (dbUrl) {
                args.push('--db-url', dbUrl);
            }
            if (dbPassword) {
                args.push('--password', dbPassword);
            }
            const res = spawnSync('npx', args, { stdio: 'inherit', env: process.env });
            if (res.status === 0) {
                console.log('Migrations successfully applied via Supabase CLI!');
                return;
            }
        }

        console.log('\n--------------------------------------------------------');
        console.log('[NOTE] Initial migration setup required:');
        console.log('--------------------------------------------------------');
        console.log('Your .env contains SUPABASE_SECRET_KEY (sb_secret_...), which is');
        console.log('the Service Role API Key used for inserting and querying tournament data.');
        console.log('\nFor DDL schema migrations (creating tables/functions), Supabase requires either:');
        console.log('  1. Adding a CLI Access Token to .env:');
        console.log('     SUPABASE_ACCESS_TOKEN=sbp_... (from https://supabase.com/dashboard/account/tokens)');
        console.log('  2. OR adding your Postgres Database Password to .env:');
        console.log('     SUPABASE_DB_PASSWORD=your_db_password');
        console.log('     OR DATABASE_URL=postgresql://postgres.oezanuqlynjqwgkownxd:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres');
        console.log('\n  3. OR pasting the initial SQL once into the Supabase Dashboard:');
        console.log('     👉 https://supabase.com/dashboard/project/oezanuqlynjqwgkownxd/sql/new');
        console.log(`     File: ${path.join(MIGRATIONS_DIR, '20260930000000_init_tournaments_and_players.sql')}`);
        console.log('\nOnce the initial migration is executed, all future migrations can be');
        console.log('automatically applied directly with "npm run supabase:migrate" using your existing SUPABASE_SECRET_KEY!');
        console.log('========================================================\n');
        return;
    }

    const appliedVersions = new Set((appliedRows || []).map(r => r.version));
    console.log(`Applied migrations in database: ${appliedVersions.size}`);

    const isStatusOnly = process.argv.includes('--status') || process.argv.includes('status');

    let pendingCount = 0;
    for (const filename of migrationFiles) {
        const version = filename.split('_')[0];
        const name = filename.replace(/\.sql$/, '').substring(version.length + 1);
        const isApplied = appliedVersions.has(version);

        if (isApplied) {
            console.log(`  [✓] ${filename} (applied)`);
        } else {
            console.log(`  [ ] ${filename} (pending)`);
            pendingCount++;

            if (!isStatusOnly) {
                console.log(`\n>>> Applying ${filename}...`);
                const filePath = path.join(MIGRATIONS_DIR, filename);
                const sqlContent = fs.readFileSync(filePath, 'utf8');

                const { data: rpcRes, error: rpcErr } = await supabase.rpc('run_migration', {
                    migration_version: version,
                    migration_name: name,
                    sql_content: sqlContent
                });

                if (rpcErr) {
                    console.error(`\nERROR applying ${filename}:`, rpcErr.message);
                    process.exit(1);
                }

                console.log(`>>> Success: ${filename} applied!`);
            }
        }
    }

    console.log('--------------------------------------------------------');
    if (isStatusOnly) {
        console.log(`Summary: ${migrationFiles.length - pendingCount} applied, ${pendingCount} pending.`);
    } else if (pendingCount === 0) {
        console.log('Database schema is fully up to date! No pending migrations.');
    } else {
        console.log(`Successfully applied ${pendingCount} migration(s).`);
    }
    console.log('========================================================');
}

run().catch(err => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
});
