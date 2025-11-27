# Problem Statement: Issues from `development/bugs-to-fix.md`

This document summarizes current production bugs captured in `development/bugs-to-fix.md` and frames the problems to solve.

## Problems
- Duplicate log lines: log output includes repeated messages (with and without timestamps). Confirm expected log destinations, ensure timestamps persist only in the structured logger, and introduce a cap/retention strategy if needed.
- Redacted `skipSecrets`: CLI option `skipSecrets` currently shows as `'[REDACTED]'`, hiding which secrets are skipped. Decide whether to display actual values or names while balancing exposure risks.
- Redacted audit secret names: Audit summary lists secret names as `'[REDACTED]'`. Clarify whether key names should be visible or masked to avoid threat vectors.
- Local `example/` workspace: Need a non-committed, non-distributed `example/` directory for local testing to catch the above issues. Define how to enforce ignore rules and keep it out of published artifacts.

## Acceptance Considerations
- Logging: No duplicate entries under normal runs; timestamps/log levels consistently formatted; optional retention/limit policy decided and documented.
- Redaction: `skipSecrets` and audit table behaviors align with a documented redaction policy that balances usability and security, with tests covering chosen visibility.
- Examples: `example/` directory excluded via `.gitignore`/package ignore rules and usable for local manual runs without affecting builds.
