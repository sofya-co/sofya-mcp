# Sofya plugin for Claude

![Sofya](logo.png)

[Sofya](https://sofya.co) gives Claude live access to the web. Sofya runs its own search index, so results come from Sofya itself. This plugin connects Claude to Sofya's hosted MCP server at `https://sofya.co/mcp`. It works in Claude Code, Cowork and claude.ai chat.

## What you get

| Tool | What it does | Cost |
|------|--------------|------|
| `search` | Search the web and get ranked results with page content, not just snippets. Filters for sites, news and freshness, and an optional short answer. | 1-2 credits (+2 for an answer) |
| `fetch` | Read up to 10 URLs as clean markdown, including PDF, Word, Excel, PowerPoint and EPUB files. | 1 credit per URL |
| `extract` | Ask a question about one page and get only the answer. | 10 credits |
| `research` | Break a question into several searches, read the sources and write a report with citations. | 50 credits |
| `get_balance` | Show the account's remaining credits. | free |
| `buy_credits` | Return a payment link for a credit top-up. It never charges anything; you pay on Sofya's checkout page in your browser. | free |

## Set up

1. Install the plugin. In Claude Code:

   ```
   /plugin install sofya --marketplace sofya-co/sofya-mcp
   ```

   On claude.ai and in Cowork, add it from the plugin directory.
2. Connect the Sofya connector. In Claude Code, run `/mcp`, pick `sofya` and sign in. On claude.ai and in Cowork, open the plugin's Connectors tab and select Connect.
3. Sign in on sofya.co with GitHub or an email link and allow access. A Sofya account is created for you during sign-in if you don't have one.

Then ask Claude things like "search the web for the latest Python release", "read this PDF and summarise it" or "research how heat pumps work in cold climates".

## Pricing

Pay as you go, from $10. GitHub accounts a year or older get free monthly credits. Credit costs are listed above and at [sofya.co/pricing](https://sofya.co/pricing).

## What data the plugin sends

The plugin contains no code. It only declares the remote MCP server `https://sofya.co/mcp`. When Claude calls a tool, the tool's arguments (search queries, URLs, extraction prompts, research questions) go to Sofya over HTTPS, together with the OAuth token from your sign-in. Sofya processes them to answer the request and doesn't keep queries or results afterwards, except in server logs kept up to 30 days. Sofya doesn't train AI models on your queries or results. Details: [privacy policy](https://sofya.co/privacy).

## Support

- Docs: [sofya.co/docs](https://sofya.co/docs)
- Email: support@sofya.co
- Terms: [sofya.co/terms](https://sofya.co/terms)

## License

MIT
