import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock("@/lib/billing/supabase", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({ insert: (row: unknown) => insert(table, row) }),
  }),
}));

import { recordToolEvent } from "../telemetry";

describe("recordToolEvent", () => {
  beforeEach(() => {
    insert.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("inserts one row with metadata only (arg names, no values)", async () => {
    insert.mockResolvedValue({ error: null });
    await recordToolEvent({
      userId: "user_1",
      tool: "ravvedimento",
      sessionId: "sess_1",
      outcome: "ok",
      latencyMs: 42.7,
      argsKeys: ["importo", "data_scadenza"],
    });
    expect(insert).toHaveBeenCalledExactlyOnceWith("tool_events", {
      user_id: "user_1",
      tool: "ravvedimento",
      session_id: "sess_1",
      outcome: "ok",
      latency_ms: 43,
      args_keys: ["importo", "data_scadenza"],
    });
  });

  it("stores a null session id when the transport has none", async () => {
    insert.mockResolvedValue({ error: null });
    await recordToolEvent({
      userId: "user_1",
      tool: "prospetto_acconti",
      outcome: "blocked",
      latencyMs: 10,
      argsKeys: [],
    });
    expect(insert.mock.calls[0][1]).toMatchObject({ session_id: null });
  });

  it("swallows a Supabase error response (fail open)", async () => {
    insert.mockResolvedValue({ error: new Error("boom") });
    await expect(
      recordToolEvent({
        userId: "user_1",
        tool: "ravvedimento",
        outcome: "ok",
        latencyMs: 5,
        argsKeys: [],
      }),
    ).resolves.toBeUndefined();
  });

  it("swallows a thrown client error (fail open)", async () => {
    insert.mockRejectedValue(new Error("network down"));
    await expect(
      recordToolEvent({
        userId: "user_1",
        tool: "ravvedimento",
        outcome: "error",
        latencyMs: 5,
        argsKeys: [],
      }),
    ).resolves.toBeUndefined();
  });
});
