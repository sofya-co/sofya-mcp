# Installing Sofya

Sofya is a hosted remote MCP server. There is nothing to clone, build or run.

## Recommended: hosted server with OAuth

1. Add the server:

   ```bash
   cline mcp install sofya --transport http https://mcp.sofya.co/mcp
   ```

   Or add this to `cline_mcp_settings.json`:

   ```json
   {
     "mcpServers": {
       "sofya": {
         "type": "streamableHttp",
         "url": "https://mcp.sofya.co/mcp"
       }
     }
   }
   ```

2. When the client opens the sign-in page, the user signs in to Sofya and approves access. New accounts get free monthly credits.

## Alternative: API key

If the client cannot do OAuth, ask the user for a Sofya API key (from https://sofya.co, it starts with `sofya_live_`) and send it as a Bearer token:

```json
{
  "mcpServers": {
    "sofya": {
      "type": "streamableHttp",
      "url": "https://mcp.sofya.co/mcp",
      "headers": { "Authorization": "Bearer sofya_live_..." }
    }
  }
}
```

## Check it works

Call the `get_balance` tool. It should return the account's remaining credits. Then try `search` with a query such as "latest Node.js LTS release".

Tools: `search`, `fetch`, `extract`, `research`, `get_balance`, `buy_credits` (`buy_credits` only returns a payment link). Docs: https://sofya.co/docs
