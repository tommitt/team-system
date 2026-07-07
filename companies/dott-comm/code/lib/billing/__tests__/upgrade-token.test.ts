import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { signUpgradeToken, verifyUpgradeToken } from "../upgrade-token";

const SECRET = "test-secret-at-least-24-chars-long!!";

beforeAll(() => {
  process.env.UPGRADE_TOKEN_SECRET = SECRET;
});

function signBody(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
}

describe("upgrade token", () => {
  it("round-trips a user id", () => {
    const token = signUpgradeToken("user_123");
    expect(token).toBeTruthy();
    expect(verifyUpgradeToken(token!)).toBe("user_123");
  });

  it("rejects a tampered payload", () => {
    const token = signUpgradeToken("user_123")!;
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(
      JSON.stringify({ sub: "attacker", exp: Math.floor(Date.now() / 1000) + 600 }),
    ).toString("base64url")}.${sig}`;
    expect(verifyUpgradeToken(forged)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signUpgradeToken("user_123")!;
    const [body] = token.split(".");
    expect(verifyUpgradeToken(`${body}.deadbeef`)).toBeNull();
  });

  it("rejects a validly-signed but expired token", () => {
    const expired = signBody({
      sub: "user_123",
      exp: Math.floor(Date.now() / 1000) - 1,
    });
    expect(verifyUpgradeToken(expired)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyUpgradeToken("not-a-token")).toBeNull();
    expect(verifyUpgradeToken("")).toBeNull();
    expect(verifyUpgradeToken(".abc")).toBeNull();
  });
});
