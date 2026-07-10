import { afterEach, describe, expect, it } from "vitest";
import { applicaRerank } from "../rerank";
import { embeddingsAbilitati, rerankAbilitato } from "../config";

describe("applicaRerank", () => {
  const base = ["a", "b", "c", "d", "e"];

  it("riordina secondo gli indici del reranker e taglia al limite", () => {
    expect(applicaRerank(base, [3, 0, 4], 2)).toEqual(["d", "a"]);
  });

  it("ignora indici fuori range e duplicati (difensivo verso l'API)", () => {
    expect(applicaRerank(base, [2, 99, 2, -1, 1], 10)).toEqual(["c", "b"]);
  });

  it("un ordine vuoto svuota il risultato (nessun fallback implicito)", () => {
    expect(applicaRerank(base, [], 5)).toEqual([]);
  });

  it("non muta l'input", () => {
    const copia = [...base];
    applicaRerank(base, [1, 0], 2);
    expect(base).toEqual(copia);
  });
});

describe("config: opt-out espliciti", () => {
  const originali = {
    emb: process.env.CORPUS_EMBEDDINGS,
    rer: process.env.CORPUS_RERANK,
  };
  afterEach(() => {
    process.env.CORPUS_EMBEDDINGS = originali.emb;
    process.env.CORPUS_RERANK = originali.rer;
  });

  it("default: attivi quando la variabile è assente o vuota", () => {
    delete process.env.CORPUS_EMBEDDINGS;
    delete process.env.CORPUS_RERANK;
    expect(embeddingsAbilitati()).toBe(true);
    expect(rerankAbilitato()).toBe(true);
    process.env.CORPUS_RERANK = "";
    expect(rerankAbilitato()).toBe(true);
  });

  it("opt-out con le forme comuni di falso", () => {
    for (const v of ["false", "0", "off", "no", "FALSE", " Off "]) {
      process.env.CORPUS_RERANK = v;
      expect(rerankAbilitato(), v).toBe(false);
    }
  });

  it("qualsiasi altro valore lascia attivo (fail-open verso l'intenzione di default)", () => {
    process.env.CORPUS_EMBEDDINGS = "true";
    expect(embeddingsAbilitati()).toBe(true);
    process.env.CORPUS_EMBEDDINGS = "1";
    expect(embeddingsAbilitati()).toBe(true);
  });
});
