# sofya-mcp

[![npm version](https://img.shields.io/npm/v/sofya-mcp.svg)](https://www.npmjs.com/package/sofya-mcp)

MCP server for [Sofya](https://sofya.co) - web **search**, **fetch**, **extract**, and deep **research** for AI agents, exposed over the [Model Context Protocol](https://modelcontextprotocol.io).

Use it either way:

- **Hosted (no install):** connect your client to `https://sofya.co/mcp` with your API key as a Bearer token. This is the server listed in the MCP registry as `co.sofya/sofya`.
- **Local:** run this `sofya-mcp` package over stdio. It is a thin wrapper around the Sofya REST API with the same tools.

All four tools are read-only. New accounts signed up with GitHub get 2,000 free credits a month.

## Tools

| Tool | What it does | Cost |
|------|--------------|------|
| `search` | Search the web and get extracted page content (not just snippets). Supports `news` topic, domain filters, freshness, and optional AI-synthesized `answer`. | 1-2 credits (+10 for `include_answer`) |
| `fetch` | Fetch up to 10 URLs as clean markdown. Also handles PDF, DOCX, XLSX, PPTX, EPUB, and more. | 2 credits / URL |
| `extract` | Fetch a page and pull specific structured info using AI. | 10 credits |
| `research` | Decompose a question into sub-queries, read many sources in parallel, and synthesize a cited report. | 50 credits |

## Hosted server (VS Code / Copilot and others)

Get an API key at [sofya.co](https://sofya.co) (keys look like `ay_live_...`), then point your client at the hosted endpoint.

VS Code / GitHub Copilot (`.vscode/mcp.json`):

```json
{
  "servers": {
    "sofya": {
      "type": "http",
      "url": "https://sofya.co/mcp",
      "headers": { "Authorization": "Bearer ay_live_..." }
    }
  }
}
```

Claude Code:

```bash
claude mcp add --transport http sofya https://sofya.co/mcp --header "Authorization: Bearer ay_live_..."
```

Cursor (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "sofya": {
      "url": "https://sofya.co/mcp",
      "headers": { "Authorization": "Bearer ay_live_..." }
    }
  }
}
```

Then ask your agent things like "search for the latest Node.js LTS release notes", "fetch this PDF and summarize it", or "research how the EU AI Act treats open-weight models". Full API docs: [sofya.co/docs](https://sofya.co/docs).

## Local server (npm)

### Prerequisites

- Node.js 18+
- A Sofya API key - get one at [sofya.co](https://sofya.co) (keys look like `ay_live_...`)

### Quick start

Run it directly with `npx` - no install needed:

```bash
SOFYA_API_KEY=ay_live_... npx -y sofya-mcp
```

### Configuration

#### Claude Code

```bash
claude mcp add sofya --env SOFYA_API_KEY=ay_live_... -- npx -y sofya-mcp
```

#### Claude Desktop / Cursor / Windsurf / VS Code

Add this to your MCP config (e.g. `claude_desktop_config.json`, or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "sofya": {
      "command": "npx",
      "args": ["-y", "sofya-mcp"],
      "env": {
        "SOFYA_API_KEY": "ay_live_..."
      }
    }
  }
}
```

#### Codex

Add it with the Codex CLI:

```bash
codex mcp add sofya --env SOFYA_API_KEY=ay_live_... -- npx -y sofya-mcp
```

Or edit `~/.codex/config.toml` directly. Note Codex puts environment variables in
a nested `[mcp_servers.<name>.env]` table:

```toml
[mcp_servers.sofya]
command = "npx"
args = ["-y", "sofya-mcp"]

[mcp_servers.sofya.env]
SOFYA_API_KEY = "ay_live_..."
```

Then run `/mcp` inside Codex to confirm the server is connected.

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SOFYA_API_KEY` | yes | - | Your Sofya API key (`ay_live_...`). |
| `SOFYA_BASE_URL` | no | `https://sofya.co` | Override the Sofya API base URL. |

CLI flags `--api-key` and `--base-url` take precedence over the env vars.
Run `npx sofya-mcp --list-tools` to print the tool schemas, or `--help` for options.

## Development

```bash
git clone https://github.com/sofya-co/sofya-mcp.git
cd sofya-mcp
npm install          # also builds via the prepare script
npm run build        # compile TypeScript to build/
npm run watch        # recompile on change
npm run inspector    # debug with @modelcontextprotocol/inspector
```

The server is a single file, [`src/index.ts`](src/index.ts). Tool definitions
mirror Sofya's hosted MCP server exactly (same names, parameters, and defaults).

## License

MIT - see [LICENSE](LICENSE).
