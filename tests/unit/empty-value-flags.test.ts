import { describe, test, expect } from 'bun:test';
import { parseFlags } from '../../src/secrets-sync';

describe('Empty Value Validation Flag Parsing', () => {
  // TC-REQ-003-A
  test('--strict-empty-values enables strict empty validation', () => {
    const result = parseFlags(['--strict-empty-values']);
    expect(result).toHaveProperty('strictEmptyValues', true);
  });

  // TC-REQ-006-A
  test('--allow-empty collects single pattern', () => {
    const result = parseFlags(['--allow-empty', 'OPTIONAL_KEY']);
    expect(result).toHaveProperty('allowEmpty', ['OPTIONAL_KEY']);
  });

  test('--allow-empty supports comma-separated patterns', () => {
    const result = parseFlags(['--allow-empty', 'KEY_A,KEY_B,KEY_C']);
    expect(result).toHaveProperty('allowEmpty', ['KEY_A', 'KEY_B', 'KEY_C']);
  });

  test('--allow-empty is repeatable', () => {
    const result = parseFlags(['--allow-empty', 'KEY_A', '--allow-empty', 'KEY_B']);
    expect(result).toHaveProperty('allowEmpty', ['KEY_A', 'KEY_B']);
  });

  test('--allow-empty combined with comma-separated and repeatable', () => {
    const result = parseFlags(['--allow-empty', 'A,B', '--allow-empty', 'C']);
    expect(result).toHaveProperty('allowEmpty', ['A', 'B', 'C']);
  });

  test('flags default to false/empty for empty-value options', () => {
    const result = parseFlags(['--dry-run']);
    expect(result).toHaveProperty('strictEmptyValues', false);
    expect(result).toHaveProperty('allowEmpty', []);
  });
});
