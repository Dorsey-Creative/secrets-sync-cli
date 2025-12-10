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
