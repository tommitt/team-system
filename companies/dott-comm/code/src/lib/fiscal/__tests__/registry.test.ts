import { describe, it, expect } from "vitest";
import { lookupVigente, type VoceVigente } from "../registry";
import { rateAderSemplice, tassoLegale } from "../constants";
import { isFestivo, slittaSeFestivo } from "../calendario";

const TABELLA: VoceVigente<number>[] = [
  { valore: 1, vigenzaDa: "2025-01-01", vigenzaA: "2025-12-31", fonte: "test", verificatoIl: "2026-07-07" },
  { valore: 2, vigenzaDa: "2026-01-01", vigenzaA: "2026-12-31", fonte: "test", verificatoIl: null },
];

describe("lookupVigente", () => {
  it("trova la voce vigente alla data, verificata", () => {
    const l = lookupVigente("x", TABELLA, "2025-06-15");
    expect(l.valore).toBe(1);
    expect(l.verificato).toBe(true);
    expect(l.nota).toBeUndefined();
  });

  it("voce vigente ma mai verificata → verificato false con nota", () => {
    const l = lookupVigente("x", TABELLA, "2026-06-15");
    expect(l.valore).toBe(2);
    expect(l.verificato).toBe(false);
    expect(l.nota).toContain("DA VERIFICARE");
  });

  it("data oltre le vigenze note → valore più vicino con caveat rumoroso", () => {
    const l = lookupVigente("x", TABELLA, "2027-03-01");
    expect(l.valore).toBe(2);
    expect(l.verificato).toBe(false);
    expect(l.nota).toContain("2027-03-01");
  });

  it("data prima delle vigenze note → prima voce con caveat", () => {
    const l = lookupVigente("x", TABELLA, "2020-01-01");
    expect(l.valore).toBe(1);
    expect(l.verificato).toBe(false);
  });
});

describe("tassoLegale", () => {
  it("2026 → 1,60% verificato (DM MEF 10/12/2025)", () => {
    const l = tassoLegale("2026-07-07");
    expect(l.valore).toBe(0.016);
    expect(l.verificato).toBe(true);
  });

  it("2025 → 2,00%; 2024 → 2,50% ma non riverificato", () => {
    expect(tassoLegale("2025-03-01").valore).toBe(0.02);
    const l2024 = tassoLegale("2024-03-01");
    expect(l2024.valore).toBe(0.025);
    expect(l2024.verificato).toBe(false);
  });
});

describe("rateAderSemplice (scaglioni D.Lgs. 110/2024)", () => {
  it("istanza 2026 → 84 rate; 2027 → 96; 2029 → 108", () => {
    expect(rateAderSemplice("2026-07-07").valore).toBe(84);
    expect(rateAderSemplice("2027-01-15").valore).toBe(96);
    expect(rateAderSemplice("2029-06-01").valore).toBe(108);
  });
});

describe("calendario: 4 ottobre (L. 151/2025, dal 2026)", () => {
  it("il 4/10 è festivo dal 2026, non prima", () => {
    expect(isFestivo("2026-10-04")).toBe(true);
    // 2025-10-04 era un sabato ma non festività nazionale.
    expect(isFestivo("2025-10-04")).toBe(false);
  });

  it("un termine che cade il 4/10 dal 2026 slitta", () => {
    // 2027-10-04 è un lunedì: senza la nuova festività non slitterebbe.
    expect(slittaSeFestivo("2027-10-04")).toBe("2027-10-05");
  });
});
