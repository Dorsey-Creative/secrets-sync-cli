/**
 * Dependency Validator Module
 * 
 * Validates required tools before operations begin.
 * Runs checks in parallel and caches results for the session.
 */

import { execWithTimeout } from './timeout.js';

export interface DependencyCheck {
  name: string;
  check: () => Promise<boolean>;
  errorMessage: string;
  installUrl?: string;
  installCommand?: string;
}

export interface ValidationResult {
  success: boolean;
  failures: DependencyCheck[];
}

// Session cache for validation results (exported for testing)
export const validationCache = new Map<string, boolean>();

/**
 * Validate all dependencies in parallel.
 * Returns all failures at once (not fail-fast) so users see complete picture.
 */
export async function validateDependencies(
  checks: DependencyCheck[]
): Promise<ValidationResult> {
  // Run all checks in parallel
  const results = await Promise.all(
    checks.map(async (check) => {
      // Check cache first
      const cached = validationCache.get(check.name);
      if (cached !== undefined) {
        return { check, passed: cached };
      }

      // Run check and handle errors
      let passed = false;
      try {
        passed = await check.check();
      } catch (error) {
        // Treat errors as failures
        passed = false;
      }
      
      // Cache result
      validationCache.set(check.name, passed);
      
      return { check, passed };
    })
  );

  // Collect failures
  const failures = results
    .filter(({ passed }) => !passed)
    .map(({ check }) => check);

  return {
    success: failures.length === 0,
    failures,
  };
}

/**
 * Get platform-specific install command for gh CLI
 */
function getGhInstallCommand(): string {
  const platform = process.platform;
  switch (platform) {
    case 'darwin':
      return 'brew install gh';
    case 'linux':
      return 'See https://cli.github.com for installation instructions';
    case 'win32':
      return 'winget install --id GitHub.cli';
    default:
      return 'See https://cli.github.com for installation instructions';
  }
}

/**
 * Check if gh CLI is installed
 */
export const ghCliCheck: DependencyCheck = {
  name: 'gh-cli',
  check: async () => {
    try {
      await execWithTimeout('gh --version', { operation: 'gh CLI version check' });
      return true;
    } catch (error) {
      return false;
    }
  },
  errorMessage: 'GitHub CLI (gh) not found',
  installUrl: 'https://cli.github.com',
  installCommand: getGhInstallCommand(),
};

/**
 * Check if gh CLI is authenticated
 * Note: Only runs if gh CLI is installed
 */
export const ghAuthCheck: DependencyCheck = {
  name: 'gh-auth',
  check: async () => {
    // First check if gh CLI is installed
    try {
      await execWithTimeout('gh --version', { operation: 'gh CLI version check' });
    } catch (error) {
      // gh not installed, skip auth check (will be caught by ghCliCheck)
      return true;
    }

    // gh is installed, now check auth
    try {
      await execWithTimeout('gh auth status', { operation: 'gh auth status check' });
      return true;
    } catch (error) {
      return false;
    }
  },
  errorMessage: 'GitHub CLI not authenticated',
  installCommand: 'gh auth login',
};

// --- GitHub Token Scope Check (REQ-001, REQ-002, REQ-003, REQ-004, REQ-006, REQ-014) ---

/** Valid GitHub username regex: alphanumeric + hyphen, max 39 chars, no start/end hyphen (REQ-004) */
const GITHUB_OWNER_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

/**
 * Fetch token scopes via the X-Oauth-Scopes response header. (REQ-001, REQ-014)
 * Returns parsed scope array, or null when scopes are undetermined (fine-grained PATs, errors).
 */
export async function getTokenScopes(): Promise<string[] | null> {
  try {
    const { stdout } = await execWithTimeout('gh api --include /', {
      operation: 'token scope check',
    });
    const match = stdout.match(/x-oauth-scopes:\s*(.+)/i);
    if (!match) return null; // REQ-006: fine-grained PAT or absent header
    const raw = match[1].trim();
    if (!raw) return null; // REQ-006: empty scopes header
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  } catch {
    return null; // REQ-006: graceful pass on errors
  }
}

/**
 * Detect whether the current repo belongs to a GitHub Organization. (REQ-004, REQ-014)
 * Returns true for org, false for user, null on failure (graceful degradation).
 */
export async function isOrgRepo(): Promise<boolean | null> {
  try {
    // Step 1: Get repo owner
    const { stdout: ownerOut } = await execWithTimeout(
      'gh repo view --json owner --jq ".owner.login"',
      { operation: 'repo owner check' }
    );
    const owner = ownerOut.trim();
    if (!owner) return null;

    // Sanitize owner to prevent command injection (REQ-004)
    if (!GITHUB_OWNER_REGEX.test(owner)) return null;

    // Step 2: Check if owner is an organization
    const { stdout: typeOut } = await execWithTimeout(
      `gh api /users/${owner} --jq ".type"`,
      { operation: 'owner type check' }
    );
    return typeOut.trim() === 'Organization';
  } catch {
    return null; // REQ-006: graceful pass on failure
  }
}

/**
 * Module-level state for the scope that failed.
 * Used by the errorMessage/installCommand getters on the returned DependencyCheck.
 */
let missingScopeDetail: { scope: string; reason: string } | null = null;

/**
 * Factory that returns a DependencyCheck for GitHub token scopes. (REQ-007, REQ-015)
 * Uses dynamic errorMessage/installCommand getters based on which scope was missing.
 */
export function getGhTokenScopeCheck(): DependencyCheck {
  missingScopeDetail = null;
  return {
    name: 'gh-token-scope',
    check: async () => {
      // REQ-015: Mock mode bypass — no real GitHub interaction
      if (process.env.SECRETS_SYNC_MOCK === '1') return true;

      // REQ-001: Detect token scopes before any mutation
      const scopes = await getTokenScopes();
      if (scopes === null) {
        // REQ-006: Cannot determine scopes — graceful pass
        return true;
      }

      // REQ-002: Verify repo scope (always required)
      if (!scopes.includes('repo')) {
        missingScopeDetail = {
          scope: 'repo',
          reason: 'Required for managing repository secrets',
        };
        return false; // REQ-011: fail-fast
      }

      // REQ-003: If org repo, verify admin:org scope
      const isOrg = await isOrgRepo();
      if (isOrg === true && !scopes.includes('admin:org')) {
        missingScopeDetail = {
          scope: 'admin:org',
          reason: 'Required for managing secrets on organization repositories',
        };
        return false; // REQ-011: fail-fast
      }

      return true;
    },
    // REQ-005: Actionable error messages with fix commands
    get errorMessage() {
      const scope = missingScopeDetail?.scope || 'admin:org';
      const reason = missingScopeDetail?.reason || 'Required for managing secrets';
      return `GitHub token missing required scope: ${scope}. ${reason}`;
    },
    get installCommand() {
      const scope = missingScopeDetail?.scope || 'admin:org';
      return `gh auth refresh -s ${scope}`;
    },
  };
}

/**
 * Parse Node.js version string (e.g., "v18.0.0" -> [18, 0, 0])
 */
function parseNodeVersion(versionString: string): number[] {
  const match = versionString.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

/**
 * Compare two version arrays
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

const MIN_NODE_VERSION = [18, 0, 0];

/**
 * Check if Node.js version meets minimum requirement
 */
export const nodeVersionCheck: DependencyCheck = {
  name: 'node-version',
  check: async () => {
    const currentVersion = parseNodeVersion(process.version);
    return compareVersions(currentVersion, MIN_NODE_VERSION) >= 0;
  },
  errorMessage: `Node.js version ${process.version} is too old (requires >= 18.0.0)`,
  installUrl: 'https://nodejs.org',
};
