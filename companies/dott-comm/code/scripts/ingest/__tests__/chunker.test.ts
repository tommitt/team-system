import { describe, expect, it } from "vitest";
import {
  costruisciChunks,
  mascheraIndice,
  percorso,
  rimuoviRigheIndice,
  spezzaTestoLungo,
  stimaToken,
} from "../lib/chunker";

const lungo = (token: number) => "parola ".repeat(Math.ceil((token * 4) / 7));

describe("spezzaTestoLungo", () => {
  it("lascia intatto ciò che sta nel limite", () => {
    expect(spezzaTestoLungo("breve", 100)).toEqual(["breve"]);
  });

  it("spezza ai confini di comma, non a metà frase", () => {
    const testo = `1. ${lungo(400)}\n2. ${lungo(400)}\n3. ${lungo(400)}`;
    const pezzi = spezzaTestoLungo(testo, 500);
    expect(pezzi.length).toBeGreaterThan(1);
    for (const p of pezzi) expect(p.trimStart()).toMatch(/^\d+\./);
  });

  it("rispetta il limite anche quando un singolo comma lo sfonda", () => {
    const pezzi = spezzaTestoLungo(`1. ${lungo(3000)}`, 500);
    for (const p of pezzi) expect(stimaToken(p)).toBeLessThanOrEqual(500);
  });

  it("non taglia mai a metà parola", () => {
    const testo = lungo(2000);
    for (const p of spezzaTestoLungo(testo, 300)) {
      expect(p).not.toMatch(/^\S*par\b/);
      expect(p.trim()).toBe(p.trim().replace(/\s+$/, ""));
    }
    expect(spezzaTestoLungo(testo, 300).join(" ").replace(/\s+/g, " ").trim()).toBe(
      testo.replace(/\s+/g, " ").trim(),
    );
  });
});

describe("costruisciChunks", () => {
  it("numera i chunk in sequenza e scarta i vuoti", () => {
    const chunks = costruisciChunks([
      { percorso: "A", testo: "primo" },
      { percorso: "B", testo: "   " },
      { percorso: "C", testo: "secondo" },
    ]);
    expect(chunks.map((c) => c.seq)).toEqual([0, 1]);
    expect(chunks.map((c) => c.percorso)).toEqual(["A", "C"]);
  });

  it("accorpa un frammento corto al chunk precedente dello stesso percorso", () => {
    const chunks = costruisciChunks(
      [
        { percorso: "A", testo: "un testo di lunghezza sufficiente a restare da solo" },
        { percorso: "A", testo: "coda" },
      ],
      { minToken: 20 },
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0].testo).toContain("coda");
  });

  it("non accorpa fra percorsi diversi", () => {
    const chunks = costruisciChunks(
      [
        { percorso: "A", testo: "testo lungo abbastanza da non essere accorpato via" },
        { percorso: "B", testo: "coda" },
      ],
      { minToken: 20 },
    );
    expect(chunks).toHaveLength(2);
  });

  it("conserva le pagine di provenienza", () => {
    const [c] = costruisciChunks([
      { percorso: "A", testo: "testo", paginaDa: 4, paginaA: 6 },
    ]);
    expect([c.paginaDa, c.paginaA]).toEqual([4, 6]);
  });
});

describe("indice dei PDF", () => {
  const conIndice = [
    "INDICE",
    "1. Premessa ................................ 3",
    "1.1 Ambito oggettivo ...................... 4",
    "2. Trattamento integrativo speciale per i lavoratori",
    "    del settore privato ................... 7",
    "1. PREMESSA",
    "Il presente documento chiarisce…",
  ].join("\n");

  it("rimuoviRigheIndice toglie le righe coi puntini di guida", () => {
    expect(rimuoviRigheIndice(conIndice)).not.toContain("Ambito oggettivo");
    expect(rimuoviRigheIndice(conIndice)).toContain("Il presente documento");
  });

  it("mascheraIndice cancella l'intera regione, incluse le voci che vanno a capo", () => {
    const out = mascheraIndice(conIndice);
    expect(out).not.toContain("Ambito oggettivo");
    // la prima riga di una voce a capo non ha puntini: sopravviverebbe a una
    // rimozione riga-per-riga, e somiglia in tutto a un titolo di sezione.
    expect(out).not.toContain("2. Trattamento integrativo speciale");
    expect(out).toContain("1. PREMESSA");
    expect(out).toContain("Il presente documento");
  });

  it("mascheraIndice conserva la lunghezza del testo (gli offset mappano le pagine)", () => {
    expect(mascheraIndice(conIndice)).toHaveLength(conIndice.length);
  });

  it("non rasa un documento che ha solo un'ellissi sparsa", () => {
    const testo = "Il contribuente… non deve.\nAltro testo ..... 5 righe più giù.";
    expect(mascheraIndice(testo)).toBe(testo);
  });
});

describe("percorso", () => {
  it("compone la gerarchia saltando i segmenti vuoti", () => {
    expect(percorso("DPR 917/1986", "", null, "Art. 51")).toBe(
      "DPR 917/1986 > Art. 51",
    );
  });
});
