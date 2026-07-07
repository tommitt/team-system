import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GateDecision } from "@/lib/billing/gate";

const { checkAndRecordUsage, recordToolEvent } = vi.hoisted(() => ({
  checkAndRecordUsage: vi.fn(),
  recordToolEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/billing/gate", () => ({ checkAndRecordUsage }));
vi.mock("../telemetry", () => ({ recordToolEvent }));

import { registerGatedTool, resolveUserId } from "../register-gated-tool";

const AUTHED = { authInfo: { extra: { userId: "user_1" } }, sessionId: "sess_1" };

const allowed: GateDecision = {
  allowed: true,
  plan: "trial",
  usageCount: 1,
  limit: 50,
};

function register(handler: (args: unknown, extra: unknown) => unknown) {
  const tool = vi.fn();
  registerGatedTool(
    { tool } as unknown as McpServer,
    "tool_di_prova",
    "desc",
    { importo: z.number() },
    handler as never,
  );
  return tool.mock.calls[0][3] as (
    args: unknown,
    extra: unknown,
  ) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

describe("registerGatedTool telemetry", () => {
  beforeEach(() => {
    checkAndRecordUsage.mockReset();
    recordToolEvent.mockClear();
  });

  it("records one 'ok' event with tool name, latency and arg names only", async () => {
    checkAndRecordUsage.mockResolvedValue(allowed);
    const gated = register(async () => ({
      content: [{ type: "text", text: "risultato" }],
    }));
    const result = await gated({ importo: 1200 }, AUTHED);
    expect(result.content[0].text).toBe("risultato");
    expect(recordToolEvent).toHaveBeenCalledExactlyOnceWith({
      userId: "user_1",
      tool: "tool_di_prova",
      sessionId: "sess_1",
      outcome: "ok",
      latencyMs: expect.any(Number),
      argsKeys: ["importo"],
    });
  });

  it("records a 'blocked' event and never runs the handler", async () => {
    checkAndRecordUsage.mockResolvedValue({
      ...allowed,
      allowed: false,
      blockedMessage: "paywall",
    });
    const handler = vi.fn();
    const gated = register(handler);
    const result = await gated({ importo: 1 }, AUTHED);
    expect(result.content[0].text).toBe("paywall");
    expect(handler).not.toHaveBeenCalled();
    expect(recordToolEvent.mock.calls[0][0].outcome).toBe("blocked");
  });

  it("records an 'error' event and rethrows when the handler throws", async () => {
    checkAndRecordUsage.mockResolvedValue(allowed);
    const gated = register(async () => {
      throw new Error("kaboom");
    });
    await expect(gated({ importo: 1 }, AUTHED)).rejects.toThrow("kaboom");
    expect(recordToolEvent.mock.calls[0][0].outcome).toBe("error");
  });

  it("still appends the gate warning to the result", async () => {
    checkAndRecordUsage.mockResolvedValue({ ...allowed, warning: "quasi al limite" });
    const gated = register(async () => ({
      content: [{ type: "text", text: "risultato" }],
    }));
    const result = await gated({ importo: 1 }, AUTHED);
    expect(result.content.map((c) => c.text)).toEqual([
      "risultato",
      "quasi al limite",
    ]);
  });

  it("skips gate and telemetry in open local dev (no user id)", async () => {
    vi.stubEnv("MCP_REQUIRE_AUTH", "");
    vi.stubEnv("MCP_DEV_USER_ID", "");
    try {
      const gated = register(async () => ({
        content: [{ type: "text", text: "libero" }],
      }));
      const result = await gated({ importo: 1 }, { authInfo: undefined });
      expect(result.content[0].text).toBe("libero");
      expect(checkAndRecordUsage).not.toHaveBeenCalled();
      expect(recordToolEvent).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("resolveUserId", () => {
  it("prefers the verified JWT user id", () => {
    expect(resolveUserId(AUTHED)).toBe("user_1");
  });

  it("falls back to MCP_DEV_USER_ID only when auth is off", () => {
    vi.stubEnv("MCP_DEV_USER_ID", "dev_1");
    try {
      vi.stubEnv("MCP_REQUIRE_AUTH", "false");
      expect(resolveUserId({})).toBe("dev_1");
      vi.stubEnv("MCP_REQUIRE_AUTH", "true");
      expect(resolveUserId({})).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
