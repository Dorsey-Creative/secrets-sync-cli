import { createHash } from 'crypto';
import { readFileSync } from 'fs';

/**
 * Backup file information for deduplication
 */
export interface BackupInfo {
  path: string;
  hash: string;
  mtime: number;
  name: string;
}

/**
 * Generate SHA-256 content hash for a file
 * @param filePath Path to the file to hash
 * @returns SHA-256 hash of file content
 * @throws Error if file cannot be read
 */
export function generateContentHash(filePath: string): string {
  try {
    const content = readFileSync(filePath, 'utf8');
    return createHash('sha256').update(content).digest('hex');
  } catch (error) {
    throw new Error(`Failed to generate hash for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find duplicate backups by grouping them by content hash
 * @param backups Array of backup information
 * @returns Map of hash to array of backups with that hash
 */
export function findDuplicateBackups(backups: BackupInfo[]): Map<string, BackupInfo[]> {
  const groups = new Map<string, BackupInfo[]>();
  
  for (const backup of backups) {
    if (!groups.has(backup.hash)) {
      groups.set(backup.hash, []);
    }
    groups.get(backup.hash)!.push(backup);
  }
  
  return groups;
}

/**
 * Deduplicate backups by keeping the newest timestamp for each unique content
 * @param backups Array of backup information
 * @returns Array of unique backups sorted by modification time (newest first)
 */
export function deduplicateBackups(backups: BackupInfo[]): BackupInfo[] {
  const groups = findDuplicateBackups(backups);
  const unique: BackupInfo[] = [];
  
  for (const group of groups.values()) {
    // Keep the backup with the newest timestamp
    const newest = group.reduce((prev, current) => 
      current.mtime > prev.mtime ? current : prev
    );
    unique.push(newest);
  }
  
  // Sort by modification time (newest first)
  return unique.sort((a, b) => b.mtime - a.mtime);
}

/**
 * Check if backup is needed by comparing content hash with most recent backup
 * @param sourcePath Path to the source file
 * @param bakDir Backup directory path
 * @param fileName Base filename for backup pattern
 * @returns true if backup is needed, false if content matches most recent backup
 */
export function shouldCreateBackup(sourcePath: string, bakDir: string, fileName: string): boolean {
  try {
    const sourceHash = generateContentHash(sourcePath);
    
    // Find most recent backup for this file
    const { readFileSync, readdirSync, statSync } = require('fs');
    const { join } = require('path');
    
    let backupFiles: string[];
    try {
      backupFiles = readdirSync(bakDir);
    } catch {
      // Backup directory doesn't exist, backup is needed
      return true;
    }
    
    const pattern = `${fileName}-`;
    const matchingBackups = backupFiles
      .filter(f => f.startsWith(pattern) && f.endsWith('.bak'))
      .map(f => {
        const fullPath = join(bakDir, f);
        const stat = statSync(fullPath);
        return { path: fullPath, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    
    if (matchingBackups.length === 0) {
      // No existing backups, backup is needed
      return true;
    }
    
    // Compare with most recent backup
    const mostRecentBackup = matchingBackups[0];
    const backupHash = generateContentHash(mostRecentBackup.path);
    
    return sourceHash !== backupHash;
  } catch (error) {
    // If we can't determine, err on the side of creating backup
    console.debug(`[DEBUG] Error checking backup necessity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return true;
  }
}
