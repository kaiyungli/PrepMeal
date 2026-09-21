import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Regression guard for fix/archive-untracked-legacy-migrations.
//
// Asserts the *real* filesystem state of both supabase/migrations/ and the
// archive directory -- never a hardcoded filename list treated as its own
// proof. Every existence/uniqueness/shape check below reads actual
// directory entries (fs.readdirSync / fs.existsSync) or actual file bytes
// (sha256 of the real file), so a comment or doc mentioning a filename
// cannot accidentally satisfy any assertion here.

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const ARCHIVE_DIR = path.resolve(__dirname, '../docs/database/legacy-migrations-untracked');
const README_PATH = path.join(ARCHIVE_DIR, 'README.md');

const TIMESTAMP_FILENAME_RE = /^(\d{14})_[a-z0-9_]+\.sql$/;

// The 14 filenames archived by this change, and their SHA-256 as recorded
// immediately before the git mv in the reconciliation audit. If any of
// these bytes differ post-move, the archive is not byte-identical.
const ARCHIVED_SHA256: Record<string, string> = {
  '001_create_user_favorites.sql':
    '36026d38aedc64a872dafc0619fdc3836871de375dfdd21d26dcffaf51044c6f',
  '002_create_saved_menu_plans.sql':
    '0ad4c777edf33e887b9ff794935c3d7fa2a5d0d4974e1fbf5fbd933191d87cf4',
  '003_add_times_shown.sql':
    'f97353cac417517401fd6dad0d6f5d4db1f0a1a3f2230088826e14539fe43a73',
  '003_flavor_normalization.sql':
    '5baf25471d1c3d26c63714e293fd3d0e3c688246f8db3915e30a8c488707e722',
  '004_add_increment_times_shown_fn.sql':
    '5e1e6b1f769b3a4001f34d1585b776824f164f15fca4925e519789467f74248c',
  '004_add_recipes_tips.sql':
    '136f2eb65dcc3f89dec4870eeb76985daafae37e144d3830743cd02bd5e2e734',
  '005_add_recipes_created_at_index.sql':
    'd99f819045af313b1012b6780761ba7592d2d8d12313fe6b6df57b733a9f81ac',
  '005_create_user_preferences.sql':
    '732249a6efd71c62cad2a29ea7f969378f4022b02fc96979c3e0b4d0f49474bc',
  '006_atomic_recipe_ops.sql':
    '01995b611c1a328d48de4544bc3ea6d6c1cf0f5226f96867696dbb2cd98c6b45',
  '007_atomic_recipe_create.sql':
    'b5127ccf749f027c050c961461fdc23606e11024f715f6a0a140aa28b4df6794',
  '008_fix_menu_plan_items_constraint.sql':
    'a834056aa74493ab47574202ed025a00a90aee530a40c8501fbc72169703ab8c',
  '009_drop_duplicate_constraint.sql':
    '6dfd3a2a0d18f79a43cde7588ba21c78e1aa6015f49e5ce256064d8d69a93f46',
  '011_revoke_plans_unneeded_privileges.sql':
    'e9c9f871682e2aeafa6e385850a5f8a7f1141cae928c433e0f70fa15651c2833',
  '012_get_menu_plan_shopping_list_json.sql':
    'd123ac2499a94845500cace46bd8986d9ed52d4ff6bd6e2f80de9c84fff82030',
};

const ARCHIVED_FILENAMES = Object.keys(ARCHIVED_SHA256).sort();

// The six migrations independently confirmed (read-only) to already be
// recorded in the linked project's supabase_migrations.schema_migrations,
// plus the target migration this whole reconciliation exists to unblock.
const SIX_RECORDED_VERSIONS = [
  '20260905034023',
  '20260909050201',
  '20260909061735',
  '20260909135709',
  '20260910060642',
  '20260915053240',
];
const TARGET_VERSION = '20260920072450';

function sha256Of(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function activeMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => fs.statSync(path.join(MIGRATIONS_DIR, f)).isFile())
    .filter((f) => f.endsWith('.sql'));
}

describe('migration layout: active supabase/migrations/ contains only timestamped migrations', () => {
  const active = activeMigrationFiles();

  it('found at least one active migration (sanity check the directory resolved correctly)', () => {
    expect(active.length).toBeGreaterThan(0);
  });

  it('every active filename has exactly a 14-digit timestamp version', () => {
    for (const file of active) {
      expect(file, `unexpected active migration filename shape: ${file}`).toMatch(
        TIMESTAMP_FILENAME_RE,
      );
    }
  });

  it('every parsed version is unique', () => {
    const versions = active.map((f) => f.match(TIMESTAMP_FILENAME_RE)?.[1]);
    expect(versions.every(Boolean), 'a filename failed to parse a version').toBe(true);
    const unique = new Set(versions);
    expect(unique.size, `duplicate versions found among: ${JSON.stringify(versions)}`).toBe(
      versions.length,
    );
  });

  it('no 001-012 legacy-style version remains active', () => {
    for (const file of active) {
      expect(file, `legacy-style filename still active: ${file}`).not.toMatch(/^\d{1,3}_/);
    }
  });

  it('none of the 14 archived filenames exists under active migrations', () => {
    for (const name of ARCHIVED_FILENAMES) {
      expect(
        fs.existsSync(path.join(MIGRATIONS_DIR, name)),
        `archived legacy file still present in active migrations: ${name}`,
      ).toBe(false);
    }
  });

  it('the six currently recorded timestamp migrations remain active', () => {
    for (const version of SIX_RECORDED_VERSIONS) {
      const found = active.some((f) => f.startsWith(`${version}_`));
      expect(found, `recorded migration version missing from active dir: ${version}`).toBe(true);
    }
  });

  it('the target migration (20260920072450) remains active', () => {
    const found = active.some((f) => f.startsWith(`${TARGET_VERSION}_`));
    expect(found, 'target migration 20260920072450 is missing from active migrations').toBe(
      true,
    );
    // Filename check only -- does not detect content edits to the file.
    expect(active).toContain('20260920072450_baseline_and_harden_set_updated_at.sql');
  });
});

describe('migration layout: legacy archive directory', () => {
  it('the archive directory exists', () => {
    expect(fs.existsSync(ARCHIVE_DIR)).toBe(true);
  });

  it('contains exactly the 14 archived legacy .sql files, nothing more and nothing less', () => {
    const archived = fs
      .readdirSync(ARCHIVE_DIR)
      .filter((f) => fs.statSync(path.join(ARCHIVE_DIR, f)).isFile())
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(archived).toEqual(ARCHIVED_FILENAMES);
  });

  it('every archived file is byte-identical to its pre-move SHA-256', () => {
    for (const [name, expectedHash] of Object.entries(ARCHIVED_SHA256)) {
      const filePath = path.join(ARCHIVE_DIR, name);
      expect(fs.existsSync(filePath), `expected archived file missing: ${name}`).toBe(true);
      expect(sha256Of(filePath), `SHA-256 mismatch for archived file: ${name}`).toBe(
        expectedHash,
      );
    }
  });
});

describe('migration layout: archive README carries the required warning', () => {
  it('README.md exists in the archive directory', () => {
    expect(fs.existsSync(README_PATH)).toBe(true);
  });

  it('states these files were never recorded in the linked schema_migrations table', () => {
    const readme = fs.readFileSync(README_PATH, 'utf8');
    // Must require the actual negative statement -- must NOT pass for a
    // bare positive sentence like "has ever been recorded" on its own.
    expect(readme).toMatch(/none of these 14 files has ever been recorded/i);
    expect(readme).toMatch(/schema_migrations/);
  });

  it('states the files are preserved for forensic/history purposes only', () => {
    const readme = fs.readFileSync(README_PATH, 'utf8');
    expect(readme).toMatch(/forensic/i);
  });

  it('states they must not be executed or moved back without a new reconciliation review', () => {
    const readme = fs.readFileSync(README_PATH, 'utf8');
    expect(readme).toMatch(/must not be executed/i);
    expect(readme).toMatch(/must not be moved back/i);
    expect(readme).toMatch(/reconciliation review/i);
  });

  it('states no migration repair was performed', () => {
    const readme = fs.readFileSync(README_PATH, 'utf8');
    expect(readme).toMatch(/no `supabase migration repair` was run|no migration repair was performed/i);
  });

  it('states moving the files does not claim they were applied or reverted', () => {
    const readme = fs.readFileSync(README_PATH, 'utf8');
    expect(readme).toMatch(/not a claim that it was ever applied/i);
    expect(readme).toMatch(/not a claim that it was reverted/i);
  });

  it('documents the duplicate versions for 003, 004 and 005', () => {
    const readme = fs.readFileSync(README_PATH, 'utf8');
    expect(readme).toMatch(/`003`/);
    expect(readme).toMatch(/`004`/);
    expect(readme).toMatch(/`005`/);
  });

  it('states the broader fresh-replay/baseline gap remains unresolved and out of scope', () => {
    const readme = fs.readFileSync(README_PATH, 'utf8');
    expect(readme).toMatch(/unresolved/i);
    expect(readme).toMatch(/out of scope/i);
  });
});
