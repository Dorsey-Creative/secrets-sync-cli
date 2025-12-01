interface FlagHelp {
  flag: string;
  aliases?: string[];
  description: string;
  usage: string[];
  whenToUse: string[];
  whenNotToUse?: string[];
  relatedFlags?: string[];
  docsUrl: string;
}

const ALIAS_MAP: Record<string, string> = {
  '-f': '--force',
  '-h': '--help',
  '-v': '--version',
};

const FLAG_HELP: Record<string, FlagHelp> = {
  '--env': {
    flag: '--env',
    description: 'Target a specific environment for sync operations.',
    usage: [
      'secrets-sync --env staging',
      'secrets-sync --env production --dry-run',
    ],
    whenToUse: [
      'Sync only one environment instead of all',
      'Test changes in staging before production',
    ],
    relatedFlags: ['--dry-run', '--overwrite'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#cli-options',
  },
  '--dir': {
    flag: '--dir',
    description: 'Specify the directory containing your .env files. Defaults to config/env.',
    usage: [
      'secrets-sync --dir ./envs',
      'secrets-sync --dir /path/to/secrets --dry-run',
    ],
    whenToUse: [
      'Your env files are in a non-standard location',
      'Working with multiple projects with different structures',
    ],
    relatedFlags: ['--env', '--dry-run'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#cli-options',
  },
  '--dry-run': {
    flag: '--dry-run',
    description: 'Preview changes without applying them. Shows what would be updated, added, or removed.',
    usage: [
      'secrets-sync --dry-run',
      'secrets-sync --env staging --dry-run',
    ],
    whenToUse: [
      'Preview changes before applying them',
      'Verify drift detection without modifying files',
      'Test configuration changes safely',
    ],
    relatedFlags: ['--env', '--overwrite', '--verbose'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#cli-options',
  },
  '--overwrite': {
    flag: '--overwrite',
    description: 'Apply all changes without prompts. Skips interactive confirmation for each secret.',
    usage: [
      'secrets-sync --overwrite --dry-run',
      'secrets-sync --env production --overwrite',
    ],
    whenToUse: [
      'Running in CI/CD pipelines',
      'Automating secret updates',
      'You have already reviewed changes with --dry-run',
    ],
    whenNotToUse: [
      'First time syncing an environment',
      'Making changes to production without review',
    ],
    relatedFlags: ['--no-confirm', '--dry-run', '--force'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#cli-options',
  },
  '--skip-unchanged': {
    flag: '--skip-unchanged',
    description: 'Skip secrets that have matching content hashes. Improves performance for large secret sets.',
    usage: [
      'secrets-sync --skip-unchanged',
      'secrets-sync --env staging --skip-unchanged --dry-run',
    ],
    whenToUse: [
      'Syncing large numbers of secrets',
      'Optimizing sync performance',
      'Only updating secrets that have actually changed',
    ],
    relatedFlags: ['--overwrite', '--dry-run'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#cli-options',
  },
  '--force': {
    flag: '--force',
    aliases: ['-f'],
    description: 'Use prefixes for production files instead of layering.',
    usage: [
      'secrets-sync --force --dry-run',
      'secrets-sync --force --env production',
    ],
    whenToUse: [
      'You want explicit prefixes for production overrides',
      'You need to distinguish between .env and .env.prod secrets',
    ],
    whenNotToUse: [
      'You want layered overrides (default behavior)',
    ],
    relatedFlags: ['--overwrite', '--dry-run'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#force',
  },
  '--no-confirm': {
    flag: '--no-confirm',
    description: 'Run in non-interactive mode. Skips all confirmation prompts.',
    usage: [
      'secrets-sync --no-confirm --overwrite',
      'secrets-sync --env staging --no-confirm',
    ],
    whenToUse: [
      'Running in CI/CD environments',
      'Automating secret management',
      'Combined with --overwrite for fully automated runs',
    ],
    whenNotToUse: [
      'First time using the tool',
      'Making changes to production manually',
    ],
    relatedFlags: ['--overwrite', '--dry-run'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#cli-options',
  },
  '--fix-gitignore': {
    flag: '--fix-gitignore',
    description: 'Add missing .gitignore patterns to prevent committing secrets. Ensures .env files are excluded from version control.',
    usage: [
      'secrets-sync --fix-gitignore',
      'secrets-sync --fix-gitignore --dry-run',
    ],
    whenToUse: [
      'Setting up a new project',
      'After adding new .env files',
      'Ensuring secrets are not committed to git',
    ],
    relatedFlags: ['--dry-run', '--dir'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#cli-options',
  },
  '--verbose': {
    flag: '--verbose',
    description: 'Show detailed output including debug information. Useful for troubleshooting and understanding what the tool is doing.',
    usage: [
      'secrets-sync --verbose --dry-run',
      'secrets-sync --env staging --verbose',
    ],
    whenToUse: [
      'Debugging issues',
      'Understanding tool behavior',
      'Reporting bugs with detailed logs',
    ],
    relatedFlags: ['--dry-run'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#cli-options',
  },
  '--help': {
    flag: '--help',
    aliases: ['-h'],
    description: 'Show help information. Use alone for full help, or after any flag for contextual help about that specific flag.',
    usage: [
      'secrets-sync --help',
      'secrets-sync --force --help',
      'secrets-sync --env --help',
    ],
    whenToUse: [
      'Learning about available flags',
      'Getting detailed help for a specific flag',
      'Understanding flag usage and examples',
    ],
    relatedFlags: ['--version', '--verbose'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#readme',
  },
  '--version': {
    flag: '--version',
    aliases: ['-v'],
    description: 'Display the current version of secrets-sync-cli.',
    usage: [
      'secrets-sync --version',
      'secrets-sync -v',
    ],
    whenToUse: [
      'Checking which version is installed',
      'Reporting bugs or issues',
      'Verifying updates',
    ],
    relatedFlags: ['--help'],
    docsUrl: 'https://github.com/Dorsey-Creative/secrets-sync-cli#readme',
  },
};

export { FLAG_HELP, ALIAS_MAP };
export type { FlagHelp };
