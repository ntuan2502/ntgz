---
type: project
created: 2026-05-25
updated: 2026-10-25
---

# Project Conventions

## Git Workflow
- Commit and push directly to the `main` branch. Dedicated feature or bugfix branches are not required.

## Release Protocol (MANDATORY)
Whenever the user asks to release, tag, or publish a new version, strictly follow this complete sequence without skipping any step:
1. **Synchronize Version Numbers**:
   - `package.json` -> bump `version`
   - `manifest.json` (at workspace root) -> bump `version`
2. **Update Documentation**:
   - `CHANGELOG.md`: Record all new features, bug fixes, optimizations, breaking changes, and refactoring with explicit version header (`## [X.Y.Z] - YYYY-MM-DD`) following Keep a Changelog & SemVer.
   - `README.md`: Update title version `(vX.Y.Z)`, feature summary highlights, and current version footer `vX.Y.Z`.
3. **Verify Code Quality & Build**:
   - Run `npm run build`
   - Run `npm run type-check`
   - Run `npm run check-syntax`
   - Run `npm run lint`
4. **Clean Temporary Files**:
   - Ensure NO temporary files (e.g. `AUDIT_REPORT_*.md`, `*DEBUG_REPORT.md`, scratch scripts) remain in git staging or the workspace.
5. **Git Commit & Push**:
   - Stage release files: `git add package.json manifest.json CHANGELOG.md README.md`
   - Commit using Conventional Commits with strictly lowercase subject (e.g. `chore(release): bump version to 1.6.0 and update docs`).
   - Push commit: `git push origin main`
   - *(Note: `dist/` is excluded from git tracking via `.gitignore`; it is built locally and packaged directly into the release zip for GitHub Releases).*
6. **Git Tagging & GitHub Release**:
   - Tag version: `git tag vX.Y.Z`
   - Push tag: `git push origin vX.Y.Z`
   - Create release package: `Compress-Archive -Path dist\* -DestinationPath nongtraigenz-auto-vX.Y.Z.zip -Force`
   - Create GitHub release: `gh release create vX.Y.Z nongtraigenz-auto-vX.Y.Z.zip --title "vX.Y.Z" --notes-file CHANGELOG.md` (or relevant section notes)
   - Clean up local zip file: `Remove-Item nongtraigenz-auto-vX.Y.Z.zip`

## Supported AI Platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other AI assistants unless explicitly requested by the user.
- All documentation, website copy, FAQs, README files, and promotional materials must describe AG Kit exclusively as a toolkit designed for Gemini CLI and Google Antigravity agent environments.
