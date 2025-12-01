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

const FLAG_HELP: Record<string, FlagHelp> = {
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
};

export { FLAG_HELP };
export type { FlagHelp };
