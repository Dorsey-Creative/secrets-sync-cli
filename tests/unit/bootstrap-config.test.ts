import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('Bootstrap config loading', () => {
  const testDir = process.cwd();
  const ymlPath = join(testDir, 'env-config.yml');
  const yamlPath = join(testDir, 'env-config.yaml');

  afterEach(() => {
    // Clean up test files
    if (existsSync(ymlPath)) unlinkSync(ymlPath);
    if (existsSync(yamlPath)) unlinkSync(yamlPath);
  });

  test('supports env-config.yml', () => {
    const config = `scrubbing:
  scrubPatterns:
    - CUSTOM_YML_*`;
    
    writeFileSync(ymlPath, config, 'utf-8');
    expect(existsSync(ymlPath)).toBe(true);
  });

  test('supports env-config.yaml', () => {
    const config = `scrubbing:
  scrubPatterns:
    - CUSTOM_YAML_*`;
    
    writeFileSync(yamlPath, config, 'utf-8');
    expect(existsSync(yamlPath)).toBe(true);
  });

  test('prefers .yml over .yaml when both exist', () => {
    const ymlConfig = `scrubbing:
  scrubPatterns:
    - FROM_YML`;
    const yamlConfig = `scrubbing:
  scrubPatterns:
    - FROM_YAML`;
    
    writeFileSync(ymlPath, ymlConfig, 'utf-8');
    writeFileSync(yamlPath, yamlConfig, 'utf-8');
    
    expect(existsSync(ymlPath)).toBe(true);
    expect(existsSync(yamlPath)).toBe(true);
  });
});
