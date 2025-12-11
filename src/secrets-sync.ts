#!/usr/bin/env node
// MUST be imported first before any other imports
import './bootstrap';

/**
 * Secrets Sync CLI – Discovery & Parsing
 *
 * Implements:
 *  - EnvDirectoryScanner with ignore rules and deterministic ordering (production first)
 *  - ProductionResolver layering canonical .env with optional production overrides (opt-in prefix mode available)
 *  - Dotenv parsing into key/value maps (no values logged)
 *  - Drift detection: warn when non-production has keys missing from production
 */

import { mkdirSync, cpSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Logger } from './utils/logger';
import { validateDependencies, ghCliCheck, ghAuthCheck, nodeVersionCheck } from './utils/dependencies';
import { safeReadFile, safeWriteFile, safeReadDir, safeExists } from './utils/safeFs';
import { buildErrorMessage } from './utils/errorMessages';
import { fixGitignore, validateGitignore } from './utils/gitignoreValidator';
import { clearCache } from './utils/scrubber';

// Avoid extra dependencies; simple argv parsing
interface Flags {
  env?: string;
  dir?: string;
  dryRun?: boolean;
  overwrite?: boolean;
  force?: boolean;
  noConfirm?: boolean;
  skipUnchanged?: boolean;
  verbose?: boolean;
  debugLogger?: boolean;
  help?: boolean;
  version?: boolean;
  fixGitignore?: boolean;
}

const DEFAULTS = {
  dir: 'config/env',
};

const IGNORE_SUFFIXES = ['.example', '.template', '.local', '.test'];

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
};

const CONFIRM_INPUT = new TextEncoder().encode('y\n');

type EnvConfig = {
  flags?: Partial<Flags>;
  skipSecrets?: string[];
  backupRetention?: number;
};

type RequiredSecretConfig = {
  shared?: string[];
  production: string[];
  staging?: string[];
};

/**
 * Load required secrets configuration from user's project
 * @param configDir - Directory containing required-secrets.json
 * @returns Parsed configuration or default empty config
 */
function loadRequiredSecrets(configDir: string): RequiredSecretConfig {
  const configPath = join(configDir, 'required-secrets.json');
  
  const existsResult = safeExists(configPath);
  if (!existsResult.success || !existsResult.data) {
    logWarn('[CONFIG] No required-secrets.json found, skipping validation');
    return { production: [], shared: [], staging: [] };
  }
  
  const readResult = safeReadFile(configPath);
  if (!readResult.success) {
    const error = readResult.error;
    logErr(buildErrorMessage({
      what: `Failed to read ${configPath}`,
      why: error.error.message,
      howToFix: error.fixCommand || 'Check file permissions',
    }));
    return { production: [], shared: [], staging: [] };
  }
  
  try {
    const config = JSON.parse(readResult.data) as RequiredSecretConfig;
    logInfo(`[CONFIG] Loaded required secrets from ${configPath}`);
    return config;
  } catch (e) {
    logWarn(`[CONFIG] Failed to parse required-secrets.json: ${(e as Error).message}`);
    return { production: [], shared: [], staging: [] };
  }
}

function loadEnvConfig(initialDir: string): EnvConfig {
  const candidates = ['env-config.yml', 'env-config.yaml'];
  const searchDirs = [process.cwd(), initialDir];

  for (const dir of searchDirs) {
    if (!dir) continue;
    for (const name of candidates) {
      const path = join(dir, name);
      const existsResult = safeExists(path);
      if (!existsResult.success || !existsResult.data) continue;
      
      const readResult = safeReadFile(path);
      if (!readResult.success) {
        logWarn(`Failed to read ${path}: ${readResult.error.error.message}`);
        continue;
      }
      return parseEnvConfig(readResult.data);
    }
  }

  return {};
}

function parseEnvConfig(raw: string): EnvConfig {
  const config: EnvConfig = {};
  let currentSection: 'flags' | 'skipSecrets' | null = null;
  const skipSecrets: string[] = [];
  const flags: Record<string, string> = {};

  const lines = raw.split(/\r?\n/);
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) continue;

    if (/^[A-Za-z0-9_-]+:\s*$/.test(line)) {
      const section = line.slice(0, line.indexOf(':')).trim();
      if (section === 'flags') currentSection = 'flags';
      else if (section === 'skipSecrets') currentSection = 'skipSecrets';
      else currentSection = null;
      continue;
    }

    // Parse top-level backupRetention
    if (!currentSection && line.includes(':')) {
      const [key, value] = line.split(':', 2);
      if (key.trim() === 'backupRetention') {
        const num = parseInt(value.trim(), 10);
        if (!isNaN(num) && num >= 0) {
          config.backupRetention = num;
        }
      }
      continue;
    }

    if (currentSection === 'skipSecrets' && line.startsWith('-')) {
      let value = line.slice(1).trim();
      // Remove inline comments
      const commentIndex = value.indexOf('#');
      if (commentIndex !== -1) {
        value = value.slice(0, commentIndex).trim();
      }
      if (value) skipSecrets.push(value);
      continue;
    }

    if (currentSection === 'flags' && line.includes(':')) {
      const [keyRaw, valueRaw] = line.split(':', 2);
      const key = keyRaw.trim();
      const value = valueRaw.trim();
      if (key) flags[key] = value;
    }
  }

  if (Object.keys(flags).length > 0) {
    config.flags = {};
    for (const [key, value] of Object.entries(flags)) {
      const normalized = key as keyof Flags;
      if (['dryRun', 'overwrite', 'force', 'noConfirm', 'skipUnchanged', 'help', 'version'].includes(normalized)) {
        (config.flags as any)[normalized] = parseBoolean(value);
      } else if (normalized === 'dir' || normalized === 'env') {
        config.flags[normalized] = value as any;
      }
    }
  }

  if (skipSecrets.length > 0) {
    config.skipSecrets = skipSecrets;
  }

  return config;
}

function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return false;
}

function applyConfigFlags(flags: Flags, configFlags?: Partial<Flags>) {
  if (!configFlags) return;
  if (configFlags.dir && !flags.dir) flags.dir = configFlags.dir;
  if (configFlags.env && !flags.env) flags.env = configFlags.env;
  const booleanKeys: (keyof Flags)[] = ['dryRun', 'overwrite', 'force', 'noConfirm', 'skipUnchanged', 'verbose', 'help', 'version'];
  for (const key of booleanKeys) {
    const value = configFlags[key];
    if (typeof value === 'boolean' && value) {
      (flags as any)[key] = true;
    }
  }
}

function matchesSkipPattern(secretName: string, patterns: Set<string>): boolean {
  const upperName = secretName.toUpperCase();
  for (const pattern of patterns) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (upperName.startsWith(prefix)) return true;
    } else if (upperName === pattern) {
      return true;
    }
  }
  return false;
}
const IGNORE_DIRS = new Set(['bak']);

const PROD_NAMES = new Set(['.env', '.env.prod', '.env.prd', '.env.production']);

type EnvFile = {
  path: string;
  name: string; // basename
  isProductionVariant: boolean;
  // token is derived from filename without leading dots and extensions
  token: string; // e.g., 'production', 'staging', 'si', 'prd'
};

function colorizeAction(action: DiffAction, label?: string) {
  const text = label ?? action;
  switch (action) {
    case 'create':
      return `${COLORS.green}${text}${COLORS.reset}`;
    case 'update':
      return `${COLORS.yellow}${text}${COLORS.reset}`;
    case 'delete':
      return `${COLORS.red}${text}${COLORS.reset}`;
    case 'noop':
    default:
      return `${COLORS.dim}${text}${COLORS.reset}`;
  }
}

function printHeader() {
  console.log(`${COLORS.blue}${COLORS.bold}🔐 Secrets Sync CLI${COLORS.reset}`);
  console.log(`${COLORS.dim}================================${COLORS.reset}`);
}

// Logger instance (initialized in main with verbose flag)
let logger: Logger;

// Structured logging helpers
function logInfo(msg: string) {
  if (logger) {
    logger.info(msg);
  } else {
    console.log(`${COLORS.cyan}[INFO]${COLORS.reset} ${msg}`);
  }
}
function logWarn(msg: string) {
  if (logger) {
    logger.warn(msg);
  } else {
    console.warn(`${COLORS.yellow}[WARN]${COLORS.reset} ${msg}`);
  }
}
function logErr(msg: string) {
  if (logger) {
    logger.error(msg);
  } else {
    console.error(`${COLORS.red}[ERROR]${COLORS.reset} ${msg}`);
  }
}
function logSuccess(msg: string) {
  if (logger) {
    logger.info(msg);
  } else {
    console.log(`${COLORS.green}[OK]${COLORS.reset} ${msg}`);
  }
}
function logDebug(msg: string) {
  if (logger) {
    logger.debug(msg);
  }
}

export function printHelp() {
  printHeader();
  console.log('Usage: secrets-sync [options]');
  console.log('');
  console.log('Options:');
  console.log('  --env <name>         Target specific environment');
  console.log('  --dir <path>         Env files directory (default: config/env)');
  console.log('  --dry-run            Preview changes without applying');
  console.log('  --overwrite          Apply all changes without prompts');
  console.log('  --force, -f          Use prefixes for production files');
  console.log('  --skip-unchanged     Skip secrets with matching hashes');
  console.log('  --no-confirm         Non-interactive mode');
  console.log('  --fix-gitignore      Add missing .gitignore patterns');
  console.log('  --verbose            Show detailed output');
  console.log('  --help, -h           Show this help');
  console.log('  --version, -v        Show version');
  console.log('');
  console.log('Examples:');
  console.log('  secrets-sync --dry-run              # Preview changes');
  console.log('  secrets-sync --env staging          # Sync staging only');
  console.log('  secrets-sync --fix-gitignore        # Fix .gitignore');
  console.log('');
  console.log('Documentation: https://github.com/Dorsey-Creative/secrets-sync-cli#readme');
}

export function parseFlags(argv: string[]): Flags | { contextualHelp: string } {
  // Detect contextual help pattern: <flag> --help
  for (let i = 0; i < argv.length - 1; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if ((next === '--help' || next === '-h') && arg.startsWith('-')) {
      // Import alias map to resolve short flags
      const { ALIAS_MAP } = require('./help/flagHelp');
      const resolvedFlag = ALIAS_MAP[arg] || arg;
      return { contextualHelp: resolvedFlag };
    }
  }

  const flags: Flags = {
    dryRun: false,
    overwrite: false,
    force: false,
    noConfirm: false,
    skipUnchanged: false,
    verbose: false,
    debugLogger: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--env':
        flags.env = argv[++i];
        break;
      case '--dir':
        flags.dir = argv[++i];
        break;
      case '--dry-run':
        flags.dryRun = true;
        break;
      case '--overwrite':
        flags.overwrite = true;
        break;
      case '--skip-unchanged':
        flags.skipUnchanged = true;
        break;
      case '--verbose':
        flags.verbose = true;
        break;
      case '--debug-logger':
        flags.debugLogger = true;
        break;
      case '--force':
      case '-f':
        flags.force = true;
        break;
      case '--no-confirm':
        flags.noConfirm = true;
        break;
      case '--help':
      case '-h':
        flags.help = true;
        break;
      case '--version':
      case '-v':
        flags.version = true;
        break;
      case '--fix-gitignore':
        flags.fixGitignore = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown flag: ${arg}`);
          flags.help = true;
        }
        break;
    }
  }
  return flags;
}

function printVersion() {
  const { version } = require('../package.json');
  console.log(`secrets-sync version ${version}`);
}

function ensureDir(dir: string) {
  const existsResult = safeExists(dir);
  if (!existsResult.success || !existsResult.data) {
    mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function scanEnvDirectory(dir: string): EnvFile[] {
  ensureDir(dir);
  const readResult = safeReadDir(dir);
  if (!readResult.success) {
    logErr(buildErrorMessage({
      what: `Failed to read directory ${dir}`,
      why: readResult.error.error.message,
      howToFix: readResult.error.fixCommand || 'Check directory permissions',
    }));
    return [];
  }
  
  const files: EnvFile[] = [];
  for (const name of readResult.data) {
    const fullPath = join(dir, name);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (IGNORE_DIRS.has(name)) continue;
        // skip nested directories (no recursion needed for current design)
        continue;
      }
      if (!stat.isFile()) continue;
      if (!name.startsWith('.env')) continue;
      if (IGNORE_SUFFIXES.some((suffix) => name.endsWith(suffix))) continue;

      const isProductionVariant = PROD_NAMES.has(name);
      let token = 'production';
      if (!isProductionVariant) {
        // .env.staging => staging; .env.si => si; .env.local => local
        token = name.replace(/^\.env\.?/, '').toLowerCase() || 'production';
      }

      files.push({ path: fullPath, name, isProductionVariant, token });
    } catch (e) {
      logWarn(`Failed to stat ${fullPath}: ${(e as Error).message}`);
      continue;
    }
  }

  // deterministic ordering: production variants first (.env first), then others alphabetical by name
  files.sort((a, b) => {
    if (a.isProductionVariant && b.isProductionVariant) {
      if (a.name === '.env') return -1;
      if (b.name === '.env') return 1;
      return a.name.localeCompare(b.name);
    }
    if (a.isProductionVariant) return -1;
    if (b.isProductionVariant) return 1;
    return a.name.localeCompare(b.name);
  });

  return files;
}

function resolveProduction(files: EnvFile[], force: boolean) {
  const prod = files.filter((f) => f.isProductionVariant);
  if (prod.length === 0) {
    // Warn when no production file detected
    console.warn('[WARN] No production env file found (expected one of .env, .env.prod, .env.prd, .env.production)');
    return { canonical: undefined as EnvFile | undefined, others: [] as EnvFile[] };
  }
  if (prod.length === 1) {
    return { canonical: prod[0], others: [] as EnvFile[] };
  }
  // multiple production files – layer overrides by default, optional prefix mode with --force
  const canonical = prod.find((p) => p.name === '.env') || prod[0];
  const others = prod.filter((p) => p !== canonical);
  if (others.length > 0) {
    if (force) {
      const forcedList = others
        .map((p) => {
          const token = deriveForcedProdToken(p.name);
          const prefix = sanitizeTokenForPrefix(token) + '_';
          return `${p.name} => ${prefix}`;
        })
        .join(', ');
      logInfo(`Prefixing production variants (${forcedList}); ${canonical.name} remains canonical.`);
    } else {
      const layeredNames = others.map((p) => p.name).join(', ');
      logInfo(`Layering production overrides: ${canonical.name} <- ${layeredNames}`);
    }
  }
  return { canonical, others };
}

function parseDotenvFile(path: string): Record<string, string> {
  const readResult = safeReadFile(path);
  if (!readResult.success) {
    logErr(buildErrorMessage({
      what: `Failed to read ${path}`,
      why: readResult.error.error.message,
      howToFix: readResult.error.fixCommand || 'Check file permissions',
    }));
    return {};
  }
  
  const txt = readResult.data;
  const out: Record<string, string> = {};
  const lines = txt.split(/\r?\n/);
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // allow "export KEY=..."
    const exportPrefix = line.startsWith('export ');
    const kv = (exportPrefix ? line.slice(7) : line).split('=');
    if (kv.length < 2) continue;
    const key = kv.shift()!.trim();
    let value = kv.join('=').trim();
    // strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function driftWarnings(productionKeys: Set<string> | undefined, envName: string, keys: Set<string>) {
  if (!productionKeys || productionKeys.size === 0) return; // nothing to compare to
  for (const k of keys) {
    if (!productionKeys.has(k)) {
      console.warn(`[WARN][Drift] Key present only in ${envName} but missing in production: ${k}`);
    }
  }
}

// Optional key warnings for non-production
// Only warn about environment-specific keys (e.g., from .env.prod) that are missing,
// not shared keys from canonical .env which are available to all environments
function optionalMissingWarnings(
  productionKeys: Set<string> | undefined,
  productionSourceByKey: Record<string, string> | undefined,
  canonicalFileName: string | undefined,
  envName: string,
  envKeys: Set<string>
) {
  if (!productionKeys || productionKeys.size === 0 || !productionSourceByKey || !canonicalFileName) return;

  for (const k of productionKeys) {
    if (!envKeys.has(k)) {
      // Only warn if this key is NOT from the shared canonical .env file
      // Keys from .env are shared across all environments, so staging doesn't need to redefine them
      const source = productionSourceByKey[k];
      if (source && source !== canonicalFileName) {
        console.warn(`[WARN][Optional] ${envName} is missing optional key present in production: ${k}`);
      }
    }
  }
}

// Deprecated keys – these no longer required but may still exist in GitHub secrets
const DEPRECATED_KEYS: string[] = [
  'MAGIC_LINK_BASE_URL',  // Now derived from BACKEND_BASE_URL
  'STAGING_MAGIC_LINK_BASE_URL',  // Now derived from STAGING_BACKEND_BASE_URL
];
function validateRequiredProductionKeys(prodFileName: string, productionKeys: Set<string> | undefined, requiredProdKeys: string[]): boolean {
  if (!productionKeys) return true; // nothing to validate if no production file
  const missing = requiredProdKeys.filter((k) => !productionKeys.has(k));
  if (missing.length > 0) {
    logErr(`Missing required production keys in ${prodFileName}:`);
    for (const k of missing) console.error(` - ${k}`);
    process.exitCode = 1;
    return false;
  }

  // Warn about deprecated keys that still exist
  const deprecated = DEPRECATED_KEYS.filter((k) => productionKeys.has(k));
  if (deprecated.length > 0) {
    console.warn(`\n[WARN] Deprecated keys found in ${prodFileName}:`);
    for (const k of deprecated) {
      console.warn(`  - ${k} (will be removed after Phase 2 rollout)`);
    }
    console.warn('These keys are no longer required and can be removed from env files and GitHub secrets.\n');
  }

  return true;
}

// Prefix Strategy Helpers
function sanitizeTokenForPrefix(token: string): string {
  return token.replace(/[^a-zA-Z0-9]+/g, '').toUpperCase();
}

function deriveForcedProdToken(name: string): string {
  const raw = name.replace(/^\.env\.?/, '');
  return raw || 'PROD';
}

function computePrefix(f: EnvFile, canonical: EnvFile | undefined, force: boolean): { envName: string; prefix: string } {
  if (canonical && f.path === canonical.path) {
    return { envName: 'production', prefix: '' };
  }
  if (f.isProductionVariant) {
    if (force) {
      const token = deriveForcedProdToken(f.name);
      const prefix = sanitizeTokenForPrefix(token) + '_';
      const envName = token.toLowerCase() || 'production';
      return { envName, prefix };
    }
    // Production overrides are layered before summaries are built, so we should never hit this,
    // but return production/no prefix defensively.
    return { envName: 'production', prefix: '' };
  }
  // Non-production environments
  const envToken = f.token || 'production';
  const envName = envToken;
  const prefix = envToken === 'production' ? '' : sanitizeTokenForPrefix(envToken) + '_';
  return { envName, prefix };
}

// ---- Diff Engine (mocked GitHub layer) ----
type RemoteSecretInfo = { value: string; updatedAt?: string };

interface GitHubSecretsAdapter {
  list(): Promise<Map<string, RemoteSecretInfo>>; // name -> {value, updatedAt}
  set(name: string, value: string): Promise<void>;
  delete(name: string): Promise<void>;
}

class MockGitHubSecretsAdapter implements GitHubSecretsAdapter {
  constructor(private map: Map<string, string>) {}
  async list(): Promise<Map<string, RemoteSecretInfo>> {
    const result = new Map<string, RemoteSecretInfo>();
    for (const [name, value] of this.map.entries()) {
      result.set(name, { value, updatedAt: undefined }); // Mock has values but no timestamps
    }
    return result;
  }
  async set(name: string, value: string): Promise<void> {
    // mutate in-memory map to emulate applied state
    this.map.set(name, value);
  }
  async delete(name: string): Promise<void> {
    this.map.delete(name);
  }
}

class GhCliSecretsAdapter implements GitHubSecretsAdapter {
  async list(): Promise<Map<string, RemoteSecretInfo>> {
    try {
      const proc = spawnSync('gh', ['secret', 'list', '--json', 'name,updatedAt']);
      if (proc.status !== 0) {
        console.warn('[WARN] gh secret list failed; falling back to empty set.');
        return new Map();
      }
      const text = proc.stdout?.toString() || '';
      const arr = JSON.parse(text) as Array<{ name: string; updatedAt: string }>;
      const map = new Map<string, RemoteSecretInfo>();
      for (const item of arr) {
        map.set(item.name, { value: '', updatedAt: item.updatedAt }); // gh CLI doesn't return values
      }
      return map;
    } catch (e) {
      console.warn('[WARN] Unable to invoke gh CLI:', (e as Error).message);
      return new Map();
    }
  }
  async set(name: string, value: string): Promise<void> {
    const proc = spawnSync('gh', ['secret', 'set', name, '--body', value]);
    if (proc.status !== 0) {
      const stderr = proc.stderr?.toString() || '';
      throw new Error(`gh secret set ${name} failed: ${stderr.trim()}`);
    }
  }
  async delete(name: string): Promise<void> {
    const proc = spawnSync('gh', ['secret', 'delete', name], {
      input: CONFIRM_INPUT.slice(),
    });
    if (proc.status !== 0) {
      const stderr = proc.stderr?.toString() || '';
      // Treat not found as success (idempotent)
      if (/not found/i.test(stderr)) return;
      throw new Error(`gh secret delete ${name} failed: ${stderr.trim()}`);
    }
  }
}

function loadMockSecrets(dir: string): Map<string, string> {
  // Reads optional mock payload from `${dir}/.secrets-mock.json` with shape { "NAME": "value" }
  const p = join(dir, '.secrets-mock.json');
  const existsResult = safeExists(p);
  if (!existsResult.success || !existsResult.data) {
    return new Map();
  }
  
  const readResult = safeReadFile(p);
  if (!readResult.success) {
    console.warn('[WARN] Failed to read mock secrets file:', readResult.error.error.message);
    return new Map();
  }
  
  try {
    const obj = JSON.parse(readResult.data) as Record<string, string>;
    return new Map(Object.entries(obj));
  } catch (e) {
    console.warn('[WARN] Failed to parse mock secrets file:', (e as Error).message);
    return new Map();
  }
}

type EnvSummary = {
  name: string;
  file: string;
  keyCount: number;
  keys: string[];
  prefix: string;
  data: Record<string, string>;
  sourceByKey?: Record<string, string>;
};

type DiffAction = 'create' | 'update' | 'delete' | 'noop';

type PlannedChange = { action: DiffAction; name: string; sourceFile?: string };

type AuditRow = { syncItemName: string; itemSource: string; syncAction: DiffAction; syncStatus: 'planned' | 'applied' | 'skipped' | 'failed' | 'unchanged' };

// Manifest for tracking published secret hashes
type SecretManifestEntry = { hash: string; sourceFile: string; updatedAt: string };
type SecretManifest = Record<string, SecretManifestEntry>;

function computeHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function loadManifest(dir: string): SecretManifest {
  const manifestPath = join(dir, 'bak', 'secrets-sync-state.json');
  const existsResult = safeExists(manifestPath);
  if (!existsResult.success || !existsResult.data) {
    return {};
  }
  
  const readResult = safeReadFile(manifestPath);
  if (!readResult.success) {
    logWarn(`Failed to load manifest: ${readResult.error.error.message}`);
    return {};
  }
  
  try {
    return JSON.parse(readResult.data) as SecretManifest;
  } catch (e) {
    logWarn(`Failed to parse manifest: ${(e as Error).message}`);
    return {};
  }
}

function saveManifest(dir: string, manifest: SecretManifest): void {
  const bakDir = join(dir, 'bak');
  const existsResult = safeExists(bakDir);
  if (!existsResult.success || !existsResult.data) {
    mkdirSync(bakDir, { recursive: true });
  }
  
  const manifestPath = join(bakDir, 'secrets-sync-state.json');
  const writeResult = safeWriteFile(manifestPath, JSON.stringify(manifest, null, 2));
  if (!writeResult.success) {
    logErr(buildErrorMessage({
      what: `Failed to save manifest to ${manifestPath}`,
      why: writeResult.error.error.message,
      howToFix: writeResult.error.fixCommand || 'Check directory permissions',
    }));
    return;
  }
  logInfo(`Manifest saved to ${manifestPath}`);
}

function buildDesiredWithSources(summaries: EnvSummary[]): { desired: Map<string, string>; sourceBySecret: Map<string, string> } {
  const desired = new Map<string, string>();
  const sourceBySecret = new Map<string, string>();
  for (const s of summaries) {
    for (const [k, v] of Object.entries(s.data)) {
      const name = (s.prefix || '') + k;
      desired.set(name, v);
      const source = s.sourceByKey?.[k] ?? s.file;
      sourceBySecret.set(name, source);
    }
  }
  return { desired, sourceBySecret };
}

function computeDiffPlan(
  desired: Map<string, string>,
  existing: Map<string, RemoteSecretInfo>,
  validPrefixes: Set<string>,
  prodActive: boolean,
  sourceBySecret: Map<string, string>,
  manifest: SecretManifest,
  forceOverwrite: boolean,
  skipUnchanged: boolean,
  skipSecrets: Set<string>
): { plan: PlannedChange[]; skipped: PlannedChange[] } {
  const plan: PlannedChange[] = [];
  const skipped: PlannedChange[] = [];
  // Creates/Updates/Noops
  for (const [name, val] of desired.entries()) {
    if (matchesSkipPattern(name, skipSecrets)) {
      logInfo(`Skipping ${name} per env-config`);
      skipped.push({ action: 'noop', name, sourceFile: sourceBySecret.get(name) });
      continue;
    }
    const sourceFile = sourceBySecret.get(name);
    if (!existing.has(name)) {
      // Secret doesn't exist remotely
      plan.push({ action: 'create', name, sourceFile });
    } else {
      // Secret exists remotely
      const remoteInfo = existing.get(name)!;
      const hasKnownRemoteValue = remoteInfo.value !== ''; // Mock adapter provides real values
      const manifestEntry = manifest[name];
      const currentHash = computeHash(val);

      if (forceOverwrite) {
        // Force overwrite requested - always update
        plan.push({ action: 'update', name, sourceFile });
      } else if (hasKnownRemoteValue) {
        // Mock adapter: we know the actual remote value, compare directly
        if (remoteInfo.value !== val) {
          plan.push({ action: 'update', name, sourceFile });
        } else {
          plan.push({ action: 'noop', name, sourceFile });
        }
      } else if (!manifestEntry) {
        // No manifest entry - unknown state, must update
        plan.push({ action: 'update', name, sourceFile });
      } else if (manifestEntry.hash !== currentHash) {
        // Local value changed since last sync - must update
        plan.push({ action: 'update', name, sourceFile });
      } else if (remoteInfo.updatedAt && remoteInfo.updatedAt !== manifestEntry.updatedAt) {
        // Remote was modified after our last sync - drift detected!
        logWarn(`Secret ${name} was modified in GitHub (${remoteInfo.updatedAt}) after last sync (${manifestEntry.updatedAt}). Scheduling update.`);
        plan.push({ action: 'update', name, sourceFile });
      } else if (remoteInfo.updatedAt && manifestEntry.updatedAt && remoteInfo.updatedAt === manifestEntry.updatedAt) {
        // Remote timestamp matches manifest and hashes match -> no change
        plan.push({ action: 'noop', name, sourceFile });
      } else if (skipUnchanged) {
        // --skip-unchanged allows trusting manifest even without timestamps
        plan.push({ action: 'noop', name, sourceFile });
      } else {
        // Missing timestamps: conservative default is to reapply to ensure convergence
        plan.push({ action: 'update', name, sourceFile });
      }
    }
  }
  // Deletes (only for secrets in existing that fall under current run's namespaces)
  for (const name of existing.keys()) {
    if (desired.has(name)) continue;
    if (matchesSkipPattern(name, skipSecrets)) {
      skipped.push({ action: 'noop', name, sourceFile: '(env-config)' });
      continue;
    }
    const hasKnownPrefix = Array.from(validPrefixes).some((p) => p && name.startsWith(p));
    // Treat as production candidate when production is active this run and the secret does not start with any known active prefix
    if (hasKnownPrefix || (prodActive && !hasKnownPrefix)) {
      plan.push({ action: 'delete', name });
    }
  }
  return { plan, skipped };
}

function printDiffSummary(plan: PlannedChange[]) {
  const counts = { create: 0, update: 0, delete: 0, noop: 0 } as Record<DiffAction, number>;
  for (const p of plan) counts[p.action]++;
  console.log('');
  console.log('Diff Summary (no mutations)');
  console.log(
    `  ${colorizeAction('create', 'create:')} ${counts.create}, ${colorizeAction('update', 'update:')} ${counts.update}, ${colorizeAction('delete', 'delete:')} ${counts.delete}, ${colorizeAction('noop', 'unchanged:')} ${counts.noop}`
  );
  const show = (label: DiffAction) => {
    const items = plan.filter((p) => p.action === label).map((p) => p.name).sort();
    if (items.length) {
      console.log(`  ${colorizeAction(label, `${label}:`)}`);
      items.forEach((n) => console.log(`   - ${n}`));
    }
  };
  show('create');
  show('update');
  show('delete');
}

// Final audit summary table
function printAuditSummary(
  plan: PlannedChange[],
  options: {
    mode: 'dry-run' | 'real';
    approved?: PlannedChange[];
    failures?: { name: string; action: DiffAction; error: string }[];
    skippedFromConfig?: PlannedChange[];
    skippedFromPrompts?: PlannedChange[];
  }
) {
  const approvedSet = new Set((options.approved ?? []).map((p) => p.name + '|' + p.action));
  const failedSet = new Set((options.failures ?? []).map((f) => f.name + '|' + f.action));
    new Set((options.skippedFromConfig ?? []).map((p) => p.name));
    const promptSkippedSet = new Set((options.skippedFromPrompts ?? []).map((p) => p.name + '|' + p.action));

  const rows: AuditRow[] = [];

  for (const p of plan) {
    let status: AuditRow['syncStatus'];
    if (options.mode === 'dry-run') {
      if (p.action === 'noop') status = 'unchanged';
      else status = 'planned';
    } else {
      const key = p.name + '|' + p.action;
      if (failedSet.has(key)) status = 'failed';
      else if (approvedSet.has(key)) status = 'applied';
      else if (promptSkippedSet.has(key)) status = 'skipped';
      else if (p.action === 'noop') status = 'unchanged';
      else status = 'skipped';
    }

    rows.push({
      syncItemName: p.name,
      itemSource: p.sourceFile ?? '(n/a)',
      syncAction: p.action,
      syncStatus: status,
    });
  }

  if (options.skippedFromConfig?.length) {
    for (const s of options.skippedFromConfig) {
      rows.push({
        syncItemName: s.name,
        itemSource: s.sourceFile ?? '(n/a)',
        syncAction: 'noop',
        syncStatus: 'skipped',
      });
    }
  }

  console.log('');
  console.log('Audit Summary');
  
  // Map internal field names to user-friendly display names
  const displayRows = rows.map(row => ({
    'Secret Name': row.syncItemName,
    'Source': row.itemSource,
    'Action': row.syncAction,
    'Status': row.syncStatus,
  }));
  
  console.table(displayRows);
}

// ---- Backup Writer ----
function isoTimestampCompact(): string {
  // 2025-10-23T16:27:10.123Z -> 20251023T162710Z
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+Z$/, 'Z');
}

function writeBackup(dir: string, fileName: string, sourcePath: string, dryRun: boolean, retention: number = 3) {
  if (dryRun) return; // Skip backups in dry-run mode
  
  const bakDir = join(dir, 'bak');
  ensureDir(bakDir);
  const ts = isoTimestampCompact();
  const target = join(bakDir, `${fileName}-${ts}.bak`);
  cpSync(sourcePath, target);
  try {
    const mode = statSync(sourcePath).mode;
    spawnSync('chmod', [mode.toString(8), target]);
  } catch {
    // best-effort
  }
  console.log(`Backup written: ${target}`);
  
  // Cleanup old backups
  cleanupOldBackups(bakDir, fileName, retention);
}

function createBackupIfNeeded(dir: string, fileName: string, sourcePath: string, dryRun: boolean, retention: number = 3) {
  if (dryRun) return; // Skip backups in dry-run mode
  
  const bakDir = join(dir, 'bak');
  
  try {
    const { shouldCreateBackup } = require('./utils/backupUtils');
    
    if (!shouldCreateBackup(sourcePath, bakDir, fileName)) {
      console.debug(`[DEBUG] Skipping backup for ${fileName} - content unchanged`);
      return;
    }
    
    console.debug(`[DEBUG] Creating backup for ${fileName} - content changed`);
  } catch (error) {
    console.debug(`[DEBUG] Error checking backup necessity, creating backup anyway: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Create backup using existing logic
  writeBackup(dir, fileName, sourcePath, dryRun, retention);
}

function cleanupOldBackups(bakDir: string, fileName: string, keepCount: number) {
  const cleanupStartTime = performance.now();
  const readResult = safeReadDir(bakDir);
  if (!readResult.success) {
    logWarn(`Failed to cleanup old backups: ${readResult.error.error.message}`);
    return;
  }
  
  const pattern = `${fileName}-`; // Hoist pattern to function scope
  
  try {
    const backupFiles = readResult.data
      .filter(f => f.startsWith(pattern) && f.endsWith('.bak'))
      .map(f => {
        const path = join(bakDir, f);
        const stat = statSync(path);
        return { name: f, path, stat };
      });

    // Generate content hashes and create BackupInfo objects
    const { generateContentHash, findDuplicateBackups }: {
      generateContentHash: (filePath: string) => string;
      findDuplicateBackups: (backups: Array<{ path: string; hash: string; mtime: number; name: string }>) => Map<string, Array<{ path: string; hash: string; mtime: number; name: string }>>;
    } = require('./utils/backupUtils');
    
    const backups: Array<{ path: string; hash: string; mtime: number; name: string }> = [];
    
    for (const file of backupFiles) {
      try {
        const hash = generateContentHash(file.path);
        backups.push({
          path: file.path,
          hash,
          mtime: file.stat.mtimeMs,
          name: file.name
        });
      } catch (error) {
        // Skip files that can't be hashed, but keep them in cleanup
        backups.push({
          path: file.path,
          hash: `error-${Date.now()}-${Math.random()}`, // unique hash for error cases
          mtime: file.stat.mtimeMs,
          name: file.name
        });
      }
    }

    // Group by hash and delete older duplicates + excess unique versions
    const dedupeStartTime = performance.now();
    const groups = findDuplicateBackups(backups);
    const duplicatesToDelete: Array<{ path: string; hash: string; mtime: number; name: string }> = [];
    const uniqueBackups: Array<{ path: string; hash: string; mtime: number; name: string }> = [];
    
    for (const group of groups.values()) {
      // Sort group by mtime (newest first)
      group.sort((a, b) => b.mtime - a.mtime);
      // Keep newest, mark older duplicates for deletion
      uniqueBackups.push(group[0]);
      duplicatesToDelete.push(...group.slice(1));
    }
    
    // Sort unique backups by mtime (newest first) and delete excess
    uniqueBackups.sort((a, b) => b.mtime - a.mtime);
    const retentionToDelete: Array<{ path: string; hash: string; mtime: number; name: string }> = [];
    if (uniqueBackups.length > keepCount) {
      retentionToDelete.push(...uniqueBackups.slice(keepCount));
    }
    
    const dedupeDuration = performance.now() - dedupeStartTime;
    
    // Delete all marked files
    const allToDelete = [...duplicatesToDelete, ...retentionToDelete];
    for (const backup of allToDelete) {
      spawnSync('rm', [backup.path]);
    }
    
    const totalDuration = performance.now() - cleanupStartTime;
    
    // Calculate correct metrics
    const duplicatesRemoved = duplicatesToDelete.length;
    const excessRemoved = retentionToDelete.length;
    const totalBackupsProcessed = backupFiles.length;
    const uniqueBackupsKept = Math.min(uniqueBackups.length, keepCount);
    
    // Log performance metrics if cleanup took significant time or processed many files
    if (totalDuration > 100 || backupFiles.length > 5) {
      console.debug(`[DEBUG] Cleanup performance: ${totalDuration.toFixed(1)}ms total (dedupe: ${dedupeDuration.toFixed(1)}ms) for ${backupFiles.length} files`);
    }
    
    // Log summary of cleanup operations
    if (totalBackupsProcessed > 0) {
      console.debug(`[DEBUG] Kept ${uniqueBackupsKept} unique backups out of ${totalBackupsProcessed} total for ${fileName}`);
      
      if (duplicatesRemoved > 0) {
        console.debug(`[DEBUG] Deduplication saved ${duplicatesRemoved} duplicate files for ${fileName}`);
      }
      
      if (excessRemoved > 0) {
        console.debug(`[DEBUG] Retention cleanup removed ${excessRemoved} excess files for ${fileName}`);
      }
    }
  } catch (e) {
    // best-effort cleanup - fallback to original logic
    const backups = readResult.data
      .filter(f => f.startsWith(pattern) && f.endsWith('.bak'))
      .map(f => ({ name: f, path: join(bakDir, f), stat: statSync(join(bakDir, f)) }))
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
    
    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      for (const backup of toDelete) {
        spawnSync('rm', [backup.path]);
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const result = parseFlags(args);

  // Handle contextual help first (before any other processing)
  if ('contextualHelp' in result) {
    const { printFlagHelp } = await import('./help/renderer');
    await printFlagHelp(result.contextualHelp);
    return;
  }

  const flags = result as Flags;

  // Handle version and help flags immediately (no config needed)
  if (flags.help) {
    printHelp();
    return;
  }
  if (flags.version) {
    printVersion();
    return;
  }

  // Initialize logger with verbose flag
  logger = new Logger({ verbose: flags.verbose, debugLogger: flags.debugLogger });
  logDebug(`Parsed flags: ${JSON.stringify(flags)}`);

  // Validate dependencies (unless skipped for CI)
  if (!process.env.SKIP_DEPENDENCY_CHECK) {
    logDebug('Running dependency checks...');
    const result = await validateDependencies([
      nodeVersionCheck,
      ghCliCheck,
      ghAuthCheck,
    ]);

    if (!result.success) {
      console.error(`${COLORS.red}${COLORS.bold}❌ Missing required dependencies:${COLORS.reset}\n`);
      result.failures.forEach((failure, index) => {
        console.error(`${index + 1}. ${COLORS.red}${failure.errorMessage}${COLORS.reset}`);
        if (failure.installUrl) {
          console.error(`   Install: ${COLORS.cyan}${failure.installUrl}${COLORS.reset}`);
        }
        if (failure.installCommand) {
          console.error(`   Or run: ${COLORS.cyan}${failure.installCommand}${COLORS.reset}`);
        }
        console.error('');
      });
      console.error(`${COLORS.yellow}Please install missing dependencies and try again.${COLORS.reset}`);
      process.exit(1);
    }
    logDebug('All dependency checks passed');
  } else {
    logDebug('Skipping dependency checks (SKIP_DEPENDENCY_CHECK set)');
  }

  const initialDir = flags.dir ?? DEFAULTS.dir;
  const envConfig = loadEnvConfig(initialDir);
  applyConfigFlags(flags, envConfig.flags);
  const dir = flags.dir ?? DEFAULTS.dir;
  
  logDebug(`Using directory: ${dir}`);
  
  // Load required secrets configuration at runtime
  const REQUIRED_SECRETS = loadRequiredSecrets(dir);
  const REQUIRED_PROD_KEYS: string[] = Array.isArray(REQUIRED_SECRETS.production) 
    ? [...REQUIRED_SECRETS.production] 
    : [];
  
  logDebug(`Required production keys: ${REQUIRED_PROD_KEYS.length}`);
  
  const skipSecrets = new Set<string>((envConfig.skipSecrets ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean));
  const backupRetention = envConfig.backupRetention ?? 3;

  // Handle --fix-gitignore flag
  if (flags.fixGitignore) {
    console.log(`${COLORS.cyan}Fixing .gitignore...${COLORS.reset}\n`);
    const added = fixGitignore();
    if (added.length === 0) {
      console.log(`${COLORS.green}✓ .gitignore already contains all required patterns${COLORS.reset}`);
    } else {
      console.log(`${COLORS.green}✓ Added ${added.length} pattern${added.length === 1 ? '' : 's'} to .gitignore${COLORS.reset}`);
      added.forEach(p => console.log(`  ${COLORS.dim}+ ${p}${COLORS.reset}`));
    }
    return;
  }

  // Show parsed configuration; avoid printing sensitive data
  printHeader();

  // Validate .gitignore (unless skipped)
  if (!process.env.SKIP_GITIGNORE_CHECK) {
    const gitignoreResult = validateGitignore();
    if (!gitignoreResult.isValid) {
      console.log(`${COLORS.yellow}${COLORS.bold}⚠️  Security Warning: Your .gitignore may not protect secrets${COLORS.reset}\n`);
      console.log(`${COLORS.yellow}Missing patterns in .gitignore:${COLORS.reset}`);
      gitignoreResult.missingPatterns.forEach(p => {
        console.log(`  ${COLORS.yellow}- ${p}${COLORS.reset}`);
      });
      console.log('');
      console.log(`${COLORS.dim}These files contain secrets and should not be committed.${COLORS.reset}\n`);
      console.log(`${COLORS.cyan}Fix: Run with --fix-gitignore flag${COLORS.reset}`);
      console.log(`  ${COLORS.dim}secrets-sync --fix-gitignore${COLORS.reset}\n`);
    }
  }

  console.log('Parsed options:');
  console.table({
    env: flags.env ?? '(not specified)',
    dir,
    dryRun: flags.dryRun,
    overwrite: flags.overwrite,
    force: flags.force,
    noConfirm: flags.noConfirm,
    skipSecrets: skipSecrets.size,
  });
  console.log('');

  if (skipSecrets.size > 0) {
    console.log(`Skip patterns (env-config): ${Array.from(skipSecrets).join(', ')}`);
    console.log('');
  }

  // Scan directory
  const files = scanEnvDirectory(dir);
  if (files.length === 0) {
    console.log('No env files discovered. Place .env* files in', dir);
    return;
  }

  // Resolve production variants
  let canonical: EnvFile | undefined;
  let othersProd: EnvFile[] = [];
  try {
    const res = resolveProduction(files, flags.force ?? false);
    canonical = res.canonical;
    othersProd = res.others;
  } catch (e) {
    // error already logged with non-zero exit code
    return;
  }

  // Parse and collect keys for audit
  const envSummaries: EnvSummary[] = [];
  let prodKeys: Set<string> | undefined;
  let productionData: Record<string, string> | undefined;
  let productionSourceByKey = new Map<string, string>();
  const productionOverrides = new Set(othersProd.map((o) => o.path));

  for (const f of files) {
    const data = parseDotenvFile(f.path);
    const keys = Object.keys(data).filter(Boolean).sort();

    // Backup after parsing each file
    try {
      createBackupIfNeeded(dir, f.name, f.path, flags.dryRun ?? false, backupRetention);
    } catch (e) {
      console.warn('[WARN] Failed to write backup for', f.name, '-', (e as Error).message);
    }

    if (canonical && f.path === canonical.path) {
      productionData = { ...data };
      productionSourceByKey = new Map(keys.map((k) => [k, f.name]));
      continue;
    }

    if (productionOverrides.has(f.path)) {
      if (flags.force) {
        const { envName, prefix } = computePrefix(f, canonical, flags.force ?? false);
        const sourceByKey = Object.fromEntries(keys.map((k) => [k, f.name]));
        envSummaries.push({ name: envName, file: f.name, keyCount: keys.length, keys, prefix, data, sourceByKey });
        continue;
      }
      if (!productionData) {
        productionData = {};
      }
      for (const [k, v] of Object.entries(data)) {
        if (k in productionData) {
          logWarn(`Production override ${f.name} attempted to change ${k}; keeping canonical value from ${canonical?.name ?? '.env'}.`);
          continue;
        }
        productionData[k] = v;
        productionSourceByKey.set(k, f.name);
      }
      continue;
    }

    const { envName, prefix } = computePrefix(f, canonical, flags.force ?? false);
    const sourceByKey = Object.fromEntries(keys.map((k) => [k, f.name]));
    envSummaries.push({ name: envName, file: f.name, keyCount: keys.length, keys, prefix, data, sourceByKey });
  }

  if (canonical) {
    productionData = productionData ?? {};
    const prodKeysArr = Object.keys(productionData).filter(Boolean).sort();
    prodKeys = new Set(prodKeysArr);
    const sourceByKey = Object.fromEntries(prodKeysArr.map((k) => [k, productionSourceByKey.get(k) ?? canonical!.name]));
    envSummaries.unshift({
      name: 'production',
      file: canonical.name,
      keyCount: prodKeysArr.length,
      keys: prodKeysArr,
      prefix: '',
      data: productionData,
      sourceByKey,
    });
  }

  // Audit output
  console.log('Discovered env files (ordered):');
  for (const s of envSummaries) {
    const pref = s.prefix || '(none)';
    console.log(`- ${s.file} -> env: ${s.name} (keys: ${s.keyCount}) prefix: ${pref}`);
  }

  // Validate required production keys (Phase 4)
  if (canonical && !validateRequiredProductionKeys(canonical.name, prodKeys, REQUIRED_PROD_KEYS)) {
    // Abort further processing on validation failure per TR5
    return;
  }

  // Drift warnings (non-prod has keys missing from production)
  if (prodKeys) {
    for (const s of envSummaries) {
      if (s.name === 'production') continue;
      driftWarnings(prodKeys, s.name, new Set(s.keys));
    }
  }
  // Optional missing warnings (non-prod missing keys present in production)
  // Only warn about environment-specific production keys, not shared .env keys
  if (prodKeys && canonical) {
    const prodSummary = envSummaries.find((s) => s.name === 'production');
    const prodSourceByKey = prodSummary?.sourceByKey;

    for (const s of envSummaries) {
      if (s.name === 'production') continue;
      optionalMissingWarnings(prodKeys, prodSourceByKey, canonical.name, s.name, new Set(s.keys));
    }
  }

  // Compute diff (use mock adapter only when MOCK_MODE is explicitly set)
  const MOCK_MODE = process.env.SECRETS_SYNC_MOCK === '1';
  let adapter: GitHubSecretsAdapter;
  if (MOCK_MODE) {
    const mockExisting = loadMockSecrets(dir);
    logInfo('MOCK MODE enabled via SECRETS_SYNC_MOCK=1 — using in-memory mock adapter');
    adapter = new MockGitHubSecretsAdapter(mockExisting);
  } else {
    logDebug('Using gh CLI adapter to read existing GitHub secrets');
    adapter = new GhCliSecretsAdapter();
  }

  // Load manifest for hash-based diff comparison
  const manifest = loadManifest(dir);
  const manifestCount = Object.keys(manifest).length;
  if (manifestCount > 0) {
    logDebug(`Loaded manifest with ${manifestCount} secret(s) for diff comparison`);
  }

  const { desired, sourceBySecret } = buildDesiredWithSources(envSummaries);
  const existing = await adapter.list();
  const validPrefixes = new Set(envSummaries.map((s) => s.prefix).filter(Boolean));
  const prodActive = envSummaries.some((s) => s.prefix === '');
  const { plan, skipped } = computeDiffPlan(
    desired,
    existing,
    validPrefixes,
    prodActive,
    sourceBySecret,
    manifest,
    flags.overwrite ?? false,
    flags.skipUnchanged ?? false,
    skipSecrets
  );

  const configOnlySkipped: PlannedChange[] = [];
  for (const secret of skipSecrets) {
    if (!skipped.some((s) => s.name.toUpperCase() === secret)) {
      configOnlySkipped.push({ action: 'noop', name: secret, sourceFile: '(env-config)' });
    }
  }
  const allSkipped = [...skipped, ...configOnlySkipped];

  if (flags.skipUnchanged && !MOCK_MODE) {
    logWarn('--skip-unchanged enabled: trusting manifest, cannot detect out-of-band GitHub changes');
  }

  printDiffSummary(plan);

  // Confirmation workflow (no mutations yet)
  const mutating = plan.filter((p) => p.action === 'create' || p.action === 'update' || p.action === 'delete');
  if (flags.dryRun) {
    logInfo('Dry-run mode: no prompts, no mutations.');
    printAuditSummary(plan, { mode: 'dry-run', skippedFromConfig: allSkipped });
    console.log('');
    logDebug('Initialization complete: files scanned, production resolved, dotenv parsed, drift warnings emitted.');
    return;
  }

  let approved: PlannedChange[] = [];
  if (mutating.length === 0) {
    console.log('No changes to apply.');
  } else if (flags.overwrite) {
    approved = mutating; // all changes approved without prompts
    console.log('--overwrite supplied: approving all planned changes without prompts.');
  } else if (flags.noConfirm) {
    console.error('--no-confirm supplied without --overwrite; refusing to prompt. Aborting with no changes.');
    process.exitCode = 1;
    return;
  } else {
    const rl = createInterface({ input, output });
    try {
      let acceptAll = false;
      for (const change of mutating) {
        if (acceptAll) {
          approved.push(change);
          continue;
        }
        const answer = await rl.question(`Apply ${change.action.toUpperCase()} for ${change.name}? [y/N/a]: `);
        const normalized = answer.trim().toLowerCase();
        if (normalized === 'a' || normalized === 'all') {
          approved.push(change);
          acceptAll = true;
          logInfo('Accepting all remaining changes.');
          continue;
        }
        if (normalized === 'y' || normalized === 'yes') approved.push(change);
      }
    } finally {
      rl.close();
    }
  }

  // Summary of approvals (no execution yet)
  const promptSkipped = mutating.filter((c) => !approved.includes(c));
  console.log('');
  console.log('Confirmation results (no mutations executed yet):');
  console.log(`  approved: ${approved.length}, skipped: ${promptSkipped.length}`);
  if (approved.length) {
    console.log('  will-apply:');
    for (const a of approved) console.log(`   - ${colorizeAction(a.action)} ${a.name}`);
  }

  // Execute via publisher adapter (always use real gh CLI unless explicit MOCK_MODE)
  let failures: { name: string; action: DiffAction; error: string }[] = [];
  if (approved.length) {
    console.log('');
    // IMPORTANT: Always use real adapter for writes unless MOCK_MODE is explicitly set
    // The mock fixture is only for reading existing secrets during planning/dry-run
    const publisher = MOCK_MODE ? adapter : new GhCliSecretsAdapter();
    console.log(`Executing approved changes with ${MOCK_MODE ? 'mock adapter' : 'gh CLI'}...`);
    failures = [];
    const updatedManifest = { ...manifest }; // Clone existing manifest
    const changedSecrets: string[] = []; // Track which secrets were modified

    for (const change of approved) {
      try {
        if (change.action === 'delete') {
          await publisher.delete(change.name);
          console.log(` ${colorizeAction('delete', 'delete:')} ${change.name}`);
          // Remove from manifest
          delete updatedManifest[change.name];
        } else if (change.action === 'create' || change.action === 'update') {
          const val = desired.get(change.name);
          if (typeof val !== 'string') throw new Error('missing desired value');
          await publisher.set(change.name, val);
          const actionLabel = colorizeAction(change.action, `${change.action}:`);
          console.log(` ${actionLabel} ${change.name}`);
          changedSecrets.push(change.name);
          // Update manifest with hash (timestamp will be fetched after)
          updatedManifest[change.name] = {
            hash: computeHash(val),
            sourceFile: change.sourceFile || 'unknown',
            updatedAt: manifest[change.name]?.updatedAt || '', // Keep old timestamp for now
          };
        }
      } catch (e) {
        failures.push({ name: change.name, action: change.action, error: (e as Error).message });
      }
    }

    // Re-fetch secrets to get actual GitHub updatedAt timestamps
    if (changedSecrets.length > 0 && !MOCK_MODE) {
      logInfo('Fetching updated timestamps from GitHub...');
      try {
        const refreshed = await publisher.list();
        for (const secretName of changedSecrets) {
          const remoteInfo = refreshed.get(secretName);
          if (remoteInfo?.updatedAt && updatedManifest[secretName]) {
            updatedManifest[secretName].updatedAt = remoteInfo.updatedAt;
          }
        }
      } catch (e) {
        logWarn(`Failed to fetch updated timestamps: ${(e as Error).message}`);
        // Use local timestamp as fallback
        const now = new Date().toISOString();
        for (const secretName of changedSecrets) {
          if (updatedManifest[secretName]) {
            updatedManifest[secretName].updatedAt = now;
          }
        }
      }
    }

    // Save updated manifest after successful operations
    if (approved.length > failures.length) {
      saveManifest(dir, updatedManifest);
    }

    if (failures.length) {
      console.error('Some operations failed:');
      for (const f of failures) console.error(` - ${f.action} ${f.name}: ${f.error}`);
      process.exitCode = 1; // TR5 non-zero on failures
    }
  }

  // Print final audit summary for real run
  const skippedFromPrompts = promptSkipped;
  printAuditSummary(plan, {
    mode: 'real',
    approved,
    failures,
    skippedFromConfig: allSkipped,
    skippedFromPrompts,
  });

  console.log('');
  logDebug('Initialization complete: files scanned, production resolved, dotenv parsed, drift warnings emitted.');
  
  // Create timestamp file for pre-push hook (only on successful real sync)
  if (!flags.dryRun && approved.length > 0 && failures.length === 0) {
    safeWriteFile('.secrets-last-sync', new Date().toISOString());
  }
}

// Only run main() when executed directly, not when imported
if (import.meta.main) {
  try {
    await main();
  } finally {
    // Clear scrubbing cache to prevent memory leaks
    clearCache();
  }
}
