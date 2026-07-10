---
title: Corpus di conoscenza del commercialista — fonti da indicizzare e biblioteca di studio
status: draft
owner: Tommaso
updated: 2026-07-09
tags: [rag, corpus, fonti, grounding, biblioteca]
---

# Corpus di conoscenza del commercialista

**Fonte di verità** per il sistema di retrieval di Dott. Comm.: quali fonti
indicizziamo per ground-are le risposte alle domande puntuali, quali libri
compriamo per gli umani, e cosa abbiamo valutato ed **escluso** (con il perché).

Verifica completa delle edizioni, ISBN e disponibilità digitale effettuata il
**2026-07-09** (ricerca web su cataloghi editori e fonti ufficiali).

## Il principio guida

L'istinto iniziale — comprare i manuali e indicizzarli — non regge alla
verifica sul mercato:

1. **Tutto il contenuto autorevole è gratuito e ufficiale.** Norme, prassi,
   principi contabili, istruzioni ai modelli, giurisprudenza: sono pubblici,
   più puliti da parsare dei PDF dei libri, e sempre correnti.
2. **Il contenuto editoriale che vorremmo di più (manuali operativi) è
   legalmente blindato.** Niente PDF/EPUB (solo piattaforme in abbonamento),
   opt-out espliciti al text-and-data-mining (art. 4 direttiva DSM), nessuna
   API, nessun accordo di licensing AI noto a metà 2026. Ogni grande editore
   sta costruendo il **proprio** assistente RAG sul proprio corpus (vedi §4).
3. **Quindi:** il corpus si costruisce sulle **fonti ufficiali gratuite** (§1);
   lo strato di spiegazione "da Memento" lo **generiamo noi** con il pass di
   arricchimento LLM, validato con sign-off umano (stile `verifica-costanti`).
   I libri restano una **biblioteca per gli umani** (§2), non un manifest di
   ingestione.

---

## §1 — Il corpus da indicizzare (fonti ufficiali, gratuite)

Ordinate per resa attesa sulle domande puntuali. Colonna «Agg.» = con che
ritmo la fonte cambia (determina la cadenza di re-ingestione).

| # | Fonte | Cosa contiene | Dove | Agg. | Priorità |
|---|---|---|---|---|:---:|
| 1 | **Prassi Agenzia delle Entrate** | Circolari, risoluzioni, **risposte a interpello** — *la* fonte per le domande puntuali; è ciò che i Memento sintetizzano | agenziaentrate.gov.it · def.finanze.gov.it (CERDEF) | Continuo | **Massima** |
| 2 | **Istruzioni ministeriali ai modelli** | Redditi PF/SP/SC, 730, IVA, 770, ISA, CU — la più alta densità di risposte operative per pagina | agenziaentrate.gov.it (modelli e istruzioni, per anno) | Annuale | **Massima** |
| 3 | **Normattiva** | Testi vigenti e consolidati: codice civile, TUIR (DPR 917/86), **nuovo T.U. IVA (D.Lgs. 10/2026** — verificare decorrenza differita**)**, DPR 633/72, CCII agg. **correttivo-ter D.Lgs. 136/2024**, D.Lgs. 546/92 (processo tributario), D.Lgs. 231/2007 (antiriciclaggio), D.Lgs. 139/2005, D.Lgs. 117/2017 (terzo settore)… | normattiva.it | A ogni modifica | **Massima** |
| 4 | **Testi fiscali consolidati/annotati MEF** | Versioni consolidate della normativa tributaria con annotazioni | def.finanze.gov.it | Continuo | Alta |
| 5 | **Principi contabili OIC** | Raccolta integrale (incl. OIC 34 ricavi) — PDF gratuiti per singolo principio | fondazioneoic.eu | A ogni revisione | Alta |
| 6 | **ISA Italia / ISQM Italia** | Principi di revisione — adottati e ospitati dal **MEF-RGS** (non CNDCEC/Assirevi, che collaborano soltanto) | revisionelegale.rgs.mef.gov.it | A ogni determina | Alta |
| 7 | **Provvedimenti e scadenze** | Provvedimenti del Direttore AdE, decreti MEF, scadenzario fiscale | agenziaentrate.gov.it · GU | Continuo | Alta |
| 8 | **Giurisprudenza tributaria** | Cassazione (Italgiure, gratuito) · Corti di giustizia tributaria / Banca Dati di Merito | italgiure.giustizia.it · portale giustizia tributaria | Continuo | Media |
| 9 | **CNDCEC** | Codice deontologico (**testo mod. 20-11-2025** — non la versione 2024) · regole tecniche antiriciclaggio (approvate con determina MEF 16-1-2025) · linee guida e modulistica (agg. 03-2026) | commercialisti.it | A ogni modifica | Media |
| 10 | **IFRS adottati UE** | Reg. (UE) 2023/1803 consolidato + Reg. (UE) 2026/338 (**IFRS 18**, efficace FY2027) — è il testo legalmente rilevante in Italia | EUR-Lex | A ogni omologazione | Media |
| 11 | **Sostenibilità post-Omnibus** | CSRD come modificata da **Dir. (UE) 2026/470** (Omnibus I, in vigore 18-3-2026: soglie >1000 dipendenti E >€450M) · ESRS semplificati (atto delegato) · standard volontario VSME | EUR-Lex · efrag.org | In movimento | Media |
| 12 | **Composizione negoziata** | Decreto dirigenziale Min. Giustizia **23-4-2026** (checklist, protocollo, piattaforma, Sez. II-bis) — strato amministrativo che i libri fermi al correttivo-ter non hanno | GU · piattaforma composizione negoziata | A ogni decreto | Media |

**Requisiti di ingestione** (dal design del sistema): ogni chunk porta
provenienza completa (fonte, estremi, data), **citazioni normative** estratte in
campo strutturato (grafo citazionale prassi→norma), **validità temporale**
(anno d'imposta / vigenza) come metadato di prima classe.

---

## §2 — La biblioteca dello studio (libri per gli umani — NON nel corpus)

Checklist d'acquisto verificata al 2026-07-09. ISBN in grassetto = verificati a
catalogo. Nessuno di questi entra nell'indice (vedi §3 per i motivi).

### Fondamenti giuridici (acquisto durevole)

| Poss. | Titolo | Autore / Editore | Ed. verificata | ISBN | Digitale | Prezzo | Priorità |
|:---:|---|---|---|---|---|:---:|:---:|
| ☐ | Manuale di diritto privato | Torrente-Schlesinger (cur. Anelli-Granelli) / Giuffrè | **27ª ed. 2025** ✓ | **9788828869269** ✓ | No | € 72 | Media |
| ☐ | Diritto commerciale – Vol. I: Diritto dell'impresa | Campobasso / UTET | 8ª ed. 2022 (agg. CCII) ✓ | **9788859825067** ✓ | No | € 40 | Media |
| ☐ | Diritto commerciale – Vol. II: Diritto delle società | Campobasso / UTET | **11ª ed. 2024** (agg. CCII + L. 21/2024) ✓ | **9788859826965** | No | € 43 | Media |
| ☐ | Istituzioni di diritto tributario – Parte generale | Tesauro (cur. Fregni-Sartori-Turchi) / UTET | **15ª ed. 2024** (agg. riforma fiscale) ✓ | **9788859826934** ✓ | No | € 38 | Media |
| ☐ | Istituzioni di diritto tributario – Parte speciale | Tesauro / UTET | 13ª ed. 2022 ⚠️ **pre-riforma fiscale** — l'item più datato; nessuna 14ª ed. a 07-2026 | **9788859825043** | No | € 38 | Bassa |

> Alternativa ai volumi Campobasso: **Manuale di diritto commerciale** volume
> unico, 8ª ed. 2022, ISBN **9788859825029** ✓.

### Fondamenti aziendali (acquisto durevole)

| Poss. | Titolo | Autore / Editore | Ed. verificata | ISBN | Digitale | Prezzo | Priorità |
|:---:|---|---|---|---|---|:---:|:---:|
| ☐ | Bilancio di esercizio e principi contabili | Quagli / Giappichelli | **12ª ed. 02-2025** (incl. OIC 34) | **9791221111811** | No | € 32 | Media |
| ☐ | Contabilità e bilancio | Cerbioni-Cinquini-Sòstero / McGraw-Hill | **7ª ed. 04-2025** | **9788838612374** | **Sì** (Connect + ebook) | € 49 | Media |
| ☐ | L'analisi economico-finanziaria di bilancio | Sòstero-Ferrarese-Mancin-Marcon / Giuffrè | **5ª ed. 01-2025** (la 4ª/2021 è superata) | **9788828867043** | No | € 39 | Media |
| ☐ | Finanza d'azienda *(già «Finanza aziendale», 2 voll.)* | Dallocchio-Salvi / Egea | ed. 2021 (ultima) | **9788823837676** | **Sì** (PDF €61,99 / DigitaBook €62,40) | € 78 | Media |
| ☐ | Principles of Corporate Finance | Brealey-Myers-Allen-**Edmans** / McGraw-Hill | **15ª ed. "2025 Release"** (la 14ª è superata) | **9781266586156** (US) / 9781265087586 (ISE) | **Sì** (VitalSource/Connect) | € 55+ | Media |
| ☐ | Nuovo trattato sulla valutazione delle aziende | Guatri-Bini / Egea | 2009 ⚠️ ultima stampa, nessuna nuova ed. (Guatri † 2023); datato pre-PIV — valutare integrazione con testi OIV/PIV recenti | **9788823832275** | No | € 88 | Bassa |

### Professionale-operativo (rinnovo annuale) — il cuore della biblioteca umana

| Poss. | Titolo | Editore | Ed. verificata | ISBN | Digitale | Prezzo | Priorità |
|:---:|---|---|---|---|---|:---:|:---:|
| ☐ | **Memento Fiscale 2026** *(oppure Fisco IPSOA — ne basta uno)* | **Lefebvre Giuffrè** (rebrand 04-2025 da «Giuffrè Francis Lefebvre») | **2 edizioni/anno** (marzo + settembre); bundle doppia ed. ~€210 | **9788828850526** (marzo) | Solo piattaforma MementoPiù | € 165/ed. | **Alta** |
| ☐ | Fisco 2026 (IPSOA In Pratica) | Wolters Kluwer | ed. 02-2026 (agg. L. Bilancio 2026) | **9788821787393** | Solo formula «Sempre Aggiornati» + piattaforma One (€290) | € 145 | Alta (alternativa) |
| ☐ | Memento Contabile 2026 *(oppure Contabilità e Bilancio IPSOA, ISBN 9788821787386 — ne basta uno)* | Lefebvre Giuffrè (redatto PwC) | 2026 (agg. OIC 30, bozze emendamenti, OIC 5) | **9788828859130** | Solo MementoPiù | € 150 | **Alta** |
| ☐ | Crisi d'impresa e insolvenza 2026 (IPSOA In Pratica) | Wolters Kluwer | ed. 2026 (agg. correttivo-ter) — integra con il decreto dirigenziale 23-4-2026, posteriore ai libri | **9788821787607** | Solo piattaforma One | € 145 | **Alta** |
| ☐ | Manuale Le Operazioni straordinarie 2025 | De Rosa-Russo / Il Sole 24 Ore | 11-2025 — il più fresco sul tema | **9791254837115** | No | € 79 | Media |
| ☐ | Memento Revisione Legale 2026 | Lefebvre Giuffrè | agg. 10-2025 (ISA Italia, ISQM 1-2) | **9788828853091** | Solo MementoPiù | € 125 | Media |
| ☐ | Manuale del Collegio sindacale e del sindaco unico | De Angelis / Eutekne | II ed. (corrente a 2025) | — | Biblioteca Eutekne (abbonati) | € 140 | Media |
| ☐ | Diritto tributario internazionale | Pistone / Giappichelli | nuova ed. **03-2026** (4ª ed. 2024: 9791221106770) | e-book **9788892170339** | **Sì** (e-book Giappichelli) | € 45 | Bassa |
| ☐ | Antiriciclaggio nello studio professionale | SEAC (nessuna ed. Eutekne/IPSOA 2026 identificata) | ed. 2025 — deve includere regole tecniche CNDCEC 2025 + modulistica 03-2026 | 9791254654576 | No | € 50 | Bassa |

> **Budget minimo sensato per lo studio:** Memento Fiscale (bundle ~€210) +
> Memento Contabile (€150) + Crisi d'impresa IPSOA (€145) ≈ **€500/anno**, più
> i durevoli una tantum. I codici cartacei (civile, tributario) sono opzionali:
> il testo è su Normattiva; l'ed. Simone Codice Tributario 2026 (ISBN
> 9788891445742, €85) vale solo per la comodità d'annotazione su carta.

---

## §3 — Valutati ed esclusi dal corpus (e perché)

| Fonte valutata | Esito | Perché |
|---|---|---|
| **Manuali operativi** (Memento, IPSOA In Pratica, Eutekne) come sorgente di ingestione | **Esclusi** (comprare solo per gli umani) | Nessun PDF/EPUB legale (solo piattaforme); **opt-out TDM** espliciti ex art. 4 dir. DSM; nessuna API né licensing AI noto a metà 2026. Ingestione da copie scansionate = violazione. Porta riapribile solo con licenza negoziata diretta. |
| **Codici commerciali annotati** (civile, tributario, CCII di Simone/Giuffrè/Maggioli) | **Esclusi** | Il testo normativo è gratis e più pulito su Normattiva/def.finanze; il valore aggiunto (annotazioni) è copyright dell'editore. |
| **Manuali accademici** (fondamenti giuridici e aziendali, §2) | **Esclusi** | 7 su 10 senza edizione digitale legale; taglio pedagogico poco utile per domande puntuali; alcuni datati (Tesauro PS 2022 pre-riforma, Guatri-Bini 2009). Possibile uso indiretto: sorgente per il **vocabolario controllato / ontologia dei temi** del pass di arricchimento. |
| **Abbonamenti banche dati** (Eutekne, One FISCALE, MementoPiù, Smart24…) come sorgente | **Esclusi come corpus** | Stesse ragioni legali dei manuali; utili semmai come strumento per gli umani e come benchmark qualitativo delle nostre risposte. |
| **Libri CSRD/ESRS** | **Esclusi / rinviati** | L'Omnibus I (Dir. UE 2026/470) ha riscritto perimetro e standard a 03-2026: qualunque libro pre-2026 è superato. Indicizzare EUR-Lex/EFRAG (§1.11) e ricomprare un manuale solo a quadro stabilizzato. |
| **Raccolte IAS/IFRS commerciali** (EY International GAAP, PwC Manual/Viewpoint) | **Escluse** | Abbonamenti chiusi; il testo legalmente rilevante (IFRS adottati UE) è gratis su EUR-Lex. Priorità comunque bassa per il target (PMI → OIC). |
| **Eutekne-Zanetti «Manuale delle operazioni straordinarie»** | **Escluso anche dalla biblioteca** | Ultima edizione ~2018-19: superato. In biblioteca al suo posto il manuale del Sole 24 Ore 2025 (§2). |
| **Fine-tuning di un modello sui testi** | **Escluso** (scelta di design) | Il retrieval con citazioni verificabili batte il fine-tuning per il grounding; vedi design del sistema. |

---

## §4 — Panorama competitivo: gli editori hanno già il loro RAG

Contesto strategico rilevato durante la verifica (07-2026) — spiega sia perché
il licensing è chiuso, sia dove NON dobbiamo posizionarci:

| Editore | Assistente AI | Note |
|---|---|---|
| Eutekne | **Eutekne AI** | Risponde solo dal Sistema Integrato, validazione umana quotidiana |
| Wolters Kluwer | **One FISCALE AI + Libra** | Piattaforma agentica (acquisita fine 2025); contenuti One integrati 06-2026. One FISCALE online: €99 primi 3 mesi, poi ~€675/anno |
| Lefebvre Giuffrè | **Sapient-IA** (04-2025) | Risponde solo da fonti certificate Lefebvre Giuffrè |
| Il Sole 24 Ore | **Smart24 Fisco AI** | Convenzioni CNPADC (es. €199-269/anno; gratis neo-iscritti 3 anni) |
| SEAC | All-In con AI | Aggiornamento AI-driven |
| Fiscal Focus | Fiscal Box | Fascia economica, convenzioni Ordini |

**Implicazione per Dott. Comm.:** non competere come "ennesimo chatbot su banca
dati" — il differenziale è il grounding **dentro gli strumenti di workflow**
(raccolta documenti, ravvedimento, prospetti…), dove gli editori non sono.

---

## §5 — Conclusioni operative

1. **Corpus = fonti ufficiali gratuite** (§1), con priorità: prassi AdE +
   istruzioni ai modelli + Normattiva. Zero costi di licenza, zero rischio
   legale, sempre corrente.
2. **Lo strato di spiegazione lo generiamo noi** (pass di arricchimento LLM sui
   chunk, grafo citazionale prassi→norma, validità temporale come metadato),
   con sign-off umano periodico stile `verifica-costanti`.
3. **I libri sono per gli umani**: ~€500/anno di operativi (Memento Fiscale +
   Contabile + Crisi d'impresa) + durevoli una tantum. Nessun libro entra
   nell'indice.
4. **Porta futura**: se servisse il contenuto editoriale nel corpus, l'unica
   via è una licenza negoziata direttamente con un editore (nessuna API/offerta
   standard esiste). Da rivalutare solo con trazione commerciale in mano.
5. **Prossimi passi** — ⚠️ **superati da [ADR 0014](../decisions/0014-corpus-fonti-pubbliche-retrieval.md)
   (2026-07-10)**: la pipeline è stata progettata e implementata (ingestione
   Normattiva/prassi/istruzioni → Postgres + ricerca ibrida RRF → tool MCP
   `corpus_*` → arricchimento regex+LLM con sign-off). Architettura e operazioni:
   [corpus-retrieval.md](../knowledge/corpus-retrieval.md). Il golden set e
   l'automazione del refresh restano rinviati per decisione esplicita. Questo
   documento resta la **fonte di verità su COSA indicizzare** (§1) e sulle
   esclusioni (§3); il COME vive nell'ADR e nel knowledge doc.
