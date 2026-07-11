# ThinkNEO TypeScript SDK

TypeScript SDK for the ThinkNEO MCP + A2A Gateway — 59 MCP tools and 24 A2A skills, governed under your ThinkNEO project.

> Status: pre-release. This repository is being prepared for its first public package. The examples below reflect the intended surface; check back for the tagged release before adopting in production.

## Install

```bash
npm install @thinkneo/sdk
```

## Minimal usage

```ts
import { Client } from "@thinkneo/sdk";

const client = new Client({ apiKey: "tnk_..." });   // your project API key
const result = await client.tools.call("web.search", { q: "thinkneo" });
console.log(result);
```

## Links

- Documentation & governance model: <https://thinkneo.ai>
- Developer portal: <https://thinkneo.ai/developers>
- Report issues: <https://github.com/thinkneo-ai/sdk-typescript/issues>

## License

See [LICENSE](./LICENSE).
