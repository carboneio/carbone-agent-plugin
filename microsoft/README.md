# Carbone for Microsoft 365 Copilot

Microsoft 365 Agents Toolkit project for the Carbone declarative agent, submitted to Partner Center. The agent connects to the hosted MCP server `https://mcp.carbone.io`; Copilot discovers its tools at runtime, and users sign in with their Carbone account.

| Path | Purpose |
|---|---|
| `m365agents.yml` | Provision and publish steps |
| `appPackage/manifest.json` | App manifest, with the permanent app id |
| `appPackage/declarativeAgent.json` | Declarative agent; its instructions are in `instruction.txt` |
| `appPackage/ai-plugin.json` | Plugin manifest pointing to the MCP server |
| `env/.env.dev` | Written by provision. Not committed: kept in the team password manager |

`instruction.txt` summarizes the template rules of `skills/carbone/`: every formatter it names must appear in `skills/carbone/references/formatters.md`. The version in `manifest.json` is the shared plugin version, set by `scripts/bump-version.mjs`.

## Prerequisites

- The toolkit CLI `@microsoft/m365agentstoolkit-cli` 1.1.19 or later (`npx -y @microsoft/m365agentstoolkit-cli@beta` until it is stable).
- A Microsoft 365 tenant with custom app upload enabled.
- Access to carbone-account.

## Provision (once)

1. In this folder: `atk auth login m365`, then `atk provision --env dev`.
2. Right after, mark the new client "Microsoft 365 Copilot" as verified in carbone-account (see the internal runbook).
3. Save the whole content of `env/.env.dev` in the team password manager.

The registration created by provision can't be edited or recovered. Never clear `CARBONE_DCR_REFERENCE_ID` in `env/.env.dev`: a new registration means a new package and a new store review. To work on another machine, restore `env/.env.dev` from the password manager.

## Build the package

```sh
set -a; . env/.env.dev; set +a
atk package --env dev
```

The first line loads `env/.env.dev` into the shell: `atk package` doesn't read it on its own.

Upload `appPackage/build/appPackage.dev.zip` to Partner Center (Microsoft 365 and Copilot offer). Never zip `appPackage/` by hand: the toolkit fills in the placeholders.

## References

- Build a plugin from an MCP server: https://learn.microsoft.com/microsoft-365-copilot/extensibility/build-mcp-plugins
- Store validation guidelines: https://learn.microsoft.com/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/review-copilot-validation-guidelines
