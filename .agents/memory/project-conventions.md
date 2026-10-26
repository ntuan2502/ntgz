---
type: project
created: 2026-05-25
updated: 2026-10-25
---

# Project Conventions

## Git Workflow
- Commit and push directly to the `main` branch. Dedicated feature or bugfix branches are not required.

## Release Protocol (MANDATORY)
- **Always update documentation before/during every release**:
  - `CHANGELOG.md`: Record all new features, bug fixes, breaking changes, and refactoring with explicit version header (`## [X.Y.Z] - YYYY-MM-DD`) following Keep a Changelog & SemVer.
  - `README.md`: Update version badges/strings and highlight major changes or stability improvements.
  - `package.json` & `src/manifest.json`: Bump version string synchronously.
- **Never commit temporary audit or debug files**:
  - Files like `AUDIT_REPORT_*.md`, `FARMSTAY_DEBUG_REPORT.md`, or one-off scanner scripts MUST NOT be committed to git. Delete them prior to release.
- **GitHub Release & Assets**:
  - Always tag and create GitHub Release with release notes mirroring the changelog and zip archive of `dist/` and docs.

## Supported AI Platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other AI assistants unless explicitly requested by the user.
- All documentation, website copy, FAQs, README files, and promotional materials must describe AG Kit exclusively as a toolkit designed for Gemini CLI and Google Antigravity agent environments.
