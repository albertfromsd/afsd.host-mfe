#!/usr/bin/env tsx
/**
 * Drift detector for the AFSD host ↔ remote template pair.
 *
 * Both templates ship independently (see docs/adr/0002-templates-stay-independent.md)
 * but a small set of files MUST stay byte-identical, and the federated
 * AppState contract MUST stay shape-compatible across three files. This
 * script enforces both. Run it in CI; failure exits non-zero with a diff.
 *
 * Usage:
 *   pnpm check:sync                  # checks ../afsd.remote-mfe by default
 *   SYNC_REMOTE_PATH=../foo-remote pnpm check:sync
 *
 * Add a new sync rule by extending BYTE_IDENTICAL_FILES or CONTRACT_CHECKS.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST_ROOT = resolve(__dirname, '..');
const REMOTE_ROOT = resolve(HOST_ROOT, process.env.SYNC_REMOTE_PATH ?? '../afsd.remote-mfe');

type FilePair = {
  label: string;
  host: string;
  remote: string;
};

/**
 * Files that MUST be byte-identical between host and remote. When you add to
 * this list, the script will fail until both copies match exactly.
 *
 * Rationale per file:
 *   - styles/_tokens.scss, _mixins.scss, _breakpoints.scss, _typography.scss
 *     Drift in design tokens produces silent visual divergence between host
 *     and remote-as-embedded vs remote-as-standalone.
 *   - styles/theme.config.ts — Theme registry must match the SCSS tokens.
 *   - lib/api.ts — Same axios behavior + error normalization both sides.
 *   - lib/queryClient.ts — Same staleTime/retry defaults; host's provider is
 *     inherited by embedded remote, but standalone remote uses its own copy.
 *   - lib/mfRuntimePlugin.ts — Same federation error semantics.
 *   - config.alias.ts — Path-alias contract.
 *   - .prettierrc — Formatter contract (a divergence here churns diffs).
 */
const BYTE_IDENTICAL_FILES: FilePair[] = [
  pair('styles/_tokens.scss', 'src/shared/styles/_tokens.scss'),
  pair('styles/_mixins.scss', 'src/shared/styles/_mixins.scss'),
  pair('styles/_breakpoints.scss', 'src/shared/styles/_breakpoints.scss'),
  pair('styles/_typography.scss', 'src/shared/styles/_typography.scss'),
  pair('styles/theme.config.ts', 'src/shared/styles/theme.config.ts'),
  pair('lib/api.ts', 'src/shared/lib/api.ts'),
  pair('lib/eventBus.ts', 'src/shared/lib/eventBus.ts'),
  pair('lib/logger.ts', 'src/shared/lib/logger.ts'),
  pair('lib/mfRuntimePlugin.ts', 'src/shared/lib/mfRuntimePlugin.ts'),
  pair('test/setup.ts', 'src/shared/test/setup.ts'),
  pair('test/msw/server.ts', 'src/shared/test/msw/server.ts'),
  pair('test/msw/handlers.ts', 'src/shared/test/msw/handlers.ts'),
  pair('plop-templates/component/Component.tsx.hbs', 'plop-templates/component/Component.tsx.hbs'),
  pair(
    'plop-templates/component/Component.module.scss.hbs',
    'plop-templates/component/Component.module.scss.hbs',
  ),
  pair(
    'plop-templates/component/Component.test.tsx.hbs',
    'plop-templates/component/Component.test.tsx.hbs',
  ),
  pair('plop-templates/component/index.ts.hbs', 'plop-templates/component/index.ts.hbs'),
  pair('plop-templates/page/Page.tsx.hbs', 'plop-templates/page/Page.tsx.hbs'),
  pair('plop-templates/page/index.ts.hbs', 'plop-templates/page/index.ts.hbs'),
  pair('config.alias.ts', 'config.alias.ts'),
  pair('.prettierrc', '.prettierrc'),
];

// queryClient.ts is NOT byte-identical: the host exports a pre-instantiated
// singleton (`export const queryClient = ...`), the remote intentionally
// doesn't (host-owned in embedded mode). Header docstrings also differ
// (each file describes itself from its own perspective). What MUST match is
// the `createQueryClient` function body — see CONTRACT_CHECKS.

function pair(label: string, relPath: string): FilePair {
  return { label, host: join(HOST_ROOT, relPath), remote: join(REMOTE_ROOT, relPath) };
}

// ─────────────────────────────────────────────────────────────────────────
// Contract checks — files that aren't byte-identical but encode a shared
// contract that must stay shape-compatible. Each check extracts a normalized
// "shape" string from each side and compares.
// ─────────────────────────────────────────────────────────────────────────

type ContractCheck = {
  label: string;
  description: string;
  extract: () => { host: string; remote: string };
};

const CONTRACT_CHECKS: ContractCheck[] = [
  {
    label: 'AppState shape (host store → remote localStore + remotes.d.ts)',
    description:
      'Host store.ts is canonical. Remote localStore.ts must mirror it for standalone\n' +
      '  mode, and remote remotes.d.ts must declare it for embedded mode. Drift between\n' +
      '  the three causes silent embedded-vs-standalone behavior bugs.',
    extract: () => ({
      host: extractAppStateFromHost(),
      remote: extractAppStateFromRemoteLocalStore(),
    }),
  },
  {
    label: 'AppState shape (remote localStore ↔ remote remotes.d.ts)',
    description:
      'The remote declares the federated AppState in two places — the standalone\n' +
      '  fallback (localStore.ts) and the federation type declaration (remotes.d.ts).\n' +
      '  These must match exactly so embedded and standalone behavior align.',
    extract: () => ({
      host: extractAppStateFromRemoteLocalStore(),
      remote: extractAppStateFromRemoteRemotesDts(),
    }),
  },
  {
    label: 'ENV.PUBLIC_PREFIXES + ENV.DEFAULT_*_URL (host/remote app.constants.ts)',
    description:
      'Cross-template invariants documented in AGENTS.md. The ENV block must match\n' +
      '  exactly so dev URLs and inlining prefixes are predictable.',
    extract: () => ({
      host: extractEnvBlock(join(HOST_ROOT, 'src/shared/config/app.constants.ts')),
      remote: extractEnvBlock(join(REMOTE_ROOT, 'src/shared/config/app.constants.ts')),
    }),
  },
  {
    label: 'STORAGE.STORE_KEY + STORE_VERSION (host/remote app.constants.ts)',
    description:
      'Cross-template invariant. A mismatch silently splits sessionStorage between\n' +
      '  embedded and standalone modes, so the persisted store appears empty after a\n' +
      '  mode switch.',
    extract: () => ({
      host: extractStorageBlock(join(HOST_ROOT, 'src/shared/config/app.constants.ts')),
      remote: extractStorageBlock(join(REMOTE_ROOT, 'src/shared/config/app.constants.ts')),
    }),
  },
  {
    label: 'createQueryClient body (host/remote queryClient.ts)',
    description:
      'staleTime, gcTime, retry, refetchOnWindowFocus, and mutation defaults\n' +
      '  must match. Comments and the post-function singleton export legitimately\n' +
      '  differ between host (canonical) and remote (standalone fallback).',
    extract: () => ({
      host: extractQueryClientBody(join(HOST_ROOT, 'src/shared/lib/queryClient.ts')),
      remote: extractQueryClientBody(join(REMOTE_ROOT, 'src/shared/lib/queryClient.ts')),
    }),
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Extractors — narrow, dumb, regex-based. They produce a normalized string
// that's stable under whitespace + trailing comma differences. They are
// NOT typecheckers; they catch shape drift, not type errors.
// ─────────────────────────────────────────────────────────────────────────

function extractAppStateFromHost(): string {
  // Host composes AppState from slices. We sum the slice files.
  const slicesDir = join(HOST_ROOT, 'src/shared/stores/slices');
  const slices = ['authSlice.ts', 'cartSlice.ts', 'uiSlice.ts'];
  const fields: string[] = [];
  for (const file of slices) {
    const content = readSafe(join(slicesDir, file));
    fields.push(...extractTypeFields(content, /export\s+type\s+\w+Slice\s*=\s*\{([\s\S]*?)\};/));
  }
  return normalizeFields(fields);
}

function extractAppStateFromRemoteLocalStore(): string {
  const content = readSafe(join(REMOTE_ROOT, 'src/shared/stores/localStore.ts'));
  const fields = extractTypeFields(content, /export\s+type\s+AppState\s*=\s*\{([\s\S]*?)\};/);
  return normalizeFields(fields);
}

function extractAppStateFromRemoteRemotesDts(): string {
  const content = readSafe(join(REMOTE_ROOT, 'src/shared/types/remotes.d.ts'));
  const fields = extractTypeFields(content, /export\s+type\s+AppState\s*=\s*\{([\s\S]*?)\};/);
  return normalizeFields(fields);
}

function extractTypeFields(content: string, typePattern: RegExp): string[] {
  const match = content.match(typePattern);
  if (!match) return [];
  const body = match[1] ?? '';
  return body
    .split(/[;\n]/)
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('/*'));
}

function normalizeFields(fields: string[]): string {
  // Strip whitespace inside types and sort so field order doesn't matter.
  return fields
    .map((f) => f.replace(/\s+/g, ' ').trim())
    .sort()
    .join('\n');
}

function stripComments(text: string): string {
  // Strip /* … */ (incl. JSDoc /** … */) then line // comments.
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function extractEnvBlock(filePath: string): string {
  return extractConstBlock(filePath, 'ENV');
}

function extractStorageBlock(filePath: string): string {
  return extractConstBlock(filePath, 'STORAGE');
}

function extractConstBlock(filePath: string, name: string): string {
  const content = readSafe(filePath);
  const re = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*as\\s+const;`);
  const match = content.match(re);
  if (!match) return '';
  const body = stripComments(match[1] ?? '');
  // Normalize key-value pairs, ignoring blank lines and trailing commas.
  return body
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter((line) => line.length > 0)
    .sort()
    .join('\n');
}

function extractQueryClientBody(filePath: string): string {
  const content = readSafe(filePath);
  const match = content.match(/export\s+function\s+createQueryClient[\s\S]*?\{([\s\S]*?)\n\}\s*$/m);
  if (!match) return '';
  // Whitespace-normalize so indentation differences don't trigger drift.
  return stripComments(match[1] ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────────────────────────────────────

function readSafe(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  return readFileSync(filePath, 'utf8');
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function unifiedDiff(label: string, host: string, remote: string): string {
  const hostLines = host.split('\n');
  const remoteLines = remote.split('\n');
  const out: string[] = [`--- host  (${label})`, `+++ remote (${label})`];
  const max = Math.max(hostLines.length, remoteLines.length);
  for (let i = 0; i < max; i++) {
    const h = hostLines[i] ?? '';
    const r = remoteLines[i] ?? '';
    if (h !== r) {
      if (h) out.push(`- ${h}`);
      if (r) out.push(`+ ${r}`);
    }
  }
  return out.join('\n');
}

type Failure = { kind: 'identity' | 'contract'; label: string; detail: string };

const failures: Failure[] = [];

console.log(`Checking sync between:\n  host:   ${HOST_ROOT}\n  remote: ${REMOTE_ROOT}\n`);

if (!existsSync(REMOTE_ROOT)) {
  const strict = process.env.SYNC_STRICT === '1';
  const msg =
    `Sibling remote template not found at ${REMOTE_ROOT}.\n` +
    `Set SYNC_REMOTE_PATH to point at the remote template, or run from a layout ` +
    `where ../afsd.remote-mfe resolves.`;
  if (strict) {
    console.error(`${msg}\n\nSYNC_STRICT=1 is set — failing.`);
    process.exit(2);
  }
  console.warn(`⚠ ${msg}\n  Skipping. (Set SYNC_STRICT=1 to fail instead.)`);
  process.exit(0);
}

console.log('— Byte-identical files —');
for (const { label, host, remote } of BYTE_IDENTICAL_FILES) {
  if (!existsSync(host)) {
    failures.push({ kind: 'identity', label, detail: `Missing host file: ${host}` });
    console.log(`  ✗ ${label} — missing host file`);
    continue;
  }
  if (!existsSync(remote)) {
    failures.push({ kind: 'identity', label, detail: `Missing remote file: ${remote}` });
    console.log(`  ✗ ${label} — missing remote file`);
    continue;
  }
  const hostBytes = readFileSync(host, 'utf8');
  const remoteBytes = readFileSync(remote, 'utf8');
  if (hostBytes === remoteBytes) {
    console.log(`  ✓ ${label} (${sha256(hostBytes)})`);
  } else {
    console.log(`  ✗ ${label} — host ${sha256(hostBytes)} vs remote ${sha256(remoteBytes)}`);
    failures.push({
      kind: 'identity',
      label,
      detail: unifiedDiff(label, hostBytes, remoteBytes),
    });
  }
}

console.log('\n— Contract checks —');
for (const check of CONTRACT_CHECKS) {
  try {
    const { host, remote } = check.extract();
    if (host === remote) {
      console.log(`  ✓ ${check.label}`);
    } else {
      console.log(`  ✗ ${check.label}`);
      failures.push({
        kind: 'contract',
        label: check.label,
        detail: `${check.description}\n\n${unifiedDiff(check.label, host, remote)}`,
      });
    }
  } catch (err) {
    console.log(`  ✗ ${check.label} — extraction failed: ${(err as Error).message}`);
    failures.push({
      kind: 'contract',
      label: check.label,
      detail: (err as Error).message,
    });
  }
}

if (failures.length === 0) {
  console.log('\n✓ All sync checks passed.');
  process.exit(0);
}

console.error(`\n✗ ${failures.length} sync check(s) failed:\n`);
for (const f of failures) {
  console.error(`▌ ${f.label}\n`);
  console.error(f.detail);
  console.error('');
}
console.error(
  '\nTo resolve:\n' +
    '  1. Decide which side has the correct content (host is usually canonical).\n' +
    '  2. Update the other side to match.\n' +
    '  3. For AppState drift, see STATE_CONTRACT.md for the three-file checklist.\n',
);
process.exit(1);
