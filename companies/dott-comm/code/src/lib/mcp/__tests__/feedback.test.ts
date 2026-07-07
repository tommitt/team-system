import { beforeEach, describe, expect, it, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const { insert, recordToolEvent } = vi.hoisted(() => ({
  insert: vi.fn(),
  recordToolEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/billing/supabase", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({ insert: (row: unknown) => insert(table, row) }),
  }),
}));
vi.mock("../telemetry", () => ({ recordToolEvent }));

import { registerFeedback } from "../feedback";

const AUTHED = { authInfo: { extra: { userId: "user_1" } }, sessionId: "sess_1" };

function getHandler() {
  const tool = vi.fn();
  registerFeedback({ tool } as unknown as McpServer);
  expect(tool).toHaveBeenCalledOnce();
  const [name, , , handler] = tool.mock.calls[0];
  expect(name).toBe("invia_feedback");
  return handler as (
    args: { categoria: string; messaggio: string; contesto?: string },
    extra: unknown,
  ) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

describe("invia_feedback", () => {
  beforeEach(() => {
    insert.mockReset();
    recordToolEvent.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("stores the feedback row and thanks the user", async () => {
    insert.mockResolvedValue({ error: null });
    const result = await getHandler()(
      {
        categoria: "capability_mancante",
        messaggio: "Vorrei generare direttamente il file F24",
        contesto: "dopo prospetto_acconti",
      },
      AUTHED,
    );
    expect(insert).toHaveBeenCalledExactlyOnceWith("feedback", {
      workos_user_id: "user_1",
      categoria: "capability_mancante",
      messaggio: "Vorrei generare direttamente il file F24",
      contesto: "dopo prospetto_acconti",
    });
    expect(result.content[0].text).toMatch(/Grazie/);
    expect(recordToolEvent).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        userId: "user_1",
        tool: "invia_feedback",
        outcome: "ok",
        argsKeys: ["categoria", "messaggio", "contesto"],
      }),
    );
  });

  it("stores a null contesto when omitted", async () => {
    insert.mockResolvedValue({ error: null });
    await getHandler()(
      { categoria: "altro", messaggio: "Complimenti" },
      AUTHED,
    );
    expect(insert.mock.calls[0][1]).toMatchObject({ contesto: null });
    expect(recordToolEvent.mock.calls[0][0].argsKeys).toEqual([
      "categoria",
      "messaggio",
    ]);
  });

  it("answers with a retry message on DB failure, without throwing", async () => {
    insert.mockRejectedValue(new Error("db down"));
    const result = await getHandler()(
      { categoria: "frizione", messaggio: "Troppi passaggi" },
      AUTHED,
    );
    expect(result.content[0].text).toMatch(/Riprova/);
    expect(recordToolEvent.mock.calls[0][0].outcome).toBe("error");
  });
});
