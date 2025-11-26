# Error Message Patterns

## Format Standard

All error messages follow the "what, why, how" format:

```
❌ [What failed]
   [Why it failed]
   [How to fix it]
```

## Color Usage

- **Red** (`❌`): Error indicator
- **Cyan**: Fix commands and URLs (copy-pasteable)
- **Yellow**: Warnings
- **Gray**: Timestamps and debug info

## Examples

### Dependency Errors

```
❌ Missing required dependencies:

1. GitHub CLI (gh) not found
   Install: https://cli.github.com
   Or run: brew install gh
```

### Permission Errors

```
❌ Failed to read /path/to/file
   EACCES: permission denied
   chmod 644 "/path/to/file"
```

### Timeout Errors

```
❌ Operation timed out after 30 seconds
   Check your internet connection
   Increase timeout: SECRETS_SYNC_TIMEOUT=60000
```

## Guidelines

1. **Start with ❌** - Visual indicator of error
2. **State what failed** - One clear sentence
3. **Explain why** - Technical reason (error code, message)
4. **Provide fix** - Actionable command or URL
5. **Use colors** - Cyan for commands, red for errors
6. **Keep it short** - Fit in 80 columns when possible
7. **Make it copy-pasteable** - Commands should work as-is

## Context Inclusion

Include relevant context:
- File paths (absolute or relative)
- Error codes (EACCES, ENOENT, etc.)
- Timeout durations
- Version numbers
- URLs for documentation

## Consistency Checklist

- [ ] Starts with ❌
- [ ] States what failed (one line)
- [ ] Explains why it failed
- [ ] Provides how to fix
- [ ] Includes relevant context
- [ ] Fix command is copy-pasteable
- [ ] Message fits in 80 columns
- [ ] Uses consistent colors
