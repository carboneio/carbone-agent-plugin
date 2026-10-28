# Carbone agent plugin

[Add to Claude](https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Carbone&connectorUrl=https%3A%2F%2Fmcp.carbone.io) [Add to Cursor](https://cursor.com/en/install-mcp?name=carbone&config=eyJ1cmwiOiJodHRwczovL21jcC5jYXJib25lLmlvIn0=) [Install in VS Code](https://vscode.dev/redirect/mcp/install?name=carbone&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.carbone.io%22%7D)

The Carbone agent plugin: the Carbone skill and MCP server for any AI agent that supports skills or remote MCP servers, including Claude, ChatGPT, Codex, Cursor, GitHub Copilot, Gemini CLI, Antigravity, Devin and Kiro. Install it once in your AI assistant to design document templates and generate PDF, Word, Excel and PowerPoint documents from your data in the same conversation.

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
| Claude (claude.ai, Desktop, Cowork) | **Customize**, **Plugins**, **Add marketplace** `carboneio/carbone-agent-plugin` |
| Claude Code | `/plugin marketplace add carboneio/carbone-agent-plugin`, then `/plugin install carbone@carbone` |
| ChatGPT | Custom MCP server `https://mcp.carbone.io`, and upload `carbone.skill` |
| Codex | `codex plugin marketplace add carboneio/carbone-agent-plugin`, then `codex plugin add carbone@carbone` |
| Cursor | Team marketplace from this repository, or clone it to `~/.cursor/plugins/local/carbone` |
| VS Code, GitHub Copilot | `copilot plugin install carboneio/carbone-agent-plugin`, or **Chat: Install Plugin From Source** |
| Gemini CLI | `gemini extensions install https://github.com/carboneio/carbone-agent-plugin` |
| Antigravity | `agy plugin install https://github.com/carboneio/carbone-agent-plugin` |
| Devin | `devin plugins install carboneio/carbone-agent-plugin` |
| Kiro | **Powers**, **Add Custom Power**, **Import power from GitHub** with this repository URL |
| Mistral Vibe, others | Add the MCP server `https://mcp.carbone.io` as a custom connector |
| Skill only | `npx skills add carboneio/carbone-agent-plugin`, or upload `carbone.skill` |

The skill file is attached to every release: **[carbone.skill](https://github.com/carboneio/carbone-agent-plugin/releases/latest/download/carbone.skill)**.

### Let your assistant set it up

In an assistant that can run commands or edit its own settings, paste this prompt:

```text
Add the Carbone MCP server to this assistant.
Server URL: https://mcp.carbone.io (remote MCP server, Streamable HTTP)
Setup instructions: https://carbone.io/documentation/developer/ai/mcp.md
Then start the sign-in so I can connect my Carbone account.
```

### Claude (claude.ai, Desktop, Cowork)

First turn on **Code execution and file creation** in **Settings**, **Capabilities**, so the skill can run. On Team and Enterprise plans, an Owner turns it on in **Organization settings**, **Capabilities**.

Go to **Customize**, **Plugins**, click **Add**, then **Add marketplace**, enter `carboneio/carbone-agent-plugin` and install **Carbone**. Then open the plugin's **Connectors** tab, add the Carbone connector and click **Connect**. On Team and Enterprise plans, an Owner adds the connector for the organization.

<details>
<summary>Manual setup</summary>

- **Server**: go to **Customize**, **Connectors**, click **Add custom connector**, and enter the URL `https://mcp.carbone.io`. Or use the link [Add to Claude](https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Carbone&connectorUrl=https%3A%2F%2Fmcp.carbone.io). On Team and Enterprise plans, an Owner adds it first in **Organization settings**, **Connectors**; then each member clicks **Connect** and signs in.
- **Skill**: go to **Customize**, **Skills** (claude.ai/customize/skills), click **+**, then **Create skill**, **Upload a skill**, and upload `carbone.skill`.

</details>

### Claude Code

```
/plugin marketplace add carboneio/carbone-agent-plugin
/plugin install carbone@carbone
```

Then run `/mcp`, choose **Authenticate** for Carbone, and sign in.

<details>
<summary>Manual setup</summary>

Server only:

```bash
claude mcp add --transport http --scope user carbone https://mcp.carbone.io
```

Then run `/mcp`, select `carbone` and choose **Authenticate**. `--scope user` makes Carbone available in all your projects. To share it with one project instead, add this to a `.mcp.json` file at its root:

```json
{ "mcpServers": { "carbone": { "type": "http", "url": "https://mcp.carbone.io" } } }
```

Skill only: extract `carbone.skill` into your skills folder.

```bash
mkdir -p ~/.claude/skills
unzip carbone.skill -d ~/.claude/skills/
```

</details>

### ChatGPT

- **Server**: open **Plugins** in the left sidebar, click **Add**, then **Add custom MCP server**. Enter the name `Carbone` and the URL `https://mcp.carbone.io`, choose **OAuth**, then sign in with your Carbone account.
- **Skill**: open **Skills** ([chatgpt.com/skills](https://chatgpt.com/skills)), click **Create**, **Upload from your computer**, and upload `carbone.skill`.

### Codex

```bash
codex plugin marketplace add carboneio/carbone-agent-plugin
codex plugin add carbone@carbone
```

Codex asks you to sign in during the install.

<details>
<summary>Manual setup</summary>

Server only:

```bash
codex mcp add carbone --url https://mcp.carbone.io
codex mcp login carbone
```

The second command opens your browser to sign in.

Skill only: extract `carbone.skill` into your skills folder.

```bash
mkdir -p ~/.agents/skills
unzip carbone.skill -d ~/.agents/skills/
```

</details>

### Cursor

For a team (Teams and Enterprise plans), an admin opens the Cursor Dashboard, **Plugins & MCPs**, **Team Marketplaces**, clicks **Add Marketplace**, chooses **Import from Repo** and enters `https://github.com/carboneio/carbone-agent-plugin`.

For yourself:

```bash
git clone https://github.com/carboneio/carbone-agent-plugin ~/.cursor/plugins/local/carbone
```

Then run **Developer: Reload Window**, and sign in from Cursor's MCP settings.

Server only: use the link [Add to Cursor](https://cursor.com/en/install-mcp?name=carbone&config=eyJ1cmwiOiJodHRwczovL21jcC5jYXJib25lLmlvIn0=), then sign in from Cursor's MCP settings.

### VS Code, GitHub Copilot

Copilot CLI:

```bash
copilot plugin install carboneio/carbone-agent-plugin
```

VS Code: enable the `chat.plugins.enabled` setting, then run **Chat: Install Plugin From Source** with the repository URL `https://github.com/carboneio/carbone-agent-plugin`.

<details>
<summary>Manual setup</summary>

Server only: use the link [Install in VS Code](https://vscode.dev/redirect/mcp/install?name=carbone&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.carbone.io%22%7D), or run:

```bash
code --add-mcp '{"name":"carbone","type":"http","url":"https://mcp.carbone.io"}'
```

VS Code asks you to sign in when it starts the server.

Skill only: extract `carbone.skill` into your skills folder.

```bash
mkdir -p ~/.copilot/skills
unzip carbone.skill -d ~/.copilot/skills/
```

</details>

### Antigravity

```bash
agy plugin install https://github.com/carboneio/carbone-agent-plugin
```

Then open **Agent settings**, **Customizations**, choose **Authenticate** for Carbone and follow the sign-in steps.

### Gemini CLI

```bash
gemini extensions install https://github.com/carboneio/carbone-agent-plugin
```

Restart Gemini CLI. Your browser opens to sign in the first time Carbone is used. To sign in again, run `/mcp auth carbone`.

Unpaid tier and Google One users: Gemini CLI was replaced by Antigravity CLI on June 18, 2026 (see [Antigravity](#antigravity)).

<details>
<summary>Manual setup</summary>

Server only:

```bash
gemini mcp add --transport http --scope user carbone https://mcp.carbone.io
```

Then run `/mcp auth carbone` in Gemini CLI to sign in.

Skill only:

```bash
gemini skills install https://github.com/carboneio/carbone-agent-plugin.git --path skills/carbone
```

</details>

### Devin

```bash
devin plugins install carboneio/carbone-agent-plugin
```

Then sign in from **Customize**, **MCPs**, or run `devin mcp login carbone`.

<details>
<summary>Manual setup</summary>

Server only:

```bash
devin mcp add -s user carbone https://mcp.carbone.io
devin mcp login carbone
```

Skill only:

```bash
mkdir -p ~/.config/devin/skills
unzip carbone.skill -d ~/.config/devin/skills/
```

</details>

### Kiro

Open the **Powers** panel, click **Add Custom Power**, choose **Import power from GitHub**, enter `https://github.com/carboneio/carbone-agent-plugin`, then click **Install**. Kiro opens your browser to sign in when it first connects to Carbone.

<details>
<summary>Manual setup</summary>

Server only: add this to `~/.kiro/settings/mcp.json`, then save.

```json
{ "mcpServers": { "carbone": { "url": "https://mcp.carbone.io" } } }
```

Skill only:

```bash
mkdir -p ~/.kiro/skills
unzip carbone.skill -d ~/.kiro/skills/
```

</details>

### Mistral Vibe and other assistants

Add the MCP server `https://mcp.carbone.io` as a custom connector. In Vibe, an admin opens **Connectors**, clicks **+ Add Connector**, chooses **Custom MCP Connector** and enters the URL. Any assistant that supports remote MCP servers with OAuth can connect the same way.

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
