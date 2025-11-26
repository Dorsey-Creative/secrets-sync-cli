import * as fs from "fs";
import * as path from "path";
import { PermissionError } from "./errors.js";

export interface FileError {
  path: string;
  operation: "read" | "write" | "readdir" | "exists";
  error: Error;
  fixCommand?: string;
}

export type FileResult<T> = { success: true; data: T } | { success: false; error: FileError };

function getFixCommand(operation: "read" | "write" | "readdir", filePath: string): string {
  const isDirectory = operation === "readdir";
  const permissions = operation === "write" || operation === "readdir" ? "755" : "644";
  return `chmod ${permissions} "${filePath}"`;
}

export function safeReadFile(filePath: string): FileResult<string> {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return { success: true, data };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    return {
      success: false,
      error: {
        path: filePath,
        operation: "read",
        error: err,
        fixCommand: err.code === "EACCES" || err.code === "EPERM" ? getFixCommand("read", filePath) : undefined,
      },
    };
  }
}

export function safeWriteFile(filePath: string, content: string): FileResult<void> {
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true, data: undefined };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EACCES" || err.code === "EPERM") {
      // Check if file exists - if so, it's a file permission issue
      try {
        if (fs.existsSync(filePath)) {
          return {
            success: false,
            error: {
              path: filePath,
              operation: "write",
              error: err,
              fixCommand: getFixCommand("read", filePath), // Use 644 for file
            },
          };
        }
      } catch {}
      // File doesn't exist, so it's a directory permission issue
      return {
        success: false,
        error: {
          path: filePath,
          operation: "write",
          error: err,
          fixCommand: getFixCommand("write", path.dirname(filePath)),
        },
      };
    }
    return {
      success: false,
      error: {
        path: filePath,
        operation: "write",
        error: err,
      },
    };
  }
}

export function safeReadDir(dirPath: string): FileResult<string[]> {
  try {
    const files = fs.readdirSync(dirPath);
    return { success: true, data: files };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    return {
      success: false,
      error: {
        path: dirPath,
        operation: "readdir",
        error: err,
        fixCommand: err.code === "EACCES" || err.code === "EPERM" ? getFixCommand("readdir", dirPath) : undefined,
      },
    };
  }
}

export function safeExists(filePath: string): FileResult<boolean> {
  try {
    const exists = fs.existsSync(filePath);
    return { success: true, data: exists };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    return {
      success: false,
      error: {
        path: filePath,
        operation: "exists",
        error: err,
      },
    };
  }
}
