/**
 * Dependency Validator Module
 * 
 * Validates required tools before operations begin.
 * Runs checks in parallel and caches results for the session.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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
      await execAsync('gh --version');
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
      await execAsync('gh --version');
    } catch (error) {
      // gh not installed, skip auth check (will be caught by ghCliCheck)
      return true;
    }

    // gh is installed, now check auth
    try {
      await execAsync('gh auth status');
      return true;
    } catch (error) {
      return false;
    }
  },
  errorMessage: 'GitHub CLI not authenticated',
  installCommand: 'gh auth login',
};

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
