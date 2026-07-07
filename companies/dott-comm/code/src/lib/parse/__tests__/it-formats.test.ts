import { describe, it, expect } from "vitest";
import {
  parseImportoIt,
  parseDataIt,
  validaPartitaIva,
  validaCodiceFiscale,
} from "../it-formats";

describe("parseImportoIt", () => {
  it("interpreta il formato italiano con migliaia e decimali", () => {
    expect(parseImportoIt("1.234,56")).toBe(1234.56);
    expect(parseImportoIt("€ 1.234,56")).toBe(1234.56);
    expect(parseImportoIt("-1.234,56")).toBe(-1234.56);
  });
  it("gestisce importi senza separatore migliaia", () => {
    expect(parseImportoIt("1234,5")).toBe(1234.5);
    expect(parseImportoIt("1234.56")).toBe(1234.56);
    expect(parseImportoIt("500")).toBe(500);
  });
  it("ritorna null per input non numerici", () => {
    expect(parseImportoIt("n/d")).toBeNull();
    expect(parseImportoIt("")).toBeNull();
  });
});

describe("parseDataIt", () => {
  it("normalizza in ISO da vari formati", () => {
    expect(parseDataIt("20/07/2026")).toBe("2026-07-20");
    expect(parseDataIt("20-7-2026")).toBe("2026-07-20");
    expect(parseDataIt("20.07.2026")).toBe("2026-07-20");
    expect(parseDataIt("2026-07-20")).toBe("2026-07-20");
  });
  it("rifiuta date inesistenti", () => {
    expect(parseDataIt("31/02/2026")).toBeNull();
    expect(parseDataIt("2026-13-01")).toBeNull();
    expect(parseDataIt("boh")).toBeNull();
  });
});

describe("validaPartitaIva", () => {
  it("accetta una partita IVA con check digit corretto", () => {
    expect(validaPartitaIva("00743110157")).toBe(true); // esempio noto valido
  });
  it("rifiuta lunghezza errata o check digit errato", () => {
    expect(validaPartitaIva("1234567890")).toBe(false);
    expect(validaPartitaIva("00743110158")).toBe(false);
  });
});

describe("validaCodiceFiscale", () => {
  it("accetta la forma corretta e rifiuta il resto", () => {
    expect(validaCodiceFiscale("RSSMRA80A01H501U")).toBe(true);
    expect(validaCodiceFiscale("RSSMRA80A01H501")).toBe(false);
  });
});
