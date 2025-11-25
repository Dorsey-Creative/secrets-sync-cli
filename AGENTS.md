# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/` with the CLI entry at `src/secrets-sync.ts` (ESM TypeScript targeting Node 18+).
- Tests reside in `tests/` and mirror the CLI behavior (see `tests/secrets-sync.test.ts`).
- Built artifacts are emitted to `dist/` by Bun; do not edit generated files directly.
- Supporting docs are in `README.md` and `CHANGELOG.md`; keep them aligned with code changes.

## Build, Test, and Development Commands
- `bun install` — install dependencies (Bun runtime required).
- `bun run dev -- --help` — run the CLI in dev mode; forward flags after `--`.
- `bun run build` — bundle `src` into `dist/` for distribution.
- `bun test` / `bun test --watch` — run the test suite once or in watch mode.
- `bun run lint` — placeholder; no linter configured yet. Prefer formatting before PRs.

## Coding Style & Naming Conventions
- TypeScript with ES modules; prefer explicit exports and narrow types for CLI options.
- Use 2-space indentation, single quotes in JS/TS, and keep functions small and pure where feasible.
- Name files and variables descriptively (e.g., `loadEnvFiles`, `syncSecrets`); tests should mirror subject under test.
- Avoid committing changes in `dist/` unless preparing a release.

## Testing Guidelines
- Framework: Bun’s built-in test runner.
- Place tests in `tests/` with `.test.ts` suffix; co-locate helpers near test files when small.
- Aim to cover CLI argument parsing, file discovery, and drift detection behaviors.
- Run `bun test` before opening PRs; add fixtures in `tests/` instead of touching real env files.

## Commit & Pull Request Guidelines
- Commit style follows Conventional Commits as seen in history (`feat:`, `chore:`, `docs:`). Keep messages imperative and scoped.
- PRs should include: summary of changes, key commands run (tests/build), and any configuration notes (e.g., env file paths used).
- Link related issues when applicable; add screenshots or logs only if they clarify behavior changes.

## Security & Configuration Tips
- Never commit real secrets. Use sample `.env` fixtures under `tests/` or temporary paths.
- Default env directory is `config/env`; document any deviations in PR descriptions.
- Use `--dry-run` when testing sync behavior to avoid unintended writes during development.
