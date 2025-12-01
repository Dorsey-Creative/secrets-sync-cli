import { describe, test, expect } from 'bun:test';
import { parseFlags } from '../../src/secrets-sync';

describe('Contextual Help Parsing', () => {
  test('detects --force --help pattern', () => {
    const result = parseFlags(['--force', '--help']);
    expect(result).toEqual({ contextualHelp: '--force' });
  });

  test('detects -f --help pattern (alias)', () => {
    const result = parseFlags(['-f', '--help']);
    expect(result).toEqual({ contextualHelp: '--force' });
  });

  test('detects --help alone as regular help', () => {
    const result = parseFlags(['--help']);
    expect(result).toHaveProperty('help', true);
  });

  test('detects --help before flag as regular help', () => {
    const result = parseFlags(['--help', '--force']);
    expect(result).toHaveProperty('help', true);
  });

  test('detects --force alone as normal flag', () => {
    const result = parseFlags(['--force']);
    expect(result).toHaveProperty('force', true);
    expect(result).not.toHaveProperty('contextualHelp');
  });

  test('detects -h as alias for --help in contextual pattern', () => {
    const result = parseFlags(['--force', '-h']);
    expect(result).toEqual({ contextualHelp: '--force' });
  });

  test('resolves -v alias to --version in contextual help', () => {
    const result = parseFlags(['-v', '--help']);
    expect(result).toEqual({ contextualHelp: '--version' });
  });
});
