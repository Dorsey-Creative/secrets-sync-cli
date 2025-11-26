# Contributing to secrets-sync-cli

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) runtime (latest version)
- [GitHub CLI](https://cli.github.com) (for testing GitHub integration)
- Node.js >= 18 (for compatibility testing)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/Dorsey-Creative/secrets-sync-cli.git
cd secrets-sync-cli

# Install dependencies
bun install

# Run in development mode
bun run dev -- --help

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Build the project
bun run build

# Run quality checks
bun run quality
```

## Code Style Guidelines

### TypeScript

- Use TypeScript with strict mode enabled
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Keep functions small and focused (< 50 lines)

### Naming Conventions

- **Files:** kebab-case (`error-messages.ts`)
- **Functions:** camelCase (`buildErrorMessage()`)
- **Classes:** PascalCase (`AppError`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- **Interfaces:** PascalCase (`TimeoutOptions`)

### Error Handling

All errors should follow the "what, why, how" format:

```typescript
logger.error(`❌ Failed to read file: ${path}`);
logger.error(`   ${error.message}`);
logger.error(`   Fix: chmod 644 "${path}"`);
```

See `docs/ERROR_MESSAGES.md` for complete error message patterns.

### Code Organization

- **src/**: Source code
  - `secrets-sync.ts`: CLI entry point
  - `utils/`: Utility modules (errors, logger, timeout, etc.)
  - `messages/`: Error message catalog
- **tests/**: Test files
  - `unit/`: Unit tests
  - `integration/`: Integration tests
  - `e2e/`: End-to-end tests
  - `fixtures/`: Test fixtures
- **docs/**: Documentation
- **development/**: Design docs and planning

## Testing Requirements

### Test Coverage

- Minimum 90% coverage for new code
- 100% coverage for error handling modules
- All tests must pass before PR approval

### Test Types

**Unit Tests** (`tests/unit/`)
- Test individual functions/classes in isolation
- Mock external dependencies
- Fast execution (< 100ms per test)

**Integration Tests** (`tests/integration/`)
- Test module interactions
- Use real file system operations
- Test CLI execution with various flags

**E2E Tests** (`tests/e2e/`)
- Test complete user journeys
- Verify error messages and fix commands
- Test cross-platform compatibility

### Writing Tests

```typescript
import { describe, it, expect } from "bun:test";

describe("Feature Name", () => {
  it("should do something specific", () => {
    // Arrange
    const input = "test";
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe("expected");
  });
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/errors.test.ts

# Run tests in watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

## Quality Standards

Before submitting a PR, ensure:

- [ ] All tests pass (`bun test`)
- [ ] Code builds successfully (`bun run build`)
- [ ] Code quality checks pass (`bun run quality`)
- [ ] Code duplication < 5%
- [ ] No TypeScript errors
- [ ] Error messages follow standard format

## Pull Request Process

### Before Submitting

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines

3. Add tests for new functionality

4. Update documentation (README, CHANGELOG, etc.)

5. Run quality checks:
   ```bash
   bun test
   bun run build
   bun run quality
   ```

### PR Guidelines

- **Title:** Use conventional commits format
  - `feat: add new feature`
  - `fix: resolve bug`
  - `docs: update documentation`
  - `test: add tests`
  - `refactor: improve code structure`

- **Description:** Include:
  - What changed and why
  - Related issue number (e.g., `Closes #14`)
  - Testing performed
  - Screenshots (if UI changes)

- **Size:** Keep PRs focused and reasonably sized (< 500 lines)

- **Commits:** Squash commits before merging

### Review Process

1. Automated checks must pass (tests, build, quality)
2. At least one maintainer approval required
3. Address review feedback
4. Maintainer will merge when approved

## Issue Reporting Guidelines

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Bun version, etc.)
- Error messages and logs
- Minimal reproduction example

### Feature Requests

Include:
- Problem statement (what pain point does this solve?)
- Proposed solution
- Alternative solutions considered
- Priority level (Low/Medium/High)

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed

## Development Workflow

### Branch Strategy

- `main`: Production releases only
- `release`: Release candidates
- `develop`: Active development (default branch)
- `feature/*`: Feature branches
- `fix/*`: Bug fix branches

### Version Numbering

- **Release versions:** Semantic versioning (e.g., `1.1.0`)
- **Build versions:** Date-based (e.g., `1.1.0-20251125.1`)
- Builds reset daily on `develop` branch

### Release Process

1. Features merged to `develop`
2. Create release branch from `develop`
3. Version bump and final testing
4. Merge to `main` and tag release
5. Publish to npm via CI/CD

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

## Getting Help

- **Questions:** Open a GitHub Discussion
- **Bugs:** Open a GitHub Issue
- **Security:** Email security concerns privately
- **Chat:** Join our community (link TBD)

## Recognition

Contributors will be:
- Listed in release notes
- Credited in CHANGELOG.md
- Added to contributors list (coming soon)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to secrets-sync-cli! 🎉
