# Carbone agent plugin

The Carbone agent plugin: the Carbone skill and MCP server for any AI agent that supports skills or remote MCP servers, including Claude, ChatGPT, Codex, Cursor, GitHub Copilot, Gemini CLI and Antigravity. Install it once in your AI assistant to design document templates and generate PDF, Word, Excel and PowerPoint documents from your data in the same conversation.

## What it does

- **The Carbone MCP server** (`https://mcp.carbone.io`) generates documents from your templates and data, converts files between formats, and manages your Carbone template library. It is hosted by Carbone, so there is nothing to run locally. Documentation: [carbone.io/documentation/developer/ai/mcp.html](https://carbone.io/documentation/developer/ai/mcp.html).
- **The Carbone skill** (`skills/carbone/`) teaches the assistant the Carbone templating syntax, so it can write, check and fix templates, or add Carbone tags to the DOCX, XLSX and PPTX files it generates. It follows the open [Agent Skills](https://agentskills.io) standard and works without the server.

### What the skill covers

- Tag syntax: `{d.}`, `{c.}`, aliases, i18n, in-template options
- Formatters: date, number, string, currency, and chaining
- Conditions: `showBegin/showEnd`, `hideBegin/hideEnd`, ternary expressions
- Loops: arrays, nested loops, aggregation, drop-row patterns
- `:set` patterns for computed and conditional values
- HTML templates: CSS injection, charts, headers/footers, PDF options
- Markdown templates: loops in tables, converting to DOCX/PDF
- Embedding Carbone tags into AI-generated DOCX, XLSX, and PPTX files
- Best practices and a validation checklist
- Template formats: `XML` `HTML` `ODT` `ODS` `ODP` `DOCX` `XLSX` `PPTX` `ODG` `SVG` `MD` `IDML`, and `PDF` form templates
- Export formats: `PDF` `DOCX` `XLSX` `PPTX` `ODT` `ODS` `ODP` `HTML` `CSV` `TXT` `JPG` `PNG` `GIF` `SVG` `WEBP` `EPUB` `MD` `RTF` (160+ conversions)

## Install

| Assistant | Install |
|---|---|
| ChatGPT | Plugins directory: search for Carbone |
| Claude (claude.ai, Desktop, Cowork) | Directory: Carbone (connector and plugin) |
| Claude Code | `/plugin marketplace add carboneio/carbone-agent-plugin`, then `/plugin install carbone@carbone` |
| Codex | `codex plugin marketplace add carboneio/carbone-agent-plugin` |
| Cursor | Marketplace: Carbone |
| VS Code, GitHub Copilot | `copilot plugin install carboneio/carbone-agent-plugin`, or **Chat: Install Plugin From Source** |
| Gemini CLI | `gemini extensions install https://github.com/carboneio/carbone-agent-plugin` |
| Antigravity | `agy plugin install https://github.com/carboneio/carbone-agent-plugin` |
| Mistral Le Chat, others | Add the MCP server `https://mcp.carbone.io` as a custom connector |
| Skill only | `npx skills add carboneio/carbone-agent-plugin`, or upload `carbone.skill` |

The skill file is attached to every release: **[carbone.skill](https://github.com/carboneio/carbone-agent-plugin/releases/latest/download/carbone.skill)**.

### ChatGPT

Open the Plugins directory, search for **Carbone** and add it. The same listing covers Codex.

### Claude (claude.ai, Desktop, Cowork)

Open the Directory, search for **Carbone** and add it. The connector and the plugin use the same server, so you see one set of tools. In claude.ai, the plugin's MCP server appears in its Connectors tab, where you connect it.

<details>
<summary>Manual setup</summary>

- **Server only**: add a custom connector with the URL `https://mcp.carbone.io`.
- **Skill only**: go to **Customize**, **Skills** (claude.ai/customize/skills), click **+**, then **Upload a skill**, and upload `carbone.skill`.

</details>

### Claude Code

```
/plugin marketplace add carboneio/carbone-agent-plugin
/plugin install carbone@carbone
```

Then run `/mcp`, choose **Authenticate** for Carbone, and sign in.

<details>
<summary>Manual setup</summary>

Server only: add this to a `.mcp.json` file at the root of your project.

```json
{ "mcpServers": { "carbone": { "type": "http", "url": "https://mcp.carbone.io" } } }
```

Skill only: extract `carbone.skill` into your skills folder.

```bash
unzip carbone.skill -d ~/.claude/skills/carbone
```

</details>

### Codex

Codex uses the ChatGPT plugin catalog, so Carbone is listed there. To install from this repository instead:

```bash
codex plugin marketplace add carboneio/carbone-agent-plugin
```

Then install Carbone from the Plugins Directory.

<details>
<summary>Manual setup</summary>

Skill only: extract `carbone.skill` into your skills folder.

```bash
unzip carbone.skill -d ~/.agents/skills/carbone
```

</details>

### Cursor

Open the Marketplace, search for **Carbone** and install it.

<details>
<summary>Manual setup</summary>

Copy this repository to `~/.cursor/plugins/local/carbone`, then restart Cursor. The skill and the Carbone server appear in Cursor.

</details>

### VS Code, GitHub Copilot

Copilot CLI:

```bash
copilot plugin install carboneio/carbone-agent-plugin
```

VS Code: enable the `chat.plugins.enabled` setting, then run **Chat: Install Plugin From Source** with the repository URL `https://github.com/carboneio/carbone-agent-plugin`.

<details>
<summary>Manual setup</summary>

Skill only: extract `carbone.skill` into your skills folder.

```bash
unzip carbone.skill -d ~/.copilot/skills/carbone
```

</details>

### Gemini CLI

```bash
gemini extensions install https://github.com/carboneio/carbone-agent-plugin
```

Restart Gemini CLI. Sign-in starts in your browser the first time Carbone is called; if it doesn't, run `/mcp auth carbone`. Sign-in needs a browser, so it doesn't work over SSH.

<details>
<summary>Manual setup</summary>

Skill only:

```bash
gemini skills install carbone.skill
```

</details>

### Antigravity

```bash
agy plugin install https://github.com/carboneio/carbone-agent-plugin
```

Then open **Agent settings**, **Customizations**, and choose **Authenticate** for Carbone. Sign-in asks you to copy and paste an authorization code.

### Mistral Le Chat and other assistants

Add the MCP server `https://mcp.carbone.io` as a custom connector. In Le Chat, an admin adds the URL. Any assistant that supports remote MCP servers with OAuth can connect the same way.

For the skill alone on other platforms, see [agentskills.io](https://agentskills.io/home).

## Sign in

You sign in with your Carbone account when the assistant first calls Carbone. No account yet? Create one at [carbone.io](https://carbone.io).

## What data it sends

- Templates and data go to the Carbone API only when a tool is called.
- Generated documents are returned to the assistant.
- The skill is a set of instructions read by the assistant. It sends nothing on its own.

Read the [privacy policy](https://carbone.io/company/privacy-policy.html).

## Files in and out

- Templates and data are passed as public links, as text, or from your template library.
- The hosted server can't read local files.

## Support

- Help center: [help.carbone.io](https://help.carbone.io)
- Email: [support@carbone.io](mailto:support@carbone.io)
- Carbone changelog: [carbone.io/changelog.html](https://carbone.io/changelog.html)
- Spotted an error or missing formatter in the skill? See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
