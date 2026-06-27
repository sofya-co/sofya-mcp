#!/usr/bin/env node

/**
 * sofya-mcp
 *
 * A Model Context Protocol (MCP) server that exposes Sofya's web tools -
 * search, fetch, extract, and research - to MCP clients such as Claude
 * Desktop, Claude Code, Cursor, Codex, Windsurf, and VS Code Copilot.
 *
 * It is a thin stdio wrapper over the Sofya REST API (https://sofya.co).
 * Bring your own API key via the SOFYA_API_KEY environment variable.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance, isAxiosError } from "axios";
import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

dotenv.config();

const VERSION = "0.1.0";
const DEFAULT_BASE_URL = "https://sofya.co";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = yargs(hideBin(process.argv))
  .option("api-key", {
    type: "string",
    describe: "Sofya API key (overrides SOFYA_API_KEY env var)",
  })
  .option("base-url", {
    type: "string",
    describe: "Sofya API base URL (overrides SOFYA_BASE_URL env var)",
  })
  .option("list-tools", {
    type: "boolean",
    describe: "Print the available tools as JSON and exit",
  })
  .help()
  .parseSync();

const API_KEY = (argv["api-key"] as string | undefined) ?? process.env.SOFYA_API_KEY;
const BASE_URL = (
  (argv["base-url"] as string | undefined) ??
  process.env.SOFYA_BASE_URL ??
  DEFAULT_BASE_URL
).replace(/\/+$/, "");

// ---------------------------------------------------------------------------
// Tool definitions
//
// These mirror Sofya's hosted MCP server (sofya.co/mcp) exactly: same names,
// same parameters, same defaults. Each tool maps 1:1 to a POST /v1/<name>
// REST endpoint.
// ---------------------------------------------------------------------------

const TOOLS: Tool[] = [
  {
    name: "search",
    description:
      "Search the web for current information on any topic. Returns extracted " +
      "page content, not just snippets. Best for factual lookups, specific " +
      "questions, or when you need a list of sources. For open-ended questions " +
      "that need synthesis across many sources, use the research tool instead.\n\n" +
      "For news queries (current events, breaking news, politics, world events), " +
      'set topic="news" to search news sources specifically. This returns ' +
      "recent articles with publication dates.\n\n" +
      "Set include_answer=true to get an AI-synthesized answer alongside results " +
      "(adds 5 credits). This is the sweet spot for most agent tasks, e.g. " +
      "basic + include_answer = 8 credits, much cheaper than a full 25-credit " +
      "research call.\n\n" +
      "Returns: query, answer (if requested), results (array of {title, url, " +
      "content, description, fetched, published_date}), search_depth, topic, " +
      "elapsed_ms, credits_used, credits_remaining, altered_query.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "The search query" },
        search_depth: {
          type: "string",
          default: "basic",
          description:
            '"basic" (default) for extracted page content (3 credits), ' +
            '"snippets" for SERP snippets only without page fetching (1 credit)',
        },
        max_results: {
          type: "integer",
          default: 10,
          description: "Number of results (default 10, max 20)",
        },
        include_answer: {
          type: "boolean",
          default: false,
          description:
            "Generate an AI answer that synthesizes the search results (adds 5 credits)",
        },
        include_domains: {
          type: "array",
          items: { type: "string" },
          description: "Only include results from these domains (max 10)",
        },
        exclude_domains: {
          type: "array",
          items: { type: "string" },
          description: "Exclude results from these domains (max 10)",
        },
        topic: {
          type: "string",
          default: "general",
          description:
            '"general" for web search, "news" for news articles. Use "news" for ' +
            "current events, breaking news, politics, or any time-sensitive query",
        },
        freshness: {
          type: "string",
          description:
            'Filter by recency: "day", "week", "month", "year", or "YYYY-MM-DD:YYYY-MM-DD"',
        },
      },
    },
  },
  {
    name: "fetch",
    description:
      "Fetch one or more URLs and return their content as clean markdown. " +
      "Use this to read articles, documentation, blog posts, or any page " +
      "where you need the complete text, not just a snippet from search. " +
      "Also supports PDF, DOCX, and other document formats. " +
      "Costs 1 credit per URL. Max 10 URLs per request. " +
      "Failed URLs are not charged.\n\n" +
      "Set include_raw_html=true to also get the raw HTML source in each result. " +
      "Useful for inspecting embedded URLs, data attributes, iframes, or script tags " +
      "that are stripped during markdown conversion. " +
      "Returns null for non-HTML content (PDF, DOCX, etc.). Same cost.\n\n" +
      "Returns: results (array of {title, url, content, raw_html, " +
      "published_time, success, error}), credits_used, credits_remaining.",
    inputSchema: {
      type: "object",
      required: ["urls"],
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          maxItems: 10,
          description: "List of URLs to fetch (max 10)",
        },
        include_raw_html: {
          type: "boolean",
          default: false,
          description: "Include raw HTML source in each result (default false)",
        },
      },
    },
  },
  {
    name: "extract",
    description:
      "Fetch a webpage and extract specific information using AI. Use this " +
      "when you need structured data from a page (e.g. pricing, specs, " +
      "contact info) rather than the raw content. Costs 5 credits.\n\n" +
      "Returns: content (the extracted text), url, credits_used, " +
      "credits_remaining, usage (token counts).",
    inputSchema: {
      type: "object",
      required: ["url", "prompt"],
      properties: {
        url: { type: "string", description: "The URL to extract from" },
        prompt: {
          type: "string",
          description:
            'What information to extract (e.g. "list all pricing tiers with ' +
            'features" or "extract the author name and publication date")',
        },
      },
    },
  },
  {
    name: "research",
    description:
      "Perform comprehensive research on a topic. Decomposes your query " +
      "into sub-queries, searches and reads multiple sources in parallel, " +
      "then synthesizes a structured report with citations. Best for " +
      "open-ended or comparative questions that need coverage from many " +
      "angles. For simple factual lookups, use search instead (optionally " +
      "with include_answer=true for cheap synthesis). Costs 25 credits.\n\n" +
      "Returns: query, report (structured markdown with citations), " +
      "sources (array of {title, url, fetched}), sub_queries (the decomposed " +
      "queries), credits_used, credits_remaining, usage (token counts).",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "The research question or topic" },
        topic: {
          type: "string",
          default: "general",
          description: '"general" (default) or "news" (prioritize recent news articles)',
        },
        freshness: {
          type: "string",
          description:
            'Filter by recency: "day", "week", "month", "year", or "YYYY-MM-DD:YYYY-MM-DD"',
        },
        max_sources: {
          type: "integer",
          default: 20,
          description: "Maximum number of sources to use, 5-30 (default 20)",
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

function makeClient(): AxiosInstance {
  return axios.create({
    baseURL: `${BASE_URL}/v1`,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": `sofya-mcp/${VERSION}`,
    },
    // Long enough for research; the server enforces its own per-endpoint timeouts.
    timeout: 180_000,
  });
}

/** Drop keys whose value is null/undefined so server-side defaults apply. */
function clean(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

async function callSofya(
  client: AxiosInstance,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const { data } = await client.post(`/${name}`, clean(args));
  return JSON.stringify(data);
}

/** Turn any thrown error into a human-readable message for the tool result. */
function errorMessage(name: string, err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
    if (status === 401) return "Unauthorized: invalid or missing Sofya API key.";
    if (status === 402) return detail ?? "Insufficient credits. Top up at https://sofya.co";
    if (status === 400) return detail ?? `Invalid request to ${name}.`;
    if (status === 429) return "Rate limited. Please slow down and try again.";
    if (status === 504) return `${name} timed out. Try again with a simpler request.`;
    if (detail) return detail;
    if (err.code === "ECONNABORTED") return `${name} timed out.`;
    return `${name} failed: ${err.message}`;
  }
  return `${name} failed: ${err instanceof Error ? err.message : String(err)}`;
}

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (argv["list-tools"]) {
    process.stdout.write(JSON.stringify(TOOLS, null, 2) + "\n");
    return;
  }

  if (!API_KEY) {
    // Start anyway so clients and registries can list tools without credentials.
    // Tool calls return a clear error until a key is provided.
    process.stderr.write(
      "Warning: no Sofya API key provided. Tools are listed but calls will fail until " +
        "you set SOFYA_API_KEY (or pass --api-key). Get a key at https://sofya.co\n",
    );
  }

  const client = makeClient();

  const server = new Server(
    { name: "sofya", version: VERSION },
    {
      capabilities: { tools: {} },
      instructions:
        "Web tools for AI agents. Search the web, fetch pages as markdown, " +
        "extract structured data with AI, and run deep multi-source research.",
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!TOOLS.some((t) => t.name === name)) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    if (!API_KEY) {
      return {
        content: [
          {
            type: "text",
            text:
              "No Sofya API key provided. Set SOFYA_API_KEY (or pass --api-key). " +
              "Get a key at https://sofya.co",
          },
        ],
        isError: true,
      };
    }

    try {
      const text = await callSofya(client, name, (args ?? {}) as Record<string, unknown>);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: errorMessage(name, err) }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`sofya-mcp ${VERSION} running on stdio (base: ${BASE_URL})\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
