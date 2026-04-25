# SDK Roadmap

## v1.1 (planned)

- [ ] Expose A2A protocol surface separately as `client.a2a.*` methods,
  even when implementation reuses MCP tool calls. Improves DX for
  A2A-first integrators.

## v1.0 (current)

- [x] 67 tool methods (59 MCP + 8 A2A-only)
- [x] Promise-based, Node 18+
- [x] Bearer auth, retry, exponential backoff
- [x] CI: test on push, publish to npm on tag
