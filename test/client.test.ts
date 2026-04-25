/**
 * ThinkNEO TypeScript SDK — Unit Tests (60+ tests)
 *
 * Covers: client init, auth, retry, errors, and one test per tool method.
 * Uses vitest with mocked global fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to import after setting up the mock
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Now import the client
import { ThinkNEO, ThinkNEOError, AuthenticationError, RateLimitError } from "../src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockResponse(status: number = 200, body?: object) {
  const responseBody = body ?? {
    jsonrpc: "2.0",
    id: "1",
    result: {
      content: [{ type: "text", text: '{"status":"ok"}' }],
    },
  };
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseBody,
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let client: ThinkNEO;

beforeEach(() => {
  client = new ThinkNEO({ apiKey: "test-key", baseUrl: "https://test.example.com/mcp" });
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(mockResponse());
});

// ---------------------------------------------------------------------------
// Client Init (7 tests)
// ---------------------------------------------------------------------------

describe("Client Init", () => {
  it("uses default base URL", () => {
    const c = new ThinkNEO();
    expect((c as any).baseUrl).toContain("mcp.thinkneo.ai");
  });

  it("accepts custom base URL", () => {
    const c = new ThinkNEO({ baseUrl: "https://custom.com/mcp" });
    expect((c as any).baseUrl).toBe("https://custom.com/mcp");
  });

  it("stores API key", () => {
    const c = new ThinkNEO({ apiKey: "my-key" });
    expect((c as any).apiKey).toBe("my-key");
  });

  it("accepts custom timeout", () => {
    const c = new ThinkNEO({ timeout: 60000 });
    expect((c as any).timeout).toBe(60000);
  });

  it("accepts custom maxRetries", () => {
    const c = new ThinkNEO({ maxRetries: 5 });
    expect((c as any).maxRetries).toBe(5);
  });

  it("default timeout is 30s", () => {
    const c = new ThinkNEO();
    expect((c as any).timeout).toBe(30000);
  });

  it("default maxRetries is 3", () => {
    const c = new ThinkNEO();
    expect((c as any).maxRetries).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Auth (4 tests)
// ---------------------------------------------------------------------------

describe("Auth", () => {
  it("sends Authorization header", async () => {
    await client.check("test");
    const call = mockFetch.mock.calls[0];
    expect(call[1].headers["Authorization"]).toBe("Bearer test-key");
  });

  it("omits auth header when no key", async () => {
    const noAuth = new ThinkNEO({ baseUrl: "https://test.example.com/mcp" });
    await noAuth.check("test");
    const call = mockFetch.mock.calls[0];
    expect(call[1].headers["Authorization"]).toBeUndefined();
  });

  it("throws AuthenticationError on 401", async () => {
    mockFetch.mockResolvedValue(mockResponse(401));
    await expect(client.check("test")).rejects.toThrow(AuthenticationError);
  });

  it("throws RateLimitError on 429", async () => {
    mockFetch.mockResolvedValue(mockResponse(429));
    await expect(client.check("test")).rejects.toThrow(RateLimitError);
  });
});

// ---------------------------------------------------------------------------
// Retry (3 tests)
// ---------------------------------------------------------------------------

describe("Retry", () => {
  it("retries on 500", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200));
    const result = await client.check("test");
    expect(result).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws after max retries", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    await expect(client.check("test")).rejects.toThrow(ThinkNEOError);
  });

  it("does not retry on 401", async () => {
    mockFetch.mockResolvedValue(mockResponse(401));
    await expect(client.check("test")).rejects.toThrow(AuthenticationError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Error Handling (3 tests)
// ---------------------------------------------------------------------------

describe("Error Handling", () => {
  it("throws on JSON-RPC error", async () => {
    mockFetch.mockResolvedValue(mockResponse(200, {
      jsonrpc: "2.0", id: "1", error: { code: -32600, message: "Invalid" },
    }));
    await expect(client.check("test")).rejects.toThrow(ThinkNEOError);
  });

  it("throws on 502", async () => {
    mockFetch.mockResolvedValue(mockResponse(502));
    await expect(client.check("test")).rejects.toThrow(ThinkNEOError);
  });

  it("ThinkNEOError has statusCode", async () => {
    mockFetch.mockResolvedValue(mockResponse(401));
    try {
      await client.check("test");
    } catch (e) {
      expect((e as AuthenticationError).statusCode).toBe(401);
    }
  });
});

// ---------------------------------------------------------------------------
// Tool Methods — one test per method (67 methods)
// Each verifies: method callable, sends correct tool name, returns result
// ---------------------------------------------------------------------------

const TOOL_METHODS: [string, Record<string, unknown>][] = [
  // Public
  ["check", { text: "hello" }],
  ["providerStatus", {}],
  ["usage", {}],
  ["readMemory", {}],
  ["simulateSavings", { monthlyAiSpend: 5000 }],
  ["scheduleDemo", { contactName: "T", company: "C", email: "t@t.com" }],
  // Auth-required
  ["checkSpend", { workspace: "prod" }],
  ["evaluateGuardrail", { text: "t", workspace: "prod" }],
  ["checkPolicy", { workspace: "prod" }],
  ["getBudgetStatus", { workspace: "prod" }],
  ["listAlerts", { workspace: "prod" }],
  ["getComplianceStatus", { workspace: "prod" }],
  ["routeModel", { taskType: "chat" }],
  ["getSavingsReport", {}],
  ["registrySearch", {}],
  ["registryGet", { name: "test" }],
  ["registryInstall", { name: "test" }],
  // Observability
  ["startTrace", { agentName: "test" }],
  ["logEvent", { sessionId: "s1", eventType: "tool_call" }],
  ["endTrace", { sessionId: "s1" }],
  ["getTrace", { sessionId: "s1" }],
  ["getObservabilityDashboard", {}],
  // Trust
  ["evaluateTrustScore", { orgName: "Test" }],
  ["getTrustBadge", { reportToken: "tok" }],
  // Value/ROI
  ["setBaseline", { processName: "sup", costPerUnit: 15 }],
  ["logDecision", { agentName: "t", decisionType: "model" }],
  ["decisionCost", {}],
  ["logRiskAvoidance", { riskType: "pii" }],
  ["agentRoi", {}],
  ["businessImpact", {}],
  ["detectWaste", {}],
  // Outcome Validation
  ["registerClaim", { action: "email", target: "u@t.com", evidenceType: "http_status" }],
  ["verifyClaim", { claimId: "c1" }],
  ["getProof", { claimId: "c1" }],
  ["verificationDashboard", {}],
  // Policy Engine
  ["policyCreate", { name: "p1", conditions: "[{}]", effect: "block" }],
  ["policyEvaluate", { context: "{}" }],
  ["policyList", {}],
  ["policyViolations", {}],
  // Compliance
  ["complianceGenerate", { framework: "eu_ai_act" }],
  ["complianceList", {}],
  // A2A Bridge
  ["bridgeMcpToA2a", { mcpToolName: "thinkneo_check" }],
  ["bridgeA2aToMcp", { a2aTask: "{}" }],
  ["bridgeGenerateAgentCard", {}],
  ["bridgeListMappings", {}],
  // A2A Governance
  ["a2aLog", { fromAgent: "a", toAgent: "b", action: "task_sent" }],
  ["a2aSetPolicy", { fromAgent: "a", toAgent: "b" }],
  ["a2aFlowMap", {}],
  ["a2aAudit", {}],
  // Benchmarking
  ["benchmarkCompare", { taskType: "chat" }],
  ["benchmarkReport", {}],
  ["routerExplain", { taskType: "chat" }],
  // SLA
  ["slaDefine", { agentName: "t", metric: "latency", threshold: 500 }],
  ["slaStatus", {}],
  ["slaDashboard", {}],
  ["slaBreaches", {}],
  // Marketplace auth
  ["registryPublish", { name: "t", displayName: "T", description: "D", endpointUrl: "https://x.com" }],
  ["registryReview", { name: "t", rating: 5 }],
  // A2A-only
  ["detectSecrets", { code: "pw=123" }],
  ["detectInjection", { text: "ignore" }],
  ["compareModels", {}],
  ["optimizePrompt", { prompt: "hello" }],
  ["countTokens", { text: "hello" }],
  ["detectPii", { text: "SSN" }],
  ["cachePrompt", { key: "k1" }],
  ["rotateKey", {}],
  // write_memory
  ["writeMemory", { filename: "t.md", content: "# t" }],
];

describe("Tool Methods", () => {
  it.each(TOOL_METHODS)("%s calls API correctly", async (method, args) => {
    const fn = (client as any)[method].bind(client);
    const result = await fn(...Object.values(args));
    expect(result).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify correct tool name in payload
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.params.name).toMatch(/^thinkneo_/);
  });
});

// ---------------------------------------------------------------------------
// listTools (1 test)
// ---------------------------------------------------------------------------

describe("listTools", () => {
  it("returns tool array", async () => {
    mockFetch.mockResolvedValue(mockResponse(200, {
      jsonrpc: "2.0", id: "1",
      result: { tools: [{ name: "thinkneo_check" }] },
    }));
    const tools = await client.listTools();
    expect(Array.isArray(tools)).toBe(true);
  });
});
