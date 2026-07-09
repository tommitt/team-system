import { describe, expect, it } from "vitest";
import { decide, trialUsageView, type TrialLimits } from "../gate";

// Small limits keep the phase boundaries obvious. WARN_RATIO is 0.8, so the
// phase-1 warning starts at ceil(10*0.8)=8 and the daily one at ceil(4*0.8)=4.
const LIMITS: TrialLimits = { total: 10, daily: 4 };

const trial = (total: number, daily: number) =>
  decide("trial", { total, daily }, LIMITS);

describe("decide — trial, phase 1 (upfront lifetime pool)", () => {
  it("allows calls within the pool with no warning", () => {
    const d = trial(3, 3);
    expect(d.allowed).toBe(true);
    expect(d.warning).toBeUndefined();
    expect(d.blockedMessage).toBeUndefined();
  });

  it("allows but warns as the pool nears exhaustion", () => {
    const d = trial(8, 1);
    expect(d.allowed).toBe(true);
    expect(d.warning).toMatch(/8\/10/);
    expect(d.warning).toMatch(/4 chiamate gratuite al giorno/);
  });

  it("allows the very last pool call (total === limit)", () => {
    const d = trial(10, 10);
    expect(d.allowed).toBe(true);
    expect(d.warning).toMatch(/10\/10/);
  });
});

describe("decide — trial, phase 2 (recurring daily allowance)", () => {
  it("allows daily calls once the pool is spent", () => {
    const d = trial(11, 2);
    expect(d.allowed).toBe(true);
    expect(d.warning).toBeUndefined();
  });

  it("warns as the daily allowance nears its cap", () => {
    const d = trial(30, 4);
    expect(d.allowed).toBe(true);
    expect(d.warning).toMatch(/4\/4 chiamate gratuite di oggi/);
  });

  it("blocks with the daily-limit message when today's allowance is exceeded", () => {
    const d = trial(30, 5);
    expect(d.allowed).toBe(false);
    expect(d.blockedMessage).toMatch(/limite giornaliero/);
    expect(d.blockedMessage).toMatch(/Torna domani/);
    expect(d.blockedMessage).toMatch(/\(4 al giorno\)/);
  });

  it("exposes the daily counters on the decision", () => {
    const d = trial(30, 5);
    expect(d.dailyUsageCount).toBe(5);
    expect(d.dailyLimit).toBe(4);
    expect(d.usageCount).toBe(30);
    expect(d.limit).toBe(10);
  });
});

describe("trialUsageView — how the account/upgrade pages present usage", () => {
  it("shows the pool label and percentage while within the pool", () => {
    const v = trialUsageView({ total: 3, daily: 3 }, LIMITS);
    expect(v).toEqual({ label: "3/10", pct: 30, inDailyPhase: false });
  });

  it("stays in the pool phase at the exact boundary (total === limit)", () => {
    const v = trialUsageView({ total: 10, daily: 10 }, LIMITS);
    expect(v).toEqual({ label: "10/10", pct: 100, inDailyPhase: false });
  });

  it("switches to the daily label once the pool is spent", () => {
    const v = trialUsageView({ total: 11, daily: 2 }, LIMITS);
    expect(v).toEqual({ label: "2/4 oggi", pct: 50, inDailyPhase: true });
  });

  it("clamps the label and percentage past the daily cap", () => {
    const v = trialUsageView({ total: 30, daily: 9 }, LIMITS);
    expect(v).toEqual({ label: "4/4 oggi", pct: 100, inDailyPhase: true });
  });
});

describe("decide — non-trial plans are unaffected", () => {
  const usage = { total: 999, daily: 999 };
  it("active is always allowed", () => {
    expect(decide("active", usage, LIMITS).allowed).toBe(true);
  });
  it("canceled is blocked with a reactivation message", () => {
    const d = decide("canceled", usage, LIMITS);
    expect(d.allowed).toBe(false);
    expect(d.blockedMessage).toMatch(/non è attivo/);
  });
  it("past_due is allowed but warns", () => {
    const d = decide("past_due", usage, LIMITS);
    expect(d.allowed).toBe(true);
    expect(d.warning).toMatch(/pagamento/);
  });
});
