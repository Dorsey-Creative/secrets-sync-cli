import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

/**
 * Result of .gitignore validation
 */
export interface ValidationResult {
  isValid: boolean;
  missingPatterns: string[];
  warnings: string[];
}

/**
 * Required patterns for .gitignore in correct order
 * Wildcards must come before negations
 */
const REQUIRED_PATTERNS = [
  '.env',
  '.env.*',
  '!.env.example',
  '**/bak/',
  '*.bak'
] as const;

/**
 * Get required .gitignore patterns
 */
export function getRequiredPatterns(): readonly string[] {
  return REQUIRED_PATTERNS;
}

/**
 * Validate .gitignore file for required patterns
 * @param gitignorePath - Path to .gitignore file (defaults to project root)
 * @returns Validation result with missing patterns and warnings
 */
export function validateGitignore(gitignorePath?: string): ValidationResult {
  const path = gitignorePath || join(process.cwd(), '.gitignore');
  const result: ValidationResult = {
    isValid: true,
    missingPatterns: [],
    warnings: []
  };

  // Check if .gitignore exists
  if (!existsSync(path)) {
    result.isValid = false;
    result.missingPatterns = [...REQUIRED_PATTERNS];
    result.warnings.push('.gitignore file not found');
    return result;
  }

  // Read and parse .gitignore
  let content: string;
  try {
    content = readFileSync(path, 'utf-8');
  } catch (error) {
    result.isValid = false;
    result.warnings.push('Failed to read .gitignore file');
    return result;
  }

  // Normalize content (forward slashes for cross-platform)
  const normalizedContent = content.replace(/\\/g, '/');
  const lines = normalizedContent.split('\n').map(line => line.trim());

  // Check for missing patterns
  for (const pattern of REQUIRED_PATTERNS) {
    if (!lines.includes(pattern)) {
      result.isValid = false;
      result.missingPatterns.push(pattern);
    }
  }

  // Validate pattern order (negations should come after wildcards)
  const envIndex = lines.indexOf('.env');
  const envWildcardIndex = lines.indexOf('.env.*');
  const envExampleIndex = lines.indexOf('!.env.example');

  if (envExampleIndex !== -1 && (envIndex === -1 || envWildcardIndex === -1)) {
    result.warnings.push('Negation pattern !.env.example found without corresponding wildcard patterns');
  } else if (envExampleIndex !== -1 && envExampleIndex < Math.max(envIndex, envWildcardIndex)) {
    result.warnings.push('Negation pattern !.env.example should come after wildcard patterns');
  }

  return result;
}

/**
 * Fix .gitignore by adding missing patterns
 * @param gitignorePath - Path to .gitignore file (defaults to project root)
 * @returns Array of patterns that were added
 */
export function fixGitignore(gitignorePath?: string): string[] {
  const path = gitignorePath || join(process.cwd(), '.gitignore');
  const validation = validateGitignore(path);

  if (validation.isValid) {
    return [];
  }

  // Create .gitignore if it doesn't exist
  if (!existsSync(path)) {
    const header = '# Environment files (added by secrets-sync-cli)\n';
    const patterns = REQUIRED_PATTERNS.join('\n') + '\n';
    writeFileSync(path, header + patterns, 'utf-8');
    return [...REQUIRED_PATTERNS];
  }

  // Append missing patterns to existing file
  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  
  // Find the first negation pattern index
  let firstNegationIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('!')) {
      firstNegationIndex = i;
      break;
    }
  }
  
  // Separate wildcards and negations from missing patterns
  const wildcards = validation.missingPatterns.filter(p => !p.startsWith('!'));
  const negations = validation.missingPatterns.filter(p => p.startsWith('!'));
  
  // If there are existing negations and we have wildcards to add, insert before first negation
  if (firstNegationIndex !== -1 && wildcards.length > 0) {
    const header = '\n# Environment files (added by secrets-sync-cli)\n';
    const wildcardBlock = wildcards.join('\n') + '\n';
    lines.splice(firstNegationIndex, 0, header + wildcardBlock);
    
    // Append negations at the end if any
    if (negations.length > 0) {
      lines.push('', '# Environment files (added by secrets-sync-cli)', ...negations);
    }
    
    writeFileSync(path, lines.join('\n'), 'utf-8');
  } else {
    // No existing negations or only negations to add - append normally
    const needsNewline = content.length > 0 && !content.endsWith('\n');
    const header = (needsNewline ? '\n' : '') + '\n# Environment files (added by secrets-sync-cli)\n';
    const patterns = validation.missingPatterns.join('\n') + '\n';
    appendFileSync(path, header + patterns, 'utf-8');
  }
  
  return validation.missingPatterns;
}
