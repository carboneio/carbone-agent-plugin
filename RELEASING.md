# Releasing the Carbone agent plugin

## Before publishing a new version

### Content quality
- [ ] Are the "Read this file when…" trigger lines on every reference file accurate and up to date?
- [ ] Is the skill optimised for AI agents? Concretely: no invented syntax (every formatter shown appears in `skills/carbone/references/formatters.md`); anti-hallucination guard present in `skills/carbone/SKILL.md`; no `{{` Mustache braces; no smart (curly) quotes; all examples conform to `SKILL.md` §10 Validation Checklist; trigger phrasing unambiguous
- [ ] Does the skill follow the [Agent Skills specification](https://agentskills.io/specification)? Front matter has only the six spec keys (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`); `description` of 1,024 characters max; `SKILL.md` under 500 lines (all checked by `scripts/validate.mjs`)
- [ ] Is the skill provider-neutral? It mentions neither Claude nor Anthropic ("the model", never "Claude"), as OpenAI requires

### Cross-file consistency
- [ ] Same claim, same value across files: version requirements (v3/v4/v5), format-support lists (DOCX/XLSX/ODT/…), formatter element/scope tables (`:drop`/`:keep`, `:color`, `:html` compat), deprecation labels, pre-release flags (`{o.preReleaseFeatureIn=...}`) agree across `SKILL.md` and every reference file
- [ ] All internal cross-references resolve: every `see references/X.md §Y` / `[label](path)` points to a file and section that actually exists

### Cross-check against official Carbone docs
- [ ] Spot-check formatter signatures, argument order, unit lists, and version requirements against carbone.io documentation for anything new or modified in this release. Drift between the skill and official docs is the most common source of incorrect AI suggestions
- [ ] For deeper verification (or pre-release audits), use `https://carbone.io/llms-full.txt` as the canonical single-file source and diff key sections against the skill to catch drift before customers do

### Versioning
- [ ] Pre-release check: confirm no alpha/beta/RC tags already exist for the version you're about to bump to (`gh release list -R carboneio/carbone-agent-plugin` or the GitHub releases page)
- [ ] `CHANGELOG.md` updated with all changes under the correct version (semver bump: patch = doc fixes only, minor = new patterns or rules, major = breaking changes to existing tags/syntax or to the install)
- [ ] One version for everything, set by `node scripts/bump-version.mjs <version>` in:
  - `plugin.json`: `version`
  - `.claude-plugin/plugin.json`: `version`
  - `.cursor-plugin/plugin.json`: `version`
  - `.antigravity-plugin/plugin.json`: `version`
  - `gemini-extension.json`: `version`
  - `skills/carbone/SKILL.md`: `metadata.version`

  Neither marketplace file (`.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`) carries a version; `scripts/validate.mjs` enforces both.

## Release steps

1. Run `npm --prefix scripts ci` once to install the tooling dependencies (the tooling package lives in `scripts/`; the repository root must not have a `package.json`).
2. Run `node scripts/bump-version.mjs <version>`.
3. Update `CHANGELOG.md` and `extensions.com.openai.publication.release_notes` in `plugin.json`.
4. Run `npm --prefix scripts run validate` (or `node scripts/validate.mjs`) and fix every error. Check 10 (`claude plugin validate --strict`) is skipped locally unless the Claude Code CLI is installed; CI runs it with `--require-claude`. `--offline` skips the URL check.
5. Commit, tag `v<version>` and push the tag.
6. The release action validates again, checks the tag equals the shared version, then builds and attaches `carbone.skill` and `carbone-chatgpt-plugin.zip` to the GitHub release. Check both files are there.
7. Upload `carbone-chatgpt-plugin.zip` to the Carbone plugin in OpenAI's dashboard and submit it for review. MCP tool changes need no new ZIP; listing, skill or translation changes do.
