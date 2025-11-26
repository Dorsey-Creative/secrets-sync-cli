import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { safeReadFile, safeWriteFile, safeReadDir, safeExists } from "../../src/utils/safeFs";

const TEST_DIR = path.join(process.cwd(), "tests", "fixtures", "safeFs");
const TEST_FILE = path.join(TEST_DIR, "test.txt");

describe("safeFs", () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("safeReadFile", () => {
    it("should read file successfully", () => {
      fs.writeFileSync(TEST_FILE, "test content");
      const result = safeReadFile(TEST_FILE);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test content");
      }
    });

    it("should return error for non-existent file", () => {
      const result = safeReadFile(path.join(TEST_DIR, "missing.txt"));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.operation).toBe("read");
        expect(result.error.error.message).toContain("ENOENT");
      }
    });

    it("should return error with fix command for permission denied", () => {
      fs.writeFileSync(TEST_FILE, "test");
      fs.chmodSync(TEST_FILE, 0o000);
      const result = safeReadFile(TEST_FILE);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.fixCommand).toBe(`chmod 644 "${TEST_FILE}"`);
      }
      fs.chmodSync(TEST_FILE, 0o644);
    });
  });

  describe("safeWriteFile", () => {
    it("should write file successfully", () => {
      const result = safeWriteFile(TEST_FILE, "new content");
      expect(result.success).toBe(true);
      expect(fs.readFileSync(TEST_FILE, "utf-8")).toBe("new content");
    });

    it("should return error for read-only directory", () => {
      fs.chmodSync(TEST_DIR, 0o555);
      const result = safeWriteFile(TEST_FILE, "content");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.fixCommand).toBe(`chmod 755 "${TEST_DIR}"`);
      }
      fs.chmodSync(TEST_DIR, 0o755);
    });

    it("should return error for read-only file", () => {
      fs.writeFileSync(TEST_FILE, "old content");
      fs.chmodSync(TEST_FILE, 0o444);
      const result = safeWriteFile(TEST_FILE, "new content");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.fixCommand).toBe(`chmod 644 "${TEST_FILE}"`);
      }
      fs.chmodSync(TEST_FILE, 0o644);
    });
  });

  describe("safeReadDir", () => {
    it("should read directory successfully", () => {
      fs.writeFileSync(path.join(TEST_DIR, "file1.txt"), "");
      fs.writeFileSync(path.join(TEST_DIR, "file2.txt"), "");
      const result = safeReadDir(TEST_DIR);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toContain("file1.txt");
        expect(result.data).toContain("file2.txt");
      }
    });

    it("should return error for non-existent directory", () => {
      const result = safeReadDir(path.join(TEST_DIR, "missing"));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.operation).toBe("readdir");
      }
    });

    it("should return error with fix command for permission denied", () => {
      fs.chmodSync(TEST_DIR, 0o000);
      const result = safeReadDir(TEST_DIR);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.fixCommand).toBe(`chmod 755 "${TEST_DIR}"`);
      }
      fs.chmodSync(TEST_DIR, 0o755);
    });
  });

  describe("safeExists", () => {
    it("should return true for existing file", () => {
      fs.writeFileSync(TEST_FILE, "");
      const result = safeExists(TEST_FILE);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it("should return false for non-existent file", () => {
      const result = safeExists(path.join(TEST_DIR, "missing.txt"));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });

  describe("paths with spaces", () => {
    const SPACE_DIR = path.join(TEST_DIR, "dir with spaces");
    const SPACE_FILE = path.join(SPACE_DIR, "file with spaces.txt");

    beforeEach(() => {
      if (!fs.existsSync(SPACE_DIR)) {
        fs.mkdirSync(SPACE_DIR, { recursive: true });
      }
    });

    it("should quote paths with spaces in fix commands", () => {
      fs.writeFileSync(SPACE_FILE, "test");
      fs.chmodSync(SPACE_FILE, 0o000);
      const result = safeReadFile(SPACE_FILE);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.fixCommand).toContain('"');
        expect(result.error.fixCommand).toBe(`chmod 644 "${SPACE_FILE}"`);
      }
      fs.chmodSync(SPACE_FILE, 0o644);
    });
  });
});
