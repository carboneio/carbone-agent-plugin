# Contributing

## What belongs in this repository

This repository contains the official Carbone agent plugin: the Carbone skill, a set of Markdown files that teach AI assistants the Carbone templating syntax, and the manifests that connect each assistant to the hosted Carbone MCP server (`https://mcp.carbone.io`). Contributions should improve the accuracy, completeness, or clarity of the skill, or fix a manifest.

Good contributions:
- Correcting a documented syntax that is wrong or outdated
- Adding a missing formatter, option, or behaviour that is already shipped in Carbone
- Improving an example to make it clearer or more representative
- Fixing a typo or broken formatting
- Fixing a manifest that an assistant fails to read

Out of scope:
- Feature requests for Carbone itself: open those at [carbone.io](https://carbone.io)
- Adding undocumented or unreleased behaviour
- Changes to the MCP server: it is hosted by Carbone and its code is not in this repository

## How to contribute

1. Fork the repository and create a branch from `main`
2. Make your changes in the relevant file:
   - `skills/carbone/SKILL.md`: core syntax (tags, loops, conditions, `:set`, i18n, options)
   - `skills/carbone/references/formatters.md`: formatter reference
   - `skills/carbone/references/html-templates.md`: HTML template reference
   - `skills/carbone/references/markdown-templates.md`: Markdown template reference
   - the manifests at the root and in `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/` and `.antigravity-plugin/`: how each assistant installs the plugin
3. Run `npm --prefix scripts ci` once, then `npm --prefix scripts run validate`, and fix any error it reports
4. Open a pull request with a short description of what changed and why

Releases are made by the maintainers; the checklist is in [RELEASING.md](RELEASING.md).

## Reporting issues

Use the issue templates:
- **Documentation error**: for syntax that is documented incorrectly or is outdated
- **Missing coverage**: for a formatter or feature that exists in Carbone but is not documented in the skill

Before opening an issue, check the [Carbone changelog](https://carbone.io/changelog.html) to confirm the feature is in a released version.

## License

By contributing, you agree that your contributions will be licensed under the [Apache-2.0 license](LICENSE).
