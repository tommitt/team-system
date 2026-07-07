---
title: Dottore Commercialista — Problem Space
status: active
owner: pvalfre
updated: 2026-07-06
tags: [problem-space, commercialista, domain-map, automation, mcp]
---

# Dottore Commercialista — Problem Space

_One file: the full map of what a Dottore Commercialista actually does, activity by activity, chapter by chapter — the domain groundwork for Dott. Comm.'s Agent Skills and MCP server._

A deep map of the profession organized by functional area. The working assumption: **every studio in Italy — from the solo practitioner to the 30-person structured firm — performs essentially the same set of activities**. What changes with size is *who* executes each step and how work is divided, not the work itself. Each activity card therefore describes the activity once, and the **Chi** field maps it onto the studio's roles (in a solo studio, all roles collapse into one person).

## Purpose

This is groundwork for building an Agent with specific Skills and MCPs that automate or assist parts of the profession, and a shared reference for the dev team. Every activity card carries the fields needed to assess automatability:

- **Sistemi toccati** — the digital surface: which portals, telematic channels, and file formats the activity touches. These are the candidate MCP integration points.
- **Natura** — how rule-based vs judgment-based the activity is. Rule-based, high-volume, deadline-driven activities are Skill candidates; judgment-heavy ones are assist-only.

## Method and caveats

- Compiled from domain knowledge, **not** from live sources. Deadlines and thresholds reflect the general regime as known; Italian tax law shifts every year (legge di bilancio, decreti attuativi, proroghe), so **every hard date in this file must be treated as "typical" and re-verified against the current year's scadenzario** before being encoded into any automation.
- The document describes the *common core* of the profession. Niche specializations (e.g. sport, enti del terzo settore, fiscalità internazionale spinta) exist but are not mapped here.

## Anatomy of an activity card

```markdown
#### <Activity name>
- **Cosa**: what it is, in 1–3 sentences
- **Trigger / Frequenza**: what starts it, how often it recurs
- **Scadenza**: hard deadline, if any
- **Input**: documents/data needed, and where they come from
- **Output**: what gets produced, and where it goes
- **Chi**: titolare / collaboratore / segreteria (solo studio: same person)
- **Sistemi toccati**: portals, channels, file formats
- **Tempo**: rough effort per client per occurrence
- **Natura**: rule-based vs judgment mix — the automatability signal
```

## The chapters

| # | Area | One-line essence |
|---|------|------------------|
| 01 | Contabilità e tenuta delle scritture | The volume engine: registering every economic fact of every client |
| 02 | Adempimenti dichiarativi e fiscali ricorrenti | The scadenzario-driven compliance core: declarations, comunicazioni, versamenti |
| 03 | Bilancio d'esercizio | Closing the year: from scritture di assestamento to deposito al Registro Imprese |
| 04 | Consulenza fiscale e d'impresa | Planning, regimes, agevolazioni, pareri — where the value (and the judgment) lives |
| 05 | Consulenza societaria e operazioni straordinarie | Company lifecycle: costituzione, variazioni, quote, fusioni, liquidazione |
| 06 | Contenzioso e pre-contenzioso tributario | Defending the client from avvisi bonari to the Corte di Giustizia Tributaria |
| 07 | Incarichi istituzionali | Revisione legale, collegio sindacale, crisi d'impresa, perizie, CTU |
| 08 | Gestione dello studio | The studio as a business: scadenzario, antiriciclaggio, mandati, deleghe, fatturazione |
| 09 | Relazione con il cliente | Onboarding, document chasing, scadenze communication, the daily question stream |
| 10 | Il ritmo del tempo | Giornata tipo, mese tipo, anno tipo — how all of the above lands on the calendar |
| F | Focus — La corsa al 20 luglio 2026 | The live versamenti crunch for partite IVA, and the priority Agent Skills it demands |

## Boundary: Lavoro e paghe

Payroll (buste paga, UniEmens, contratti di lavoro, vertenze) is deliberately **out of scope**: in the Italian system it is the domain of the **Consulente del Lavoro**, a separate regulated profession. Many structured studios host an internal paghe department or partner tightly with a consulente del lavoro, and the contabilità area receives monthly payroll data from them (see card *Registrazione costi del personale* in chapter 01). That profession will be mapped in its own, separate research.

## Systems glossary (the recurring digital surface)

| System | What it is |
|--------|-----------|
| **SDI** (Sistema di Interscambio) | The national e-invoicing exchange; every fattura elettronica (XML) passes through it |
| **Fatture e Corrispettivi (F&C)** | AdE web portal to consult/manage e-invoices, corrispettivi, bollo |
| **Cassetto fiscale** | Per-taxpayer AdE archive: dichiarazioni, versamenti, comunicazioni; accessed via delega |
| **Entratel / Desktop Telematico** | The intermediary's telematic channel for filing dichiarazioni, F24, CU, 770 |
| **ComUnica / Telemaco / DIRE** | Registro delle Imprese (CCIAA) channels: pratiche, depositi bilanci, visure |
| **AdE-Riscossione portal** | Cartelle, rateizzazioni, definizioni agevolate |
| **INPS / INAIL portals** | Iscrizioni, cassetti previdenziali, DURC |
| **Sistema TS** | Tessera Sanitaria: transmission of healthcare spending data |
| **Gestionale di studio** | TeamSystem, Zucchetti, Wolters Kluwer, Sistemi (Profis), Passepartout, Datev, Fatture in Cloud… the ERP where contabilità and dichiarativi are produced |
| **PEC / firma digitale (CAdES-XAdES) / SPID-CIE-CNS** | Legal-value communication and identity layer for everything above |

## How to read this for automation

When evaluating an activity for a Skill/MCP, look at the combination of fields: high **Frequenza** × low **Natura** judgment share × well-defined **Sistemi toccati** = prime automation target (e.g. liquidazioni IVA, LIPE, solleciti documenti, F24 dispatch). High judgment share (pareri, contenzioso strategy, valutazioni) = human-led, agent-assisted at most.

---

## 01 — Contabilità e tenuta delle scritture

The volume engine of every studio. For each client in contabilità (ordinaria or semplificata), the studio ingests every economic fact — invoices, bank movements, payroll, cash — and turns it into scritture contabili that feed everything downstream: liquidazioni IVA, dichiarativi, bilancio. This is the area with the highest transaction volume, the most repetitive work, and historically the largest share of collaboratori's time. It is also the area most transformed by e-invoicing: since fatturazione elettronica became universal, the raw data arrives digitally via SDI, shifting work from *data entry* to *data check and classification*.

A structured studio organizes this as a "reparto contabilità" where each collaboratore owns a portfolio of clients (typically 30–80 depending on size/complexity) and runs their full monthly cycle. A solo practitioner does the same cycle personally or with one assistant.

---

#### Acquisizione fatture elettroniche da SDI
- **Cosa**: Periodic import of clients' fatture attive and passive (XML) from SDI into the gestionale, via the studio's massive download channel or per-client delega on Fatture e Corrispettivi. First step of every accounting cycle.
- **Trigger / Frequenza**: Continuous flow; operationally done weekly or monthly per client, always before the liquidazione IVA.
- **Scadenza**: None per se, but must complete in time for the liquidazione IVA of the period.
- **Input**: Delega Fatture e Corrispettivi / servizio di conservazione attivo; client's codice fiscale/P.IVA.
- **Output**: XML invoices staged in the gestionale, ready for registration.
- **Chi**: Collaboratore contabile; setup of deleghe by segreteria.
- **Sistemi toccati**: SDI, Fatture e Corrispettivi, gestionale (hub fatturazione), cassetto fiscale.
- **Tempo**: Minutes per client once deleghe are in place; the pain is exceptions (deleghe scadute, fatture estere mancanti).
- **Natura**: ~95% rule-based. Already semi-automated by gestionali; a pure pipeline activity.

#### Registrazione fatture passive (ciclo passivo)
- **Cosa**: Classifying and posting each purchase invoice: assigning conto di costo, verifying IVA treatment (detraibilità piena/parziale/indetraibile, reverse charge, split payment), competenza, eventual cespite recognition. The gestionale proposes registrations from the XML; the collaboratore validates and corrects.
- **Trigger / Frequenza**: Monthly (or more often) per client, driven by the liquidazione IVA calendar.
- **Scadenza**: Registration within the liquidazione of the period; detrazione IVA rules constrain timing.
- **Input**: XML fatture from SDI; client context (activity type, pro-rata, contracts) to classify correctly.
- **Output**: Registrazioni in prima nota / registri IVA acquisti.
- **Chi**: Collaboratore contabile; dubbi escalated to titolare.
- **Sistemi toccati**: Gestionale, SDI/F&C.
- **Tempo**: From 30 min to several hours per client per month depending on volume (10 vs 1.000 fatture).
- **Natura**: ~80% rule-based (classification patterns repeat per supplier); 20% judgment (deducibilità, competenza, casi nuovi). Prime ML/agent territory: suggest-and-confirm classification.

#### Registrazione fatture attive (ciclo attivo)
- **Cosa**: Posting the client's issued invoices to registri IVA vendite. For clients who invoice from the studio's tools it is nearly automatic; for clients with own ERP it is import + squadratura (checking totals against the client's records).
- **Trigger / Frequenza**: Monthly per client, before liquidazione IVA.
- **Scadenza**: Within the period's liquidazione; fatture must be emitted within 12 days of operation (immediate) or the 15th of the following month (differita) — the studio often polices this.
- **Input**: XML fatture attive from SDI.
- **Output**: Registrazioni in registro IVA vendite.
- **Chi**: Collaboratore contabile.
- **Sistemi toccati**: Gestionale, SDI/F&C.
- **Tempo**: Usually faster than the passive cycle; volume-dependent.
- **Natura**: ~90% rule-based.

#### Registrazione corrispettivi
- **Cosa**: For retail/B2C clients, importing corrispettivi telematici (daily takings transmitted by the registratore telematico to AdE) and posting them, reconciling POS/cash figures.
- **Trigger / Frequenza**: Monthly per retail client.
- **Scadenza**: Within the period's liquidazione IVA.
- **Input**: Corrispettivi from F&C portal / gestionale import; client's till summaries.
- **Output**: Registrazioni corrispettivi in contabilità.
- **Chi**: Collaboratore contabile.
- **Sistemi toccati**: Fatture e Corrispettivi, gestionale.
- **Tempo**: 15–60 min per client per month; exceptions when the RT misfires (mancata trasmissione, fuori servizio).
- **Natura**: ~90% rule-based.

#### Prima nota di cassa e movimenti extra-fattura
- **Cosa**: Posting economic facts not carried by an invoice: cash movements, salaries paid, taxes paid, rents, insurance, loan installments, F24 payments, TFR, competenze bancarie.
- **Trigger / Frequenza**: Monthly per client in ordinaria; lighter in semplificata.
- **Scadenza**: Before periodic closings and year-end.
- **Input**: Estratti conto, contabili bancarie, prospetti paghe, quietanze F24, contracts — largely **chased from the client** (see area 09).
- **Output**: Scritture di prima nota.
- **Chi**: Collaboratore contabile.
- **Sistemi toccati**: Gestionale; input documents arrive by email/portale studio/paper.
- **Tempo**: 30 min–3 h per client per month.
- **Natura**: ~75% rule-based; the friction is input collection, not posting logic.

#### Acquisizione e riconciliazione banche
- **Cosa**: Importing bank statements (CBI/XML/CSV/PDF) and reconciling every movement against registrazioni: matching incassi to fatture attive, pagamenti to fatture passive, identifying unexplained movements to query the client about.
- **Trigger / Frequenza**: Monthly or quarterly per client in ordinaria; mandatory precision at year-end.
- **Scadenza**: Soft during the year; hard at bilancio time (saldi banca must square to the cent).
- **Input**: Estratti conto (ideally via open banking/CBI feeds into the gestionale; often PDFs from the client).
- **Output**: Conti banca riconciliati; list of movimenti da chiarire sent to client.
- **Chi**: Collaboratore contabile.
- **Sistemi toccati**: Gestionale (riconciliazione module), home banking/CBI, open banking (PSD2) connectors where adopted.
- **Tempo**: 30 min–4 h per client per month; matching quality of the tooling dominates.
- **Natura**: ~85% rule-based matching + a tail of investigation. Classic automation target (auto-matching), already partially served by gestionali, still a major time sink.

#### Registrazione costi del personale
- **Cosa**: Posting monthly payroll data received from the consulente del lavoro (or internal paghe dept): salari lordi, contributi, ritenute, TFR maturato, INAIL. Boundary point with the paghe world (out of scope here).
- **Trigger / Frequenza**: Monthly, upon receipt of the riepilogo contabile paghe.
- **Scadenza**: Before the month's F24 (16th) for ritenute/contributi coherence; before closings.
- **Input**: Prospetto contabile from the payroll provider (often a standardized export).
- **Output**: Scritture costo del personale; F24 sections fed if the studio also transmits.
- **Chi**: Collaboratore contabile.
- **Sistemi toccati**: Gestionale; import files from payroll software (Zucchetti paghe, TeamSystem paghe…).
- **Tempo**: 10–40 min per client per month.
- **Natura**: ~95% rule-based when the import mapping exists.

#### Liquidazione IVA periodica
- **Cosa**: The monthly/quarterly ritual: close the period's registrazioni, compute IVA a debito vs a credito, apply crediti riportati e compensazioni, produce the prospetto di liquidazione and the resulting F24 (codice tributo 60xx). The single most rhythmic activity of the studio.
- **Trigger / Frequenza**: Monthly (by the 16th of the following month) or quarterly (16th of the second month after the quarter, with 1% interest) depending on the client's regime.
- **Scadenza**: F24 by the 16th; the liquidazione data also feeds the quarterly LIPE (see area 02).
- **Input**: All registrazioni of the period complete (the deadline that drives everything upstream).
- **Output**: Prospetto di liquidazione, F24 (sent for payment or transmitted via Entratel with addebito), communication to client of the amount due.
- **Chi**: Collaboratore contabile prepares; titolare or senior often eyeballs anomalies (credito anomalo, salto di volume).
- **Sistemi toccati**: Gestionale, Entratel (F24 telematici), client communication channel.
- **Tempo**: 15–45 min per client per period, plus the communication loop.
- **Natura**: ~90% rule-based computation + a thin judgment layer on anomalies. Top-tier automation candidate end-to-end (compute → F24 → notify → confirm payment).

#### Tenuta registri IVA e libro giornale
- **Cosa**: Maintaining, printing/archiving the registri IVA (acquisti, vendite, corrispettivi) and libro giornale; assolvimento of imposta di bollo on libro giornale/inventari; annual stampa (or conservazione digitale) within 3 months of the dichiarazione deadline.
- **Trigger / Frequenza**: Continuous by-product of registrazione; formal finalization annually.
- **Scadenza**: Stampa/conservazione entro 3 mesi dal termine di presentazione della dichiarazione dei redditi.
- **Input**: Registrazioni definitive dell'anno.
- **Output**: Registri stampati or sent to conservazione digitale a norma.
- **Chi**: Collaboratore contabile / segreteria; conservazione often via the software house's service.
- **Sistemi toccati**: Gestionale, servizio di conservazione a norma.
- **Tempo**: Low per client; batch job across the whole portfolio.
- **Natura**: ~99% rule-based. Pure batch automation.

#### Gestione cespiti e ammortamenti
- **Cosa**: Maintaining the registro beni ammortizzabili: recognizing new cespiti from purchase invoices, choosing categoria e aliquota, computing ammortamenti (civilistici and fiscali), handling dismissioni, plusvalenze/minusvalenze, super/iper-agevolazioni when applicable.
- **Trigger / Frequenza**: Recognition at purchase; computation at year-end (and infra-annual for situazioni).
- **Scadenza**: Bilancio/dichiarazione timeline.
- **Input**: Fatture d'acquisto flagged as cespiti; existing registro cespiti.
- **Output**: Piano ammortamenti, scritture di ammortamento, registro aggiornato.
- **Chi**: Collaboratore contabile; aliquota choices reviewed by senior.
- **Sistemi toccati**: Gestionale (modulo cespiti).
- **Tempo**: Concentrated at year-end; 15 min–2 h per client.
- **Natura**: ~85% rule-based (tabelle ministeriali); judgment on classification and agevolazioni.

#### Scritture di assestamento e situazioni periodiche
- **Cosa**: Ratei, risconti, fatture da emettere/ricevere, rimanenze provvisorie, accantonamenti — posted to produce a correct situazione economico-patrimoniale infra-annuale, typically for the client's management, banks (fidi), or acconti recalculation.
- **Trigger / Frequenza**: On request or scheduled (trimestrale/semestrale for structured clients); universally at year-end (see area 03).
- **Scadenza**: Driven by the requesting party (bank deadline, CdA).
- **Input**: Contabilità aggiornata + client-provided estimates (rimanenze, lavori in corso).
- **Output**: Situazione contabile (bilancino di verifica riclassificato) delivered to client/bank.
- **Chi**: Collaboratore prepares, titolare reviews and comments.
- **Sistemi toccati**: Gestionale, Excel (the eternal riclassificazione layer), email/PDF out.
- **Tempo**: 1–4 h per situazione.
- **Natura**: ~70% rule-based; the commentary and estimates are judgment.

#### Contabilità semplificata e regime forfettario
- **Cosa**: Lighter cycles for minor clients. Semplificata: registri IVA + incassi/pagamenti (regime di cassa), no stato patrimoniale. Forfettari: no IVA, no registri obbligatori — the studio mainly tracks incassi (fatture elettroniche), monitors the €85k threshold, and computes imposta sostitutiva and contributi. High client count, low per-client effort.
- **Trigger / Frequenza**: Monthly/quarterly light touch; heavy only at dichiarazione time.
- **Scadenza**: Same fiscal calendar as everyone (acconti/saldi, dichiarazione).
- **Input**: Fatture from SDI; incassi confirmation from client.
- **Output**: Quadro LM ready data; threshold alerts; contributi INPS gestione separata/artigiani computations.
- **Chi**: Junior collaboratore; often the entry-level portfolio.
- **Sistemi toccati**: F&C/SDI, gestionale, INPS portal (cassetto previdenziale).
- **Tempo**: Minutes per client per month; bulk effect from client count.
- **Natura**: ~90% rule-based. The forfettari segment is the most standardizable client base in the studio — natural first target for full automation.

#### Conservazione digitale a norma
- **Cosa**: Ensuring fatture elettroniche, registri, libri and dichiarazioni are preserved per CAD requirements (conservazione sostitutiva), either via AdE's free service (fatture) or the software house's accredited service.
- **Trigger / Frequenza**: Setup once per client, then automatic; annual verification.
- **Scadenza**: Conservazione entro 3 mesi dal termine dichiarazione.
- **Input**: Document flows already in the systems.
- **Output**: Pacchetti di conservazione with legal validity.
- **Chi**: Segreteria/collaboratore with software house support.
- **Sistemi toccati**: F&C (servizio conservazione AdE), servizio conservazione del gestionale.
- **Tempo**: Near-zero when running; painful only on setup/migration.
- **Natura**: ~100% rule-based infrastructure.

---

### Automation notes for this area

- The whole area is a **pipeline**: SDI/banche in → classify → post → liquidate → F24 out. Every step has structured data and clear rules; the residual human value is exception handling and client-specific classification memory.
- The single biggest recurring friction is **input che mancano**: bank statements, incassi confirmations, cash data. That is a client-communication problem (area 09) wearing an accounting costume.
- Gestionali already automate 40–70% of this; the gap an Agent can close is the **long tail of exceptions + the cross-system glue** (delega management, squadrature, anomaly triage, client chase).

---

## 02 — Adempimenti dichiarativi e fiscali ricorrenti

The compliance core: everything the studio must produce and transmit to the Agenzia delle Entrate (and other enti) on fixed deadlines, for every client, every year. This is the area that defines the profession's calendar and its stress peaks (see area 10). Almost every activity here ends with a **telematic transmission via Entratel** and the management of its **ricevute** — a uniform digital surface that makes this area extremely relevant for automation.

Note: all deadlines below are the "typical" ones; proroghe are an annual national sport and must be re-verified each year.

---

#### Comunicazione liquidazioni periodiche IVA (LIPE)
- **Cosa**: Quarterly communication to AdE of the outcome of the period's liquidazioni IVA (debito/credito per month).
- **Trigger / Frequenza**: Quarterly.
- **Scadenza**: Typically 31/5, 30/9, 30/11; Q4 by 28/2 or absorbed into the dichiarazione IVA annuale.
- **Input**: Liquidazioni already computed (area 01) — the LIPE is a pure re-packaging.
- **Output**: XML LIPE transmitted via Entratel; ricevuta archived.
- **Chi**: Collaboratore contabile; batch-transmitted for the whole portfolio.
- **Sistemi toccati**: Gestionale, Entratel/Desktop Telematico.
- **Tempo**: Minutes per client; the studio-level job is the batch check ("all clients present? anomalies?").
- **Natura**: ~98% rule-based. Fully automatable end-to-end.

#### Dichiarazione IVA annuale
- **Cosa**: The annual IVA return: yearly recap of operazioni attive/passive, liquidazioni, credito/debito annuale, rimborsi, pro-rata, plafond esportatori. More substantive than the LIPE: option elections and credit management happen here.
- **Trigger / Frequenza**: Annual, per every soggetto IVA.
- **Scadenza**: Presentation window 1/2–30/4; saldo IVA by 16/3 (rateizzabile or deferrable to 30/6 with interest).
- **Input**: Full year's registri IVA and liquidazioni; prior-year credit; export/plafond data.
- **Output**: Modello IVA transmitted via Entratel; eventual richiesta di rimborso or credito in compensazione (with visto di conformità above thresholds).
- **Chi**: Collaboratore prepares; titolare reviews credits/refunds and signs the visto di conformità where needed.
- **Sistemi toccati**: Gestionale, Entratel, cassetto fiscale.
- **Tempo**: 30 min–3 h per client; more with rimborsi/pro-rata.
- **Natura**: ~85% rule-based; judgment on rimborso vs compensazione strategy, pro-rata, plafond.

#### Dati operazioni transfrontaliere ("esterometro")
- **Cosa**: Transmission of cross-border operations not passing through SDI: now done by generating XML fatture (TD17/TD18/TD19 for autofatture/integrazioni on foreign purchases) sent to SDI within deadlines.
- **Trigger / Frequenza**: Per operation, in practice batched monthly for clients with foreign flows.
- **Scadenza**: For acquisti: by the 15th of the month following receipt of the foreign invoice.
- **Input**: Foreign supplier invoices from the client (a chasing pain: they don't pass through SDI).
- **Output**: Autofatture/integrazioni XML to SDI; corresponding reverse charge registrazioni.
- **Chi**: Collaboratore contabile.
- **Sistemi toccati**: SDI, gestionale.
- **Tempo**: Minutes per document; the friction is obtaining the foreign documents.
- **Natura**: ~90% rule-based once the document is in hand.

#### Modelli Intrastat
- **Cosa**: Statistical/fiscal lists of intra-EU cessioni/acquisti of goods and services for clients above thresholds.
- **Trigger / Frequenza**: Monthly or quarterly per client depending on volumes.
- **Scadenza**: 25th of the month following the period.
- **Input**: Intra-EU invoices, Nomenclature combinate classification, weights/values.
- **Output**: Elenchi Intrastat transmitted (Agenzia Dogane channel or Entratel).
- **Chi**: Collaboratore with the specific competence (not everyone in the studio knows Intrastat).
- **Sistemi toccati**: Gestionale, servizio telematico doganale/Entratel.
- **Tempo**: 15 min–2 h per client per period.
- **Natura**: ~85% rule-based; classification (nomenclatura) is the judgment slice.

#### Certificazione Unica (CU)
- **Cosa**: Annual certification of compensi paid with ritenuta: employees (usually from paghe world), but for the studio's typical scope, **lavoratori autonomi, provvigioni, locazioni brevi** — one CU per percipiente per sostituto d'imposta client.
- **Trigger / Frequenza**: Annual, per client who acted as sostituto d'imposta.
- **Scadenza**: Historically 16/3 for transmission and consegna (deadlines for autonomi have been shifted around recent years — verify current year).
- **Input**: Registrazioni compensi/ritenute of the year; anagrafiche percipienti.
- **Output**: CU XML batch via Entratel; PDF copies delivered to percipienti; feeds the 770.
- **Chi**: Collaboratore contabile; segreteria handles distribution.
- **Sistemi toccati**: Gestionale, Entratel, email/portale for delivery.
- **Tempo**: Minutes per CU, but March volume is brutal (hundreds across the portfolio).
- **Natura**: ~95% rule-based. Prime batch-automation target.

#### Modello 770
- **Cosa**: The sostituto d'imposta's annual return: recap of all ritenute operate e versate (autonomi, dipendenti, capitali), quadrature against F24 payments and CU.
- **Trigger / Frequenza**: Annual.
- **Scadenza**: 31/10.
- **Input**: CU transmitted, F24 versamenti (codici 1040 etc.), registrazioni ritenute.
- **Output**: 770 via Entratel; ricevuta.
- **Chi**: Collaboratore; quadrature reviewed by senior.
- **Sistemi toccati**: Gestionale, Entratel, cassetto fiscale (riscontro versamenti).
- **Tempo**: 30 min–2 h per client; the pain is squaring mismatches (ravvedimenti, compensazioni).
- **Natura**: ~90% rule-based; mismatch resolution is investigative.

#### Dichiarazione dei redditi — Persone Fisiche (Modello Redditi PF)
- **Cosa**: Income tax return for imprenditori individuali, professionisti, forfettari, soci, and privati with complexity (RW, capital gains, immobili). Includes quadri d'impresa (RF/RG/RE), LM for forfettari, RW for foreign assets, capital income quadri.
- **Trigger / Frequenza**: Annual, per PF client.
- **Scadenza**: Telematic filing by 31/10 (current regime); versamenti saldo+1° acconto 30/6 (or 30/7 +0,4%), 2° acconto 30/11.
- **Input**: Contabilità (for imprese/professionisti), CU received, spese detraibili/deducibili documentation, visure, foreign asset statements, precompilata data from cassetto fiscale.
- **Output**: Modello Redditi via Entratel; prospetto imposte for the client; F24s.
- **Chi**: Collaboratore prepares, titolare reviews; the summer is consumed by this.
- **Sistemi toccati**: Gestionale (modulo dichiarativi), Entratel, cassetto fiscale (precompilata/dati), client document channel.
- **Tempo**: 1–4 h per return (simple) to full days (complex RW/participations).
- **Natura**: ~75% rule-based; document interpretation and optimization choices are judgment.

#### Modello 730
- **Cosa**: The simplified return for dipendenti/pensionati (rimborso in busta paga). Studios handle these for owners' families, employees of clients, and as a service; heavy precompilata leverage.
- **Trigger / Frequenza**: Annual, campaign April–September.
- **Scadenza**: 30/9 transmission.
- **Input**: Precompilata (via delega), CU, spese detraibili (mediche via Sistema TS, mutui, ristrutturazioni…).
- **Output**: 730 transmitted; esito to sostituto for conguaglio.
- **Chi**: Junior collaboratore/segreteria with review; very process-like.
- **Sistemi toccati**: Entratel/portale AdE (precompilata), gestionale.
- **Tempo**: 30 min–1.5 h per return.
- **Natura**: ~85% rule-based; precompilata already automates much — the residual is document checking.

#### Dichiarazione Redditi Società di Persone (SP) e Società di Capitali (SC) + IRAP
- **Cosa**: Corporate returns: from bilancio/contabilità to imponibile via variazioni in aumento/diminuzione (quadro RF), ACE, perdite pregresse, società di comodo checks, ROL/interessi passivi, then IRES/IRAP computation. SP adds the imputazione per trasparenza ai soci (feeding their PF returns).
- **Trigger / Frequenza**: Annual per società client.
- **Scadenza**: Filing by last day of the 10th month after year-end (31/10 for solar years); versamenti last day of 6th month (30/6) or with 0,4%.
- **Input**: Bilancio approvato (area 03), registri, prior returns, F24 history.
- **Output**: Redditi SC/SP + IRAP via Entratel; prospetti imposte; F24; deferred tax data back into bilancio.
- **Chi**: Senior collaboratore/titolare — the highest-competence dichiarativo.
- **Sistemi toccati**: Gestionale dichiarativi, Entratel, cassetto fiscale.
- **Tempo**: 2 h–2 days per client.
- **Natura**: ~70% rule-based; variazioni fiscali and elective options carry real judgment.

#### ISA (Indici Sintetici di Affidabilità)
- **Cosa**: Compiling the ISA model attached to Redditi for imprese/professionisti: activity-specific data (personnel, magazzino, superfici…), computing the pagella (voto 1–10), evaluating adeguamento to reach premiali thresholds.
- **Trigger / Frequenza**: Annual, within the Redditi cycle.
- **Scadenza**: With the dichiarazione.
- **Input**: Contabilità + extra-contabili data requested from the client (questionnaire-like).
- **Output**: ISA quadro transmitted; discussion with client on adeguamento (pay a bit more to be "affidabile").
- **Chi**: Collaboratore + titolare for the adeguamento conversation.
- **Sistemi toccati**: Gestionale, software ISA (AdE engine embedded), Entratel.
- **Tempo**: 30 min–2 h per client, plus client data chase.
- **Natura**: ~80% rule-based; the adeguamento decision is a classic advisory moment.

#### Calcolo imposte, acconti e predisposizione/invio F24
- **Cosa**: The cross-cutting payment machine: computing saldi and acconti (metodo storico vs previsionale), building F24s (imposte, IVA, ritenute, contributi INPS, IMU, diritto camerale), managing compensazioni orizzontali (with visto rules and F24 a zero obligations), transmitting via Entratel (addebito on client IBAN) or sending to the client/bank, then verifying esiti.
- **Trigger / Frequenza**: Continuous; peaks on the 16th of every month and 30/6–30/11.
- **Scadenza**: Every F24 has one; missing it triggers ravvedimento.
- **Input**: Liquidazioni, dichiarativi, payroll F24 data, client's choice on previsionale.
- **Output**: F24 transmitted/delivered; quietanze archived; client notified of amounts.
- **Chi**: Collaboratore/segreteria for mechanics; titolare for previsionale decisions.
- **Sistemi toccati**: Entratel (F24 telematici), home banking, gestionale scadenzario, client communication.
- **Tempo**: Studio-wide, days per month aggregated; per-F24 minutes.
- **Natura**: ~90% rule-based; previsionale is judgment. The **notify → confirm → pay → verify** loop is a top automation target.

#### Gestione ravvedimento operoso
- **Cosa**: Fixing missed/insufficient payments: computing sanzioni ridotte and interessi by delay bracket, producing the corrective F24 with codici tributo for sanzioni/interessi.
- **Trigger / Frequenza**: On occurrence — a normal by-product of clients paying late.
- **Scadenza**: The sooner the cheaper (sanzione scales with delay).
- **Input**: Original due amount and date, payment date.
- **Output**: Ravvedimento F24; note in client file.
- **Chi**: Collaboratore.
- **Sistemi toccati**: Gestionale/calcolatori, Entratel.
- **Tempo**: 10–30 min per case.
- **Natura**: ~98% rule-based. Trivially automatable.

#### IMU: calcoli, versamenti e dichiarazioni
- **Cosa**: Computing IMU per immobile per client (rendite, aliquote comunali, pertinenze, esenzioni), producing the two annual F24s, and filing the dichiarazione IMU when conditions change.
- **Trigger / Frequenza**: Twice yearly (acconto/saldo) + event-driven dichiarazione.
- **Scadenza**: 16/6 and 16/12; dichiarazione IMU by 30/6 of the following year.
- **Input**: Visure catastali, atti (acquisti/vendite), delibere comunali (aliquote from MEF portal).
- **Output**: Prospetti IMU + F24; dichiarazione IMU telematica when needed.
- **Chi**: Collaboratore/segreteria; a classic "servizio ai privati".
- **Sistemi toccati**: Catasto (SISTER/visure), MEF aliquote database, gestionale, Entratel.
- **Tempo**: 10–40 min per client per round.
- **Natura**: ~90% rule-based; comune-level rule lookup is the annoying part (perfect MCP candidate).

#### Diritto camerale annuale
- **Cosa**: Computing and paying the annual CCIAA fee for every impresa iscritta.
- **Trigger / Frequenza**: Annual.
- **Scadenza**: With the first acconto imposte (30/6).
- **Input**: Fatturato/sede data; CCIAA rates.
- **Output**: F24 (codice 3850).
- **Chi**: Collaboratore/segreteria, batched.
- **Sistemi toccati**: Gestionale, Entratel.
- **Tempo**: Minutes; batch job.
- **Natura**: ~100% rule-based.

#### Imposta di bollo su fatture elettroniche
- **Cosa**: Quarterly verification and payment of virtual bollo (€2 on fatture without IVA above €77,47); AdE pre-computes Elenco A/B on F&C, the studio validates the integrative list.
- **Trigger / Frequenza**: Quarterly.
- **Scadenza**: End of second month after quarter (with threshold-based deferrals for small amounts).
- **Input**: Elenchi from F&C; fatture emitted.
- **Output**: Confirmation on F&C + F24/addebito payment.
- **Chi**: Collaboratore/segreteria.
- **Sistemi toccati**: Fatture e Corrispettivi, Entratel.
- **Tempo**: Minutes per client.
- **Natura**: ~95% rule-based.

#### Dichiarazioni d'intento (esportatori abituali)
- **Cosa**: For clients qualifying as esportatori abituali: computing the plafond, transmitting dichiarazioni d'intento to suppliers via AdE, and on the mirror side checking received dichiarazioni before invoicing senza IVA.
- **Trigger / Frequenza**: Annual/per-supplier, monitored continuously against plafond consumption.
- **Scadenza**: Before the relevant operations.
- **Input**: Export volumes (plafond fisso/mobile), supplier list.
- **Output**: Dichiarazioni d'intento telematiche; plafond monitoring prospetto.
- **Chi**: Collaboratore with IVA expertise.
- **Sistemi toccati**: Entratel/F&C, gestionale.
- **Tempo**: Concentrated in January; monitoring is periodic.
- **Natura**: ~85% rule-based; plafond monitoring is a natural automated watchdog.

#### Trasmissione dati Sistema Tessera Sanitaria
- **Cosa**: For healthcare-sector clients (medici, farmacie, ottici…): transmitting patients' spesa sanitaria data to Sistema TS for the precompilata.
- **Trigger / Frequenza**: Annual (recently unified; historically semestral).
- **Scadenza**: Typically end of January for the prior year (verify current regime).
- **Input**: Fatture/incassi data of the sanitario client.
- **Output**: Flusso XML to Sistema TS; ricevute.
- **Chi**: Collaboratore/segreteria.
- **Sistemi toccati**: Sistema TS portal, gestionale.
- **Tempo**: Minutes–1 h per client.
- **Natura**: ~95% rule-based.

#### Gestione ricevute telematiche e presidio del canale Entratel
- **Cosa**: The meta-activity: every transmission above returns a ricevuta (accolta/scartata). The studio must download, check, archive ricevute and re-transmit scarti within grace windows. A silent but critical control loop — an unnoticed scarto equals an omessa dichiarazione.
- **Trigger / Frequenza**: After every batch transmission; daily presidio in peak seasons.
- **Scadenza**: Scarti typically re-transmittable within 5 days keeping the original date.
- **Input**: Entratel ricevute files.
- **Output**: Archived ricevute linked to client files; re-transmissions; anomaly alerts.
- **Chi**: Segreteria/collaboratore designated as "responsabile invii".
- **Sistemi toccati**: Entratel/Desktop Telematico, gestionale document archive.
- **Tempo**: Diffuse; spikes after mass deadlines.
- **Natura**: ~95% rule-based monitoring. Ideal always-on agent watchdog.

---

### Automation notes for this area

- Uniform pattern across nearly every card: **gather data → compile modello → transmit via Entratel → check ricevuta → archive → notify client**. One pipeline abstraction covers a dozen adempimenti.
- The **scadenzario is the orchestrator** (see area 08): every activity here exists as rows of "client × adempimento × deadline × status". This is the natural data model for an agent's work queue.
- Highest-value watchdogs: ricevute/scarti monitoring, plafond esportatori, F24 payment confirmation, threshold monitoring for forfettari.

---

## 03 — Bilancio d'esercizio

The annual closing of the books for società di capitali (and, in lighter form, for everyone else): turning a year of contabilità into the bilancio d'esercizio per OIC standards, getting it approved by the assemblea, and depositing it at the Registro delle Imprese. For the studio this is a **season** (roughly February–June for solar-year companies) with a fixed choreography per client. The bilancio is also the substrate of the corporate dichiarativi (area 02) and the studio's main "product" perceived by banks and third parties.

Size note: most clients file in **forma abbreviata** or **micro** (reduced schemas, no relazione sulla gestione); ordinary form and consolidato appear only in structured studios' larger clients.

---

#### Pre-chiusura e pianificazione di fine anno
- **Cosa**: In November–December, a first pass on the year's numbers per client: projected utile, imposte forecast, and the last legal levers before year-end (compensi amministratori, TFM accruals, acquisti di cespiti for agevolazioni, dividendi, welfare). Where consulenza (area 04) meets closing mechanics.
- **Trigger / Frequenza**: Annual, Q4.
- **Scadenza**: Before 31/12 — the levers die with the year.
- **Input**: Situazione contabile at month 9–10; conversations with the client on expected year-end.
- **Output**: Pre-closing memo/call with client; decisions to execute (delibere compensi, investments).
- **Chi**: Titolare with senior collaboratore.
- **Sistemi toccati**: Gestionale, Excel, meeting.
- **Tempo**: 1–3 h per significant client.
- **Natura**: ~40% rule-based; mostly judgment. Agent role: prepare the projection pack automatically.

#### Scritture di assestamento e chiusura
- **Cosa**: The full year-end adjustment set: ratei/risconti, fatture da emettere/ricevere, TFR, accantonamenti fondi rischi, svalutazione crediti, ammortamenti (from area 01 cespiti), rimanenze finali, capitalizzazioni, contributi in conto impianti, and the chiusura dei conti.
- **Trigger / Frequenza**: Annual per client, Jan–Apr.
- **Scadenza**: In time for the approval chain (bozza → assemblea entro 120 gg → deposito).
- **Input**: Contabilità completa e riconciliata (banks squared!), inventario/rimanenze from client, TFR/paghe data, contracts.
- **Output**: Bilancio di verifica post-assestamento; the closing scritture.
- **Chi**: Collaboratore owns the mechanics; senior/titolare validates estimates (fondi, svalutazioni).
- **Sistemi toccati**: Gestionale.
- **Tempo**: Half day–2 days per client.
- **Natura**: ~70% rule-based; the estimates (svalutazioni, fondi, rimanenze valuation) are judgment governed by OIC.

#### Valutazioni civilistiche (OIC)
- **Cosa**: Applying valuation standards to the delicate items: rimanenze (costo/mercato), crediti (presumibile realizzo, fondo svalutazione), partecipazioni, lavori in corso su ordinazione, imposte differite/anticipate, continuità aziendale assessment.
- **Trigger / Frequenza**: Annual, inside the closing.
- **Scadenza**: With the bilancio.
- **Input**: Client data + prior-year policies (coerenza dei criteri).
- **Output**: Valuation decisions embedded in scritture + disclosed in nota integrativa.
- **Chi**: Titolare/senior — this is where professional responsibility concentrates.
- **Sistemi toccati**: Gestionale, Excel.
- **Tempo**: Inside the closing effort; can dominate it for problematic clients.
- **Natura**: ~40% rule-based. Low automatability; high assist value (checklists, prior-year coherence checks).

#### Calcolo imposte di competenza e fiscalità differita
- **Cosa**: Computing IRES/IRAP of the year (bridging civilistico→fiscale with variazioni), plus imposte anticipate/differite on temporary differences; posting them into the closing bilancio. Circular with the Redditi SC work (area 02).
- **Trigger / Frequenza**: Annual, at closing.
- **Scadenza**: Bilancio timeline (imposte must be in the approved bilancio).
- **Input**: Pre-tax result, variazioni fiscali, perdite pregresse, ACE.
- **Output**: Scritture imposte; prospetto fiscalità differita for nota integrativa.
- **Chi**: Senior collaboratore/titolare.
- **Sistemi toccati**: Gestionale (simulatore imposte), Excel.
- **Tempo**: 1–4 h per client.
- **Natura**: ~75% rule-based given the inputs.

#### Redazione degli schemi di bilancio
- **Cosa**: Producing Stato Patrimoniale and Conto Economico per art. 2424/2425 c.c. in the correct form (ordinaria/abbreviata/micro), plus Rendiconto Finanziario where required. Mostly automatic riclassificazione from the piano dei conti; manual attention to comparatives and reclassifications.
- **Trigger / Frequenza**: Annual per società.
- **Scadenza**: Draft ready for the approval chain.
- **Input**: Closed contabilità.
- **Output**: Schemi di bilancio (draft PDF for client, then definitive).
- **Chi**: Collaboratore; review titolare.
- **Sistemi toccati**: Gestionale (modulo bilancio).
- **Tempo**: 1–3 h per client if the mapping is clean.
- **Natura**: ~90% rule-based.

#### Nota integrativa
- **Cosa**: Drafting the narrative+tables companion: criteri di valutazione, movimenti of immobilizzazioni/patrimonio netto/fondi, debiti detail, impegni, fatti di rilievo, proposta di destinazione dell'utile. Gestionali generate a skeleton from the numbers; the studio customizes the prose.
- **Trigger / Frequenza**: Annual per società (micro-imprese are exempt under conditions).
- **Scadenza**: With the bilancio for approval.
- **Input**: Schemi + closing detail + events of the year.
- **Output**: Nota integrativa (XBRL-embeddable).
- **Chi**: Collaboratore drafts from template; titolare edits the judgmental disclosures.
- **Sistemi toccati**: Gestionale (nota integrativa generator), Word.
- **Tempo**: 1–4 h per client.
- **Natura**: ~70% rule-based/template; classic LLM-assist target (draft the custom prose from the numbers and the year's events).

#### Fascicolo di bilancio e tassonomia XBRL
- **Cosa**: Assembling the deposit package: bilancio in XBRL (tassonomia XBRL Italia), nota integrativa embedded, verbale di approvazione, eventual relazioni (sindaci/revisore). Validating the XBRL instance.
- **Trigger / Frequenza**: Annual per società.
- **Scadenza**: Deposit within 30 days of approval.
- **Input**: Approved bilancio + verbale.
- **Output**: Validated XBRL + PDF/A attachments ready for Telemaco/DIRE.
- **Chi**: Collaboratore/segreteria societaria.
- **Sistemi toccati**: Gestionale (XBRL engine), strumenti di validazione, DIRE/Telemaco.
- **Tempo**: 30 min–1.5 h per client.
- **Natura**: ~95% rule-based.

#### Convocazione assemblea e verbale di approvazione
- **Cosa**: Orchestrating the approval formality: convocazione (or totalitaria in practice for small srl), drafting the verbale di assemblea (approvazione bilancio, destinazione utile/copertura perdite, eventual compensi), updating libro verbali. Includes monitoring the 120-day term (180 with justified reasons) and the perdite rilevanti scenarios (art. 2446/2447 c.c.).
- **Trigger / Frequenza**: Annual per società; extra assemblee on events.
- **Scadenza**: Approvazione entro 120 giorni dalla chiusura (tipicamente 30/4).
- **Input**: Final bilancio; soci data; decisions on utile.
- **Output**: Verbale signed and archived in libri sociali; inputs to deposito.
- **Chi**: Segreteria societaria drafts from template; titolare handles the client conversation.
- **Sistemi toccati**: Templates/Word, libri sociali, firma.
- **Tempo**: 30 min–1 h per client (template-driven) + scheduling friction.
- **Natura**: ~85% rule-based/templated; the destinazione utile and perdite cases carry judgment.

#### Deposito del bilancio al Registro delle Imprese
- **Cosa**: Filing the fascicolo via DIRE/Telemaco with pratica fees and firma digitale; monitoring esiti (protocollo, sospensioni, richieste di regolarizzazione).
- **Trigger / Frequenza**: Annual per società.
- **Scadenza**: 30 days from approvazione (typically end of May for 30/4 approvals).
- **Input**: Fascicolo XBRL completo.
- **Output**: Bilancio depositato; ricevute archived; client informed.
- **Chi**: Segreteria societaria (a specialized role in structured studios).
- **Sistemi toccati**: DIRE/Telemaco, firma digitale, Registro Imprese.
- **Tempo**: 20–45 min per pratica; batch season.
- **Natura**: ~95% rule-based. Batch automation + esiti watchdog.

#### Situazioni infrannuali e reporting per banche
- **Cosa**: Producing interim bilancini and standard packages for fidi renewal, rating reviews, bandi: situazione riclassificata, indici, sometimes forecast. Recurrent because banks ask every year (and now with Codice della Crisi, adeguati assetti push more periodic monitoring).
- **Trigger / Frequenza**: On bank/client request; semi-scheduled for structured clients.
- **Scadenza**: Bank's deadline.
- **Input**: Updated contabilità + assestamenti light.
- **Output**: PDF package to client/bank; sometimes upload to bank portals.
- **Chi**: Collaboratore + titolare's commentary.
- **Sistemi toccati**: Gestionale, Excel, bank portals.
- **Tempo**: 2–6 h per package.
- **Natura**: ~70% rule-based; strong candidate for templated auto-generation.

#### Bilancio consolidato (structured studios)
- **Cosa**: For groups above thresholds: consolidation area definition, elisioni, uniform policies, consolidated schemas and nota. A niche, high-competence annual exercise.
- **Trigger / Frequenza**: Annual for qualifying groups.
- **Scadenza**: Same approval/deposit chain.
- **Input**: Bilanci of all group companies, intercompany detail.
- **Output**: Bilancio consolidato deposited.
- **Chi**: Senior/titolare with specific expertise.
- **Sistemi toccati**: Gestionale consolidation module/Excel, DIRE.
- **Tempo**: Days.
- **Natura**: ~60% rule-based.

---

### Automation notes for this area

- The area is a **fixed per-client choreography**: chiusura → schemi → nota → verbale → XBRL → deposito. It is trackable as a pipeline with states — ideal for a season-management agent (who is at which stage, what's blocking, which 120-day terms are at risk).
- Judgment concentrates in **valuations and the pre-closing advisory**; mechanics (schemi, XBRL, verbali, depositi) are template/batch work.
- LLM sweet spot: **nota integrativa prose drafting** and **bank package commentary** from structured numbers.

---

## 04 — Consulenza fiscale e d'impresa

Where the profession's perceived value (and pricing power) lives. Unlike areas 01–03, activities here are mostly **event-driven or advisory**, with judgment dominating mechanics. Yet each has a recognizable structure: gather facts → apply norms/prassi → produce a recommendation or an election. The commercialista's edge is knowing the client's full picture (contabilità + storia + patrimonio) — which is exactly the context an agent could assemble automatically.

This area also hosts the "consulenza d'impresa" strand (business plan, controllo di gestione, finanza agevolata) that most studios provide in some measure alongside pure tax advice.

---

#### Scelta e verifica del regime fiscale e contabile
- **Cosa**: For each new or changing client: choosing between forfettario, semplificata, ordinaria; evaluating options (IVA trimestrale, IRI-like elections, trasparenza, consolidato fiscale for groups); verifying yearly that thresholds and requisiti still hold (the forfettario €85k watch, cause ostative).
- **Trigger / Frequenza**: At onboarding + annual re-check + on events (revenue jumps, new participations).
- **Scadenza**: Options often bind at year-start or in dichiarazione; threshold breaches have immediate effects.
- **Input**: Fatturato, cost structure, participations, foreseeable trajectory.
- **Output**: Regime recommendation with numbers (comparison prospetti); elections filed in dichiarazioni.
- **Chi**: Titolare decision, collaboratore prepares comparisons.
- **Sistemi toccati**: Gestionale/simulatori, Excel.
- **Tempo**: 1–2 h per evaluation.
- **Natura**: ~60% rule-based (the comparison math is deterministic; the trajectory forecast is judgment). Great "auto-simulate every client annually" candidate.

#### Tax planning annuale del cliente
- **Cosa**: The recurring optimization conversation, usually in Q4 (see pre-chiusura, area 03) and at dichiarativi time: compensi amministratori vs dividendi, TFM, welfare aziendale, rivalutazioni when available, timing of investments, utilizzo perdite, PEX conditions, assegnazioni.
- **Trigger / Frequenza**: 1–2 structured moments per year per significant client + opportunistic.
- **Scadenza**: Levers tied to year-end or dichiarazione deadlines.
- **Input**: Situazione contabile, client's personal/family picture, liquidity.
- **Output**: Recommendation memo/meeting; execution items (delibere, versamenti).
- **Chi**: Titolare.
- **Sistemi toccati**: Excel/simulatori; meeting.
- **Tempo**: 1–4 h per client.
- **Natura**: ~30% rule-based. Human-led; agent assists with scenario computation.

#### Agevolazioni e crediti d'imposta
- **Cosa**: Monitoring the ever-shifting map of incentives (crediti 4.0/5.0, R&S&I, ZES unica, bonus energia when active, bonus edilizi handling with cessione/sconto rules, patent box regime opzionale), matching them to clients, managing compliance: perizie/certificazioni needed, comunicazioni preventive (GSE/MIMIT), corretta compensazione in F24 with codici and limits, documentation retention for future controls.
- **Trigger / Frequenza**: Continuous monitoring; per-client activation on qualifying investments.
- **Scadenza**: Each measure has its own window of comunicazioni and utilizzo timelines.
- **Input**: Norme e prassi (circolari AdE, FAQ MIMIT/GSE), client investment plans, fatture/perizie.
- **Output**: Eligibility assessments, pratiche/comunicazioni filed, credit utilization plans in F24, fascicolo probatorio.
- **Chi**: Titolare/senior for eligibility; collaboratore for pratiche and F24 mechanics.
- **Sistemi toccati**: GSE/MIMIT portals, Entratel (F24, comunicazioni), gestionale.
- **Tempo**: Highly variable: from 1 h to multi-day dossiers.
- **Natura**: ~50% rule-based. The **norm-watching and client-matching** half is a prime agent use case; eligibility judgment stays human.

#### Pareri e quesiti fiscali spot
- **Cosa**: The daily stream of substantive questions beyond quick chat (see area 09 for the quick ones): tax treatment of an unusual operation, IVA territorialità of a new service, deducibilità of a specific cost structure, treatment of a settlement. Research in banche dati (Eutekne, IPSOA, Il Sole 24 Ore, Memento), drafting a written parere when stakes justify it.
- **Trigger / Frequenza**: Weekly occurrence in any studio; daily in structured ones.
- **Scadenza**: Client's operational timing.
- **Input**: Client facts, norme/prassi/giurisprudenza from banche dati.
- **Output**: Written parere or documented email; sometimes a fee-bearing engagement.
- **Chi**: Titolare/senior; juniors do first research pass.
- **Sistemi toccati**: Banche dati professionali, Word/email.
- **Tempo**: 1 h–2 days.
- **Natura**: ~35% rule-based. RAG-style research assist is the obvious agent contribution.

#### Interpello all'Agenzia delle Entrate
- **Cosa**: When uncertainty is material: drafting and filing an istanza di interpello (ordinario, probatorio, anti-abuso, nuovi investimenti) to get AdE's binding-ish position before executing an operation.
- **Trigger / Frequenza**: Rare (a few per year even in structured studios).
- **Scadenza**: Must precede the behavior; AdE answers in 90 days (silenzio-assenso in some types).
- **Input**: Full fact pattern, normative analysis, the prospective solution proposed.
- **Output**: Istanza filed via PEC/telematico; the response guides the operation.
- **Chi**: Titolare, often with a tax lawyer for big cases.
- **Sistemi toccati**: PEC, AdE channels, banche dati.
- **Tempo**: 1–3 days of drafting.
- **Natura**: ~20% rule-based. Pure expertise; agent assists with precedent research and drafting.

#### IVA speciale e regimi particolari
- **Cosa**: Handling structurally complex IVA: reverse charge domestico (edilizia, subappalti), split payment with PA, OSS/IOSS for e-commerce, margine (beni usati), agricoltura, editoria, operazioni con l'estero e stabile organizzazione questions, note di variazione in procedure.
- **Trigger / Frequenza**: Continuous for clients in affected sectors; advisory spikes on new business models (e-commerce!).
- **Scadenza**: Follows the IVA calendar of each regime (e.g. OSS quarterly returns).
- **Input**: Client's transaction flows and channels (marketplaces, PA, estero).
- **Output**: Correct setup in fatturazione/contabilità; OSS returns filed; advisory notes.
- **Chi**: The studio's "IVA person" (senior); everywhere titolare in small studios.
- **Sistemi toccati**: SDI, portale OSS (AdE), gestionale.
- **Tempo**: Setup hours + recurring returns.
- **Natura**: ~65% rule-based once classified; classification is expertise.

#### Fiscalità internazionale di base e monitoraggio (quadro RW)
- **Cosa**: For clients with foreign assets/income: residenza fiscale assessments, conventions against double taxation, foreign dividends/salaries, crypto-asset monitoring, IVIE/IVAFE, compiling quadro RW; impatriati regime applications.
- **Trigger / Frequenza**: Annual within dichiarativi + event-driven (trasferimenti, incarichi esteri).
- **Scadenza**: With Redditi PF; regime elections have their own windows.
- **Input**: Foreign account statements, broker reports (the crypto/broker CSV nightmare), foreign tax paid evidence.
- **Output**: Quadro RW/RM/RT compiled; credito d'imposta estero computed; advisory notes.
- **Chi**: Senior/titolare; a growing specialization.
- **Sistemi toccati**: Gestionale dichiarativi, broker/exchange exports, banche dati.
- **Tempo**: 1 h–days per client (broker report parsing dominates).
- **Natura**: ~60% rule-based; **broker/exchange report parsing into RW/RT is a screaming automation need**.

#### Passaggio generazionale e pianificazione patrimoniale
- **Cosa**: Structuring family wealth transitions: donazioni di quote, patti di famiglia, holding di famiglia, usufrutto/nuda proprietà schemes, trust basics, imposta di successione/donazione planning; coordination with notaio.
- **Trigger / Frequenza**: Event-driven; a handful of engagements per year, high value.
- **Scadenza**: Family/asset timing; some exemptions have holding-period conditions.
- **Input**: Family map, asset inventory, valuations (area 07).
- **Output**: Structure design memo; execution via notaio; dichiarazione di successione when someone dies (a recurring pratica in its own right — telematic filing).
- **Chi**: Titolare.
- **Sistemi toccati**: Successioni telematiche (AdE), catasto/SISTER, notaio.
- **Tempo**: Days per engagement; successione pratiche 2–8 h each.
- **Natura**: ~30% rule-based; the dichiarazione di successione pratica itself is ~80% rule-based.

#### Monitoraggio normativo e di prassi
- **Cosa**: Staying current: legge di bilancio, decreti, circolari/risoluzioni/risposte AdE, prassi INPS, CNDCEC documents, scadenze changes. Every studio does this daily via newsletters (Eutekne.info, Il Sole, Italia Oggi, MySolution…) and converts relevant changes into client actions and circolari di studio (area 09).
- **Trigger / Frequenza**: Daily reading ritual (typically early morning).
- **Scadenza**: None formal; being late = missed opportunities or errors.
- **Input**: Official gazettes, AdE documents, professional press.
- **Output**: Updated internal knowledge; flagged client impacts; circolare di studio drafts.
- **Chi**: Titolare + seniors; structured studios rotate a rassegna.
- **Sistemi toccati**: Banche dati, newsletters, GU/AdE sites.
- **Tempo**: 30–60 min daily per professional.
- **Natura**: Reading is human; **norm-diff detection and client-impact matching is a flagship agent capability** ("this decreto touches 14 of your clients").

#### Business plan, budget e controllo di gestione
- **Cosa**: The aziendale strand: building business plans (for banks, bandi, startups), annual budgets, and for retained clients a periodic controllo di gestione loop (consuntivo vs budget, marginalità per commessa/linea, break-even, cash flow forecast).
- **Trigger / Frequenza**: Event-driven (plan) or monthly/quarterly (controllo di gestione retainers).
- **Scadenza**: Bank/bando deadlines; internal reporting calendar.
- **Input**: Contabilità analitica or riclassificata, client operational data, assumptions.
- **Output**: Business plan documents, budget models, reporting packages with commentary.
- **Chi**: Titolare/senior with aziendale inclination; a differentiating service, not universal but widespread.
- **Sistemi toccati**: Excel (dominant), gestionale, BI tools in evolved studios.
- **Tempo**: Days (plan); half-day per period (reporting).
- **Natura**: ~50% rule-based; the modeling mechanics automate well, assumptions and narrative don't.

#### Finanza agevolata e rapporti con il sistema bancario
- **Cosa**: Scouting bandi/contributi (regional, national, EU-funded), preparing domande, managing rendicontazioni; supporting fidi requests and debt restructuring conversations; Fondo di Garanzia PMI mechanics; MCC rating awareness.
- **Trigger / Frequenza**: Bando-calendar-driven + client investment events.
- **Scadenza**: Bando windows (often click-day!); rendicontazione milestones.
- **Input**: Bando texts, client investment plans, DURC/visure regularity checks.
- **Output**: Domande filed on regional/national platforms; rendicontazioni; bank dossiers.
- **Chi**: Dedicated person in structured studios; titolare or external partner in small ones.
- **Sistemi toccati**: Bandi platforms (Invitalia, regioni, GSE), bank portals, Registro Imprese.
- **Tempo**: Days per pratica.
- **Natura**: ~55% rule-based; **bando scouting/matching to clients is a natural agent watchdog**.

---

### Automation notes for this area

- The area's leverage point is **context assembly**: every advisory act starts by reconstructing the client's full picture from contabilità, dichiarativi, visure, and history. An agent that keeps a live "client dossier" cuts the setup cost of every parere.
- Three watchdog patterns recur: **norm-diff → client impact matching**, **bando/agevolazione scouting → eligibility matching**, **threshold monitoring** (forfettario, plafond, società di comodo).
- Deliverables are documents (pareri, memos, plans): LLM drafting from structured context is directly applicable, with the professional as editor and owner of judgment.

---

## 05 — Consulenza societaria e operazioni straordinarie

The company-lifecycle area: the commercialista as the entity's administrative architect, from costituzione to cancellazione. Work here splits into two natures: **pratiche** (highly proceduralized filings toward Registro Imprese/AdE/INPS, mostly ComUnica-shaped) and **operazioni** (structuring decisions with legal-fiscal design, executed with the notaio). Structured studios often have a dedicated "ufficio società/pratiche" — a strong signal that the pratiche half is standardizable.

---

#### Costituzione di società e avvio attività
- **Cosa**: The full company-birth package: choice of form (srl, srls, snc, sas, ditta individuale…) with fiscal-previdenziale comparison, statuto/patti review with the notaio, then the administrative cascade: apertura P.IVA, iscrizione Registro Imprese via ComUnica, PEC activation, iscrizioni INPS/INAIL, SCIA via SUAP where needed, firma digitale, setup of fatturazione elettronica and deleghe.
- **Trigger / Frequenza**: Event-driven; a steady trickle in every studio.
- **Scadenza**: Legal sequence timings (ComUnica within 30 days of atto; SCIA before starting).
- **Input**: Founders' documents and choices; business description (for codice ATECO); capital arrangement.
- **Output**: A fully operating entity: visura, P.IVA, PEC, positions open, digital infrastructure ready.
- **Chi**: Titolare for the design conversation; segreteria societaria for the pratiche cascade.
- **Sistemi toccati**: ComUnica/Telemaco, AdE (modelli AA7/AA9), INPS/INAIL, SUAP, notaio, PEC providers, firma digitale.
- **Tempo**: Design 2–4 h; pratiche cascade 3–8 h spread over days.
- **Natura**: Design ~30% rule-based; the cascade ~90% rule-based — a scripted checklist per entity type.

#### Aperture, variazioni e cessazioni (P.IVA e Registro Imprese)
- **Cosa**: The lifelong stream of anagrafica changes: sede, attività/ATECO, amministratori, denominazione, PEC, unità locali, inizio/fine attività — each becoming an AA7/AA9 to AdE and/or a ComUnica pratica.
- **Trigger / Frequenza**: Event-driven; weekly volume in structured studios.
- **Scadenza**: Typically 30 days from the event.
- **Input**: The change facts + supporting documents.
- **Output**: Pratiche filed; updated visura verified; internal anagrafiche updated (gestionale!).
- **Chi**: Segreteria societaria/collaboratore.
- **Sistemi toccati**: ComUnica/Telemaco (DIRE), Entratel (AA7/AA9), firma digitale.
- **Tempo**: 20–60 min per pratica.
- **Natura**: ~90% rule-based. Classic robotizable pratica flow.

#### Tenuta e aggiornamento dei libri sociali
- **Cosa**: Maintaining libro decisioni dei soci, libro decisioni amministratori (and libro soci where kept): drafting routine verbali (approvazione bilancio in area 03, nomine, compensi, distribuzione utili, autorizzazioni), keeping vidimazione/bollatura where applicable.
- **Trigger / Frequenza**: At least annual (bilancio) + per event.
- **Scadenza**: Verbali contextual to decisions; distribuzione utili verbali before payment (registration duties apply).
- **Input**: Decisions taken; templates.
- **Output**: Verbali in libri sociali; some registered with AdE (delibere distribuzione).
- **Chi**: Segreteria societaria from templates; titolare for non-routine content.
- **Sistemi toccati**: Word/templates, firma, AdE registration when needed.
- **Tempo**: 20–60 min per verbale.
- **Natura**: ~85% template-driven.

#### Comunicazione del titolare effettivo
- **Cosa**: Determining and filing the beneficial owner(s) of società/trust to the Registro Imprese section (regime with legal vicissitudes — verify current enforceability), and updating on changes; interlocks with the studio's own antiriciclaggio duty (area 08).
- **Trigger / Frequenza**: First filing + updates on changes + annual confirmation.
- **Scadenza**: 30 days from variazioni; annual conferma.
- **Input**: Assetti proprietari (soci chains, control analysis).
- **Output**: Pratica titolare effettivo filed via DIRE.
- **Chi**: Collaboratore; control-chain analysis by titolare for complex groups.
- **Sistemi toccati**: DIRE/Telemaco, firma digitale.
- **Tempo**: 15–45 min per entity (analysis apart).
- **Natura**: ~80% rule-based; ownership-chain analysis is the judgment slice.

#### Cessione di quote di srl
- **Cosa**: Transfer of srl quotas executed directly by the commercialista (art. 36, c.1-bis DL 112/2008) with firma digitale of the parties: drafting the atto, registering with AdE (imposta di registro), filing at Registro Imprese. Alternative to the notaio route; a distinctive professional prerogative.
- **Trigger / Frequenza**: Event-driven; regular occurrence.
- **Scadenza**: Registrazione 20 days; deposito RI 30 days.
- **Input**: Parties' data and firma digitale, quota details, price, eventual valuation and fiscal analysis (capital gain of the seller — links to area 04).
- **Output**: Atto di cessione registered and filed; updated compagine in visura.
- **Chi**: Titolare (atto responsibility) + segreteria societaria (pratiche).
- **Sistemi toccati**: Firma digitale, AdE (registrazione atti), DIRE/Telemaco.
- **Tempo**: 2–5 h per operation.
- **Natura**: ~70% rule-based mechanics; pricing/fiscal effects are advisory.

#### Operazioni straordinarie (trasformazioni, fusioni, scissioni, conferimenti, cessioni d'azienda)
- **Cosa**: The high-craft engagements: designing the operation's civil-fiscal architecture (neutralità fiscale conditions, retrodatazione, avanzi/disavanzi, affrancamenti), producing situazioni patrimoniali and progetti (di fusione/scissione) with their deposit-and-wait timelines, perizie di stima for conferimenti (area 07), coordinating notaio and counterparties, then the post-operation administrative alignment.
- **Trigger / Frequenza**: A few per year in small studios; a steady practice in structured ones.
- **Scadenza**: Statutory timelines (e.g. progetto deposited 30 days before delibera; opposizione creditori 60 days) drive a months-long calendar.
- **Input**: Bilanci/situazioni, valuations, group structure, fiscal objectives.
- **Output**: Progetto documents, situazioni ex art. 2501-quater, delibere, atti with notaio, post-op pratiche and fiscal continuity handling.
- **Chi**: Titolare/senior; the signature high-fee work.
- **Sistemi toccati**: DIRE/Telemaco, notaio, gestionale, banche dati.
- **Tempo**: Weeks of calendar, days of effort per operation.
- **Natura**: ~35% rule-based; the procedural calendar is scriptable, the design is not.

#### Liquidazione volontaria e cancellazione
- **Cosa**: Winding down entities: delibera di scioglimento, nomina liquidatore, bilanci di liquidazione (initial, annual, final), piano di riparto, cancellazione dal Registro Imprese, chiusura P.IVA and positions; monitoring the 5-year post-cancellation tax exposure.
- **Trigger / Frequenza**: Event-driven; increases in downturns.
- **Scadenza**: Procedure-internal timelines; final deposits.
- **Input**: Entity's patrimonial state; creditor situation (if insolvent → area 07 crisis tools instead).
- **Output**: Full procedural chain of delibere, bilanci, pratiche until cancellazione.
- **Chi**: Titolare as liquidatore often; collaboratore for mechanics.
- **Sistemi toccati**: DIRE/Telemaco, Entratel, notaio (delibera).
- **Tempo**: Spread over 1+ years; several work-days total.
- **Natura**: ~65% rule-based procedure.

#### Contrattualistica e assetti tra soci
- **Cosa**: Light-legal support commonly expected from the commercialista: patti parasociali, accordi di riservatezza, contratti di service infragruppo, comodati, preliminari review — drafted or reviewed in coordination with lawyers when stakes rise.
- **Trigger / Frequenza**: Event-driven.
- **Scadenza**: Deal timing.
- **Input**: Parties' intents, existing statuto.
- **Output**: Draft/reviewed contracts and patti.
- **Chi**: Titolare.
- **Sistemi toccati**: Word, banche dati (formulari).
- **Tempo**: 1 h–days.
- **Natura**: ~40% rule-based (formulari exist); LLM-draft-assist natural.

#### Pratiche e certificazioni ricorrenti (visure, DURC, dichiarazioni camerali)
- **Cosa**: The background hum: pulling visure/bilanci for due diligence, requesting DURC, certificati camerali, carte tachigrafiche-like sector pratiche, SUAP renewals, albo autotrasporto/MEPA/whitelist registrations for clients needing them.
- **Trigger / Frequenza**: Weekly, on demand.
- **Scadenza**: Requesting party's deadline.
- **Input**: Client identity + purpose.
- **Output**: Certificates delivered/used in pratiche.
- **Chi**: Segreteria.
- **Sistemi toccati**: Telemaco, INPS/INAIL (DURC), SUAP, various PA portals.
- **Tempo**: Minutes each; annoying context-switching volume.
- **Natura**: ~95% rule-based. Ideal MCP territory (Telemaco/DURC connectors).

---

### Automation notes for this area

- Clean split: **pratiche flows** (ComUnica, DIRE, AA7/AA9, DURC, visure — ~90% scriptable, each an MCP-connector story) vs **operazioni design** (human, agent-assisted on research, checklists, and document drafting).
- Every operazione straordinaria carries a **statutory calendar** (deposits, waiting periods, opposizioni): a per-operation timeline tracker is trivial to model and valuable.
- Keeping the **studio anagrafica in sync with visure reality** (post-pratica verification) is a recurring silent failure mode — an auto-reconciliation watchdog fits.

---

## 06 — Contenzioso e pre-contenzioso tributario

Defending the client when the fisco knocks. The volume lives in the **pre-contenzioso** (avvisi bonari, comunicazioni di irregolarità, cartelle, rateizzazioni) — routine, deadline-critical, largely proceduralized. True litigation before the **Corte di Giustizia Tributaria** is rarer and expertise-heavy. The whole area is *reactive*: it starts with a notification (PEC, cassetto fiscale, raccomandata) whose **detection and deadline-derivation is itself a critical activity** — terms in this area (30/60/90 days) are peremptory, and missing one converts a defensible position into a lost one.

---

#### Presidio delle notifiche e monitoraggio del cassetto fiscale/PEC
- **Cosa**: Systematically watching every channel where atti land: client PECs (which clients don't read), cassetto fiscale communications, AdE-Riscossione positions. Triaging each atto: type, amounts, decadenza check, response deadline computation, owner assignment.
- **Trigger / Frequenza**: Continuous; formalized as periodic sweeps in structured studios.
- **Scadenza**: Every atto starts a clock (typically 30/60 days) the moment it's notified — not when the client forwards it.
- **Input**: Deleghe cassetto fiscale, client PEC access or forwarding discipline.
- **Output**: Triage record: atto → deadline → responsible → strategy decision meeting if needed.
- **Chi**: Segreteria/collaboratore sweep; titolare triage of substantive atti.
- **Sistemi toccati**: Cassetto fiscale, PEC, AdE-Riscossione portal, gestionale scadenzario.
- **Tempo**: Diffuse but critical; the cost of missing one is unbounded.
- **Natura**: ~90% rule-based detection + classification. **The single most obvious always-on agent watchdog in the entire profession.**

#### Gestione avvisi bonari (comunicazioni di irregolarità 36-bis/36-ter)
- **Cosa**: Automated-control outcomes on dichiarazioni: checking whether the claimed mismatch is real (often it's a misregistered F24 or a compensazione not recognized), then either paying with sanzioni ridotte (1/3), requesting rettifica via CIVIS, or arranging rateazione.
- **Trigger / Frequenza**: A constant stream — dozens per year even in small studios.
- **Scadenza**: 30 days from communication (60 for avviso telematico to intermediary) to keep the reduced sanction.
- **Input**: The comunicazione, the original dichiarazione, F24 history from cassetto fiscale.
- **Output**: CIVIS istanza or F24 payment/rateazione; client informed and billed.
- **Chi**: Collaboratore; CIVIS is daily bread.
- **Sistemi toccati**: CIVIS (AdE web channel), cassetto fiscale, Entratel.
- **Tempo**: 20 min–2 h per avviso.
- **Natura**: ~85% rule-based (reconciliation against known payments); ideal semi-automated triage.

#### Risposte a controlli formali e richieste documentali
- **Cosa**: Handling AdE requests to produce documentation (spese detratte, crediti, questionari ex art. 32): assembling the fascicolo, drafting the accompagnamento, uploading/transmitting within terms.
- **Trigger / Frequenza**: Regular, seasonal after dichiarativi controls.
- **Scadenza**: Stated in the request (typically 15–30 days, prorogabile).
- **Input**: Client documents (chase!), original dichiarazione data.
- **Output**: Documentation package transmitted (CIVIS/PEC/portale); esito monitored.
- **Chi**: Collaboratore.
- **Sistemi toccati**: CIVIS, PEC, cassetto fiscale.
- **Tempo**: 1–4 h per pratica.
- **Natura**: ~75% rule-based assembly.

#### Istanze di autotutela
- **Cosa**: When the atto is plainly wrong: drafting the istanza demonstrating the error (doppia imposizione, errore di persona, pagamento già eseguito), filing it, and — crucially — remembering that autotutela does not suspend terms, so it runs in parallel with ricorso-readiness.
- **Trigger / Frequenza**: On clearly-erroneous atti.
- **Scadenza**: None formal, but must not consume the ricorso window.
- **Input**: The atto + the proof of error.
- **Output**: Istanza via PEC/portale; sgravio if accepted.
- **Chi**: Collaboratore drafts, titolare signs strategy.
- **Sistemi toccati**: PEC, AdE portale istanze.
- **Tempo**: 1–3 h.
- **Natura**: ~70% rule-based for standard error patterns.

#### Contraddittorio preventivo e accertamento con adesione
- **Cosa**: The negotiation phase on avvisi di accertamento (or pre-accertamento schemi d'atto with the generalized contraddittorio): analyzing the rilievi, building counter-arguments, attending sessions with the ufficio, evaluating the settlement math (sanzioni a 1/3, rate) vs litigation odds. The adesione istanza also suspends ricorso terms 90 days — a standard tactical move.
- **Trigger / Frequenza**: Per avviso di accertamento; several per year.
- **Scadenza**: Istanza within the 60-day ricorso window; the whole dance is deadline-choreographed.
- **Input**: Avviso/PVC, client's real position and documents, giurisprudenza.
- **Output**: Memorie, meeting positions, atto di adesione signed (or breakdown → ricorso).
- **Chi**: Titolare; the client-facing negotiation is senior work.
- **Sistemi toccati**: PEC, ufficio meetings, banche dati.
- **Tempo**: Days per case.
- **Natura**: ~25% rule-based. Human negotiation; agent supports with precedent research and settlement math.

#### Ricorso alla Corte di Giustizia Tributaria (I e II grado)
- **Cosa**: Full litigation: drafting the ricorso (motivi, giurisprudenza, allegati), filing via **PTT/SIGIT** (processo tributario telematico), contributo unificato, eventual istanza di sospensione, memorie, udienza (also remote), then appeal assessment. The commercialista is abilitato alla difesa tecnica in tax matters.
- **Trigger / Frequenza**: The escalation tail: a handful/year in small studios, a practice in structured ones.
- **Scadenza**: Ricorso 60 days from notification (+90 if adesione attempted; sospensione feriale in August); rigid procedural steps after.
- **Input**: The atto, full documentary record, giurisprudenza research.
- **Output**: Ricorso filed on PTT; hearings; sentenza managed (payment, appeal, giudicato).
- **Chi**: Titolare (often the studio's contenzioso specialist).
- **Sistemi toccati**: PTT/SIGIT, PEC, banche dati, pagoPA (contributo unificato).
- **Tempo**: 2–5 days of drafting per ricorso; multi-year case lifecycle.
- **Natura**: ~20% rule-based. Expertise core; agent value in research, drafting support, and **procedural deadline tracking across the case's life**.

#### Gestione cartelle, rateizzazioni e riscossione
- **Cosa**: The AdE-Riscossione front: verifying cartelle legitimacy (decadenza, prescrizione, vizi di notifica), requesting rateizzazioni (ordinary up to 72/120 rate, decadenza monitoring), sospensioni legali, checking fermi/ipoteche, and definizioni agevolate ("rottamazioni") whenever the legislator reopens them.
- **Trigger / Frequenza**: Constant stream with indebted clients; spikes on rottamazione windows.
- **Scadenza**: Cartella: 60 days; rateizzazione decadenza rules; rottamazione windows.
- **Input**: Estratto di ruolo / posizione debitoria from AdER portal, notification history.
- **Output**: Rateizzazione plans active, istanze filed, payment calendars given to client (and monitored!).
- **Chi**: Collaboratore for pratiche; titolare for strategy on big positions.
- **Sistemi toccati**: AdE-Riscossione portal (EquiPro for intermediari), PEC.
- **Tempo**: 30 min–3 h per position.
- **Natura**: ~80% rule-based; **rate-payment monitoring to prevent decadenza is a perfect automated watchdog**.

#### Assistenza durante verifiche fiscali (GdF / AdE)
- **Cosa**: When inspectors show up at the client: assisting during accessi/ispezioni, managing document production, presidiando the PVC drafting, then the 60-day osservazioni memoria (Statuto del contribuente art. 12).
- **Trigger / Frequenza**: Rare but all-consuming when it happens.
- **Scadenza**: Osservazioni within 60 days of PVC.
- **Input**: Everything about the client; the verifica's requests day by day.
- **Output**: Managed document flow, PVC osservazioni, groundwork for adesione/ricorso.
- **Chi**: Titolare personally.
- **Sistemi toccati**: Physical presence, PEC, the whole client archive.
- **Tempo**: Weeks of disruption.
- **Natura**: ~15% rule-based. Human; agent as instant-archive-retrieval support.

---

### Automation notes for this area

- The area's spine is **deadline arithmetic on notified atti**: detect atto → classify → compute the peremptory term → track it. This is fully rule-based and catastrophic to get wrong — top-tier agent value.
- The pre-contenzioso volume (avvisi bonari, CIVIS, rateizzazioni) is **reconciliation work** against data the studio already has (F24s, dichiarazioni in cassetto fiscale) — automatable triage with human confirmation.
- Litigation proper stays human, but its **procedural calendar** (memorie 10 days before udienza, appeal terms…) is a tracker use case identical in shape to area 05's operazioni.

---

## 07 — Incarichi istituzionali

Roles the commercialista holds **personally** (not the studio): revisore legale, sindaco, curatore, esperto, attestatore, CTU, perito. They come with personal liability, independence requirements, and their own methodological frameworks. Not every professional holds them, but nearly every studio of size has partners who do, and even solo practitioners commonly carry a few sindaco/revisore mandates. These incarichi generate structured recurring work that lands on the same studio machine (collaboratori, scadenzario) as everything else.

---

#### Revisione legale dei conti
- **Cosa**: Statutory audit as revisore unico (typical in PMI): pianificazione (ISA Italia), risk assessment e materialità, interim procedures, verifiche periodiche di cassa/regolarità, circolarizzazioni (banche, clienti, fornitori, legali), year-end substantive testing, carte di lavoro, and the relazione di revisione on the bilancio. Continuous obligations: independence monitoring, incarico acceptance procedures, quality control (ISQM-adapted), FPC revisori (20 crediti/anno, 10 caratterizzanti, registro MEF).
- **Trigger / Frequenza**: Per mandate (3-year terms): 2–4 verifiche periodiche/year + the annual audit cycle.
- **Scadenza**: Relazione 15 days before the assemblea; verifiche cadence per planning.
- **Input**: Bilancio and full accounting access, legal/bank confirmations, inventory attendance where material.
- **Output**: Carte di lavoro (archived 10 years), verbali verifiche, relazione di revisione (giudizio).
- **Chi**: The revisore personally + studio staff as audit team in structured studios.
- **Sistemi toccati**: Audit software (Revisal, CCH, ecc.), circolarizzazione via PEC, MEF registro revisori, client's gestionale.
- **Tempo**: 5–20+ days/year per mandate depending on size.
- **Natura**: ~55% rule-based (checklist-driven methodology) with judgment at risk/materiality/giudizio. Strong assist case: working-paper automation, circolarizzazione management, sampling.

#### Collegio sindacale (e sindaco unico)
- **Cosa**: The vigilanza organ: quarterly-ish verifiche (riunioni del collegio with verbali on libro sindaci), monitoring legality and adeguati assetti (heightened by the Codice della Crisi: duty to flag crisis signals to administrators), attending assemblee and CdA, pareri (e.g. on compensi), the annual relazione dei sindaci to the bilancio, segnalazioni duties.
- **Trigger / Frequenza**: Per mandate: ~4 verbali/year + bilancio season + events.
- **Scadenza**: Relazione before assemblea; verbali every 90 days.
- **Input**: Company information flows, bilancio, administrators' reporting.
- **Output**: Verbali, relazione annuale, eventual segnalazioni ex art. 25-octies CCII.
- **Chi**: The sindaco personally; studio prepares checklists/drafts.
- **Sistemi toccati**: Templates, PEC, client documentation.
- **Tempo**: 3–8 days/year per mandate.
- **Natura**: ~60% checklist-driven; the crisis-signal judgment is the sensitive core.

#### Curatele e organi delle procedure concorsuali
- **Cosa**: Court appointments under the Codice della Crisi (liquidazione giudiziale curatore, commissario/liquidatore giudiziale in concordati): inventory and asset seizure, relazioni ex art. 130 CCII, stato passivo formation (verifica crediti), liquidation program execution, riparti, all run on the **Portale dei creditori / procedure telematiche** with strict judicial deadlines.
- **Trigger / Frequenza**: Per appointment from the Tribunale; a specialization track.
- **Scadenza**: Court-set and statutory (relazione iniziale, semestrali, programma di liquidazione 60 gg…).
- **Input**: Company records seized, creditor claims (domande di insinuazione), judicial directives.
- **Output**: Relazioni to the giudice delegato, stato passivo, vendite, riparti, chiusura.
- **Chi**: The curatore personally + trusted collaboratori; heavy PCT usage.
- **Sistemi toccati**: Processo Civile Telematico (PCT), portale delle vendite pubbliche, PEC mass-communications to creditors, fallco-like software.
- **Tempo**: Years per procedure; substantial recurring workload.
- **Natura**: ~50% proceduralized; creditor verification and asset decisions are judgment. Mass-PEC and stato passivo mechanics automate well.

#### Composizione negoziata e strumenti di regolazione della crisi
- **Cosa**: Acting as **esperto negoziatore** (from the apposito elenco) facilitating debtor-creditor negotiations, or on the debtor side: test pratico/check-up with the piattaforma nazionale, piani di risanamento, accordi di ristrutturazione, concordato preventivo/semplificato support, OCC roles for sovraindebitamento (piano del consumatore, esdebitazione).
- **Trigger / Frequenza**: Event-driven, growing structurally with the CCII culture.
- **Scadenza**: Procedure-specific (180-day negotiation windows, court terms).
- **Input**: Full financial picture, creditor map, going-concern analysis.
- **Output**: Relazioni dell'esperto, piani, accordi, ricorsi.
- **Chi**: Titolare-level specialists.
- **Sistemi toccati**: Piattaforma composizione negoziata (Unioncamere), PCT, PEC.
- **Tempo**: Months per engagement.
- **Natura**: ~25% rule-based. Deep judgment; agent assists on the numeric test-pratico and document assembly.

#### Attestazioni (professionista indipendente)
- **Cosa**: The attestatore role ex art. 2, lett. o) CCII: certifying veridicità dei dati aziendali and fattibilità of piani (risanamento, concordati, accordi, transazione fiscale). High-liability opinion work with due-diligence methodology.
- **Trigger / Frequenza**: Per engagement; specialization work.
- **Scadenza**: Procedure timeline.
- **Input**: The plan, underlying data, independent verification work.
- **Output**: Relazione di attestazione.
- **Chi**: The attestatore personally with a team.
- **Sistemi toccati**: Client systems, data rooms, Excel.
- **Tempo**: Weeks.
- **Natura**: ~30% rule-based.

#### CTU, CTP e perizie giudiziarie
- **Cosa**: Court-appointed technical consulting (CTU) in civil/penal matters with economic content — danno calculations, anatocismo/usura banking disputes, azienda valuations in family/inheritance litigation — or party-side CTP work; quesito-driven, with rigid procedural rites (ex art. 195 c.p.c. draft-observations-final cycle).
- **Trigger / Frequenza**: Per appointment; steady niche.
- **Scadenza**: Judge-set terms.
- **Input**: Case files (fascicolo via PCT), quesito, parties' documents.
- **Output**: Relazione peritale filed via PCT.
- **Chi**: The professional personally.
- **Sistemi toccati**: PCT, Excel/valuation tools.
- **Tempo**: Days–weeks per incarico.
- **Natura**: ~40% rule-based (calculation methodologies) within judicial procedure.

#### Perizie di stima e valutazioni d'azienda
- **Cosa**: Valuations outside litigation: perizie giurate for conferimenti/trasformazioni (art. 2465 c.c.), valuations for cessioni, recesso soci, PPA support, rivalutazioni when norms allow, affrancamenti di quote. Methodologies: patrimoniale, reddituale, DCF, multipli — per OIV/PIV standards.
- **Trigger / Frequenza**: Event-driven, tied to area 05 operations.
- **Scadenza**: Operation timeline; giuramento in tribunale for perizie giurate.
- **Input**: Bilanci, piani, market data.
- **Output**: Perizia (sworn when required).
- **Chi**: Titolare/senior with valuation practice.
- **Sistemi toccati**: Excel/valuation models, tribunale (giuramento), banche dati (multipli).
- **Tempo**: 2–10 days per perizia.
- **Natura**: ~45% rule-based; method mechanics automate, assumptions don't.

#### Altri incarichi fiduciari
- **Cosa**: The long tail: amministratore di condominio-adjacent roles (rare), esecutore testamentario, amministrazioni di sostegno, arbitrati, revisore di enti locali (elenco Ministero Interno, extraction-based), organismi di vigilanza 231, revisore di enti del terzo settore.
- **Trigger / Frequenza**: Per appointment.
- **Scadenza**: Role-specific.
- **Input/Output/Sistemi**: Role-specific (OdV 231: flussi informativi e verbali; revisore EELL: pareri on bilanci preventivi/consuntivi via BDAP).
- **Chi**: Personal appointments.
- **Tempo**: Variable.
- **Natura**: Mixed; each has a checklist skeleton + judgment core.

---

### Automation notes for this area

- These incarichi are **methodology-driven**: ISA Italia, CCII procedure, PIV standards — all checklist-representable. The agent value is **working-paper and procedural-compliance automation** (audit trails, verbali cadence, circolarizzazioni, court-term tracking), never the opinion itself.
- The **independence/incompatibility check** at acceptance (and continuously) is a rule-based cross-check against the studio's client base — automatable and today mostly done by memory.
- PCT/piattaforme (portale creditori, vendite pubbliche, composizione negoziata) are additional MCP surface beyond the fiscal ones.

---

## 08 — Gestione dello studio

The studio as a business and as a regulated entity itself. This area produces no client deliverable, yet it decides whether everything else works: the **scadenzario** is the operating system of the profession, antiriciclaggio is the compliance sword hanging over it, and fatturazione dello studio is the (often neglected) revenue side. In a 30-person studio these are explicit roles (office manager, responsabile antiriciclaggio, responsabile invii); in a solo studio they are the titolare's evenings.

---

#### Scadenzario e pianificazione del lavoro
- **Cosa**: The master matrix: **client × adempimento × deadline × assignee × status**, maintained continuously and reviewed daily/weekly. Every area's activities feed it. The daily standup question of any studio is "cosa scade e a che punto siamo?". Includes capacity planning for the seasonal peaks and load rebalancing between collaboratori.
- **Trigger / Frequenza**: Living object; daily consultation, weekly planning review, annual rebuild when the year's calendar publishes.
- **Scadenza**: It *is* the deadlines.
- **Input**: Fiscal calendar, client anagrafica (which adempimenti apply to whom), work status from the team.
- **Output**: Work queues, alerts, workload views.
- **Chi**: Titolare/office manager owns it; everyone reads it.
- **Sistemi toccati**: Gestionale (scadenzario module), Excel (still everywhere), practice-management tools.
- **Tempo**: 30–60 min/day of studio-level attention.
- **Natura**: ~90% rule-based derivation (client attributes → applicable deadlines). **The central data model any agent system must own or integrate with.**

#### Antiriciclaggio (D.Lgs. 231/2007)
- **Cosa**: The studio's own AML obligations: **adeguata verifica** of every client (identification, titolare effettivo, scopo del rapporto, PEP screening), risk-scoring (autovalutazione del rischio), fascicolo antiriciclaggio per client, ongoing monitoring, conservazione 10 years, staff training, and — rare but grave — segnalazione di operazione sospetta (SOS) to UIF; limitazioni contante vigilance. Checked in ispezioni GdF and Ordine verifiche.
- **Trigger / Frequenza**: At every onboarding + periodic refresh (risk-based cadence) + on operation anomalies.
- **Scadenza**: Verifica before the prestazione begins; refresh per risk class.
- **Input**: Client documents, visure, assetti proprietari, PEP/sanction lists.
- **Output**: Fascicolo AML per client, risk register, eventual SOS via UIF portal.
- **Chi**: Responsabile antiriciclaggio (titolare in small studios); segreteria collects.
- **Sistemi toccati**: DIRE (titolare effettivo), visure providers, AML software modules, UIF Infostat portal.
- **Tempo**: 30–90 min per onboarding; periodic refresh batches. Universally experienced as pure burden.
- **Natura**: ~85% rule-based document/check choreography. High automation appetite (document collection, screening, fascicolo assembly, refresh scheduling).

#### Mandati, preventivi e lettere d'incarico
- **Cosa**: Formalizing every engagement: preventivo di massima (obbligo informativo), lettera d'incarico with scope/compensi (equo compenso framework for parametri), renewal management, scope-creep repricing ("chiedo una cosa al volo" is the profession's revenue leak), and disdette.
- **Trigger / Frequenza**: Onboarding + annual renewals + per spot engagement.
- **Scadenza**: Before starting the prestazione (also an AML and RC-insurance requirement).
- **Input**: Service scope, parametri/tariffario of the studio.
- **Output**: Signed lettera d'incarico archived; billing plan derived.
- **Chi**: Titolare; templates by segreteria.
- **Sistemi toccati**: Word/templates, firma (also FEA/OTP tools), gestionale (link to billing).
- **Tempo**: 30–60 min per mandate.
- **Natura**: ~80% templated. Automatable generation from a service-catalog + client attributes.

#### Gestione deleghe telematiche
- **Cosa**: The studio's access infrastructure: collecting and filing deleghe for cassetto fiscale, Fatture e Corrispettivi (consultazione/conservazione), cassetto previdenziale INPS, AdER (EquiPro); tracking expirations (cassetto fiscale deleghe last 4 years; F&C deleghe 2) and renewing before they lapse — an access outage silently breaks areas 01, 02, 06.
- **Trigger / Frequenza**: Onboarding + expiry-driven renewals.
- **Scadenza**: Each delega's expiry.
- **Input**: Client signatures + document identity data (or their SPID-based conferimento).
- **Output**: Active deleghe registry per client per system.
- **Chi**: Segreteria.
- **Sistemi toccati**: Entratel (invio deleghe massive), AdE portale, INPS, EquiPro.
- **Tempo**: 15–30 min per client per round; portfolio-wide renewal campaigns.
- **Natura**: ~95% rule-based. Registry + expiry watchdog = trivial, high-value automation.

#### Fatturazione dello studio e recupero crediti
- **Cosa**: The studio's own revenue cycle: tracking billable work per mandate (rarely time-tracked in small studios; increasingly in structured ones), emitting parcelle/fatture elettroniche (with cassa previdenziale CNPADC 4%, ritenuta d'acconto logic, bollo), monitoring incassi, chasing the notorious slow-paying clients, valutando sospensione dell'attività for chronic non-payers (deontologically delicate).
- **Trigger / Frequenza**: Monthly billing cycles + acconti/saldi per season.
- **Scadenza**: Studio's own liquidity needs; own IVA/dichiarativi like any professionista.
- **Input**: Mandati/tariffe, work done, time sheets where used.
- **Output**: Fatture via SDI, incassi reconciliation, solleciti, sospensioni.
- **Chi**: Titolare decides, segreteria executes. Chronically deprioritized ("il calzolaio con le scarpe rotte").
- **Sistemi toccati**: Gestionale parcellazione, SDI, home banking.
- **Tempo**: A few days/month studio-wide.
- **Natura**: ~85% rule-based; the automation case (auto-parcellazione from scadenzario-completed work + solleciti) is strong and under-served.

#### Formazione professionale continua (FPC)
- **Cosa**: Maintaining the obbligo formativo: 90 crediti per triennio (min 20/anno, of which materie obbligatorie/deontologia), plus the separate 20/anno for revisori legali (MEF) — choosing courses, attending (mostly webinars now), tracking crediti per professional, and the ordine's audit of it. Extends to the collaboratori's technical training.
- **Trigger / Frequenza**: Continuous; year-end credit-panic is a genre.
- **Scadenza**: Annual minima and triennio totals.
- **Input**: Accredited course catalogs (Ordine, enti formatori, Concerto/Datev, ecc.).
- **Output**: Crediti registered (auto-fed by providers to the Ordine's system).
- **Chi**: Every iscritto personally.
- **Sistemi toccati**: Ordine/FPC portals, webinar platforms, registro revisori MEF.
- **Tempo**: The 20+ hours themselves + admin.
- **Natura**: Admin side ~95% rule-based (credit tracking/alerting automatable).

#### Gestione del team: collaboratori, praticanti, carichi di lavoro
- **Cosa**: Structuring the human machine: assigning client portfolios, reviewing juniors' output (the review bottleneck is the titolare's constraint), praticantato management (tirocinio obligations toward the Ordine), hiring/retention in a market with chronic collaboratore scarcity, internal procedures/checklists so the studio survives turnover.
- **Trigger / Frequenza**: Continuous; formal moments at season planning and reviews.
- **Scadenza**: None formal (except praticantato paperwork).
- **Input**: Workload data (scadenzario), competence map.
- **Output**: Assignments, reviewed work, growth paths, procedure documents.
- **Chi**: Titolare/partners.
- **Sistemi toccati**: Practice management, internal docs.
- **Tempo**: Significant, chronically under-budgeted.
- **Natura**: ~20% rule-based. Human; agent value is in making workload visible and absorbing junior-level work.

#### Infrastruttura: software, dati, sicurezza
- **Cosa**: Running the stack: the gestionale (licenses, updates, the annual dichiarativi module release), Desktop Telematico environments and certificates (Entratel credentials, ambiente di sicurezza renewal!), firma digitale devices/renewals, PEC boxes, backups/cloud, GDPR compliance of the studio itself (registro trattamenti, nomine, breach readiness).
- **Trigger / Frequenza**: Continuous + renewal calendars (certificates are a classic silent-failure).
- **Scadenza**: Certificate/PEC/firma expirations; GDPR standing duties.
- **Input**: Vendor relationships, renewal registries.
- **Output**: A working, compliant infrastructure.
- **Chi**: Office manager/IT-inclined partner; software house support.
- **Sistemi toccati**: Everything; the meta-layer.
- **Tempo**: Diffuse; spikes on migrations (changing gestionale is a studio's most feared project).
- **Natura**: ~80% rule-based operations. Expiry watchdogs again.

#### Adempimenti dell'iscritto verso Ordine e Casse
- **Cosa**: The professional's own status upkeep: quota annuale Ordine, assicurazione RC professionale (obbligatoria — massimale choices), PEC registration (INI-PEC), CNPADC contributi (minimi, eccedenze, comunicazione reddituale annuale), eventual STP corporate obligations.
- **Trigger / Frequenza**: Annual cycle.
- **Scadenza**: Ordine and CNPADC calendars.
- **Input**: Own income data, policy renewals.
- **Output**: Payments, dichiarazioni to Cassa, valid coverage.
- **Chi**: Titolare personally / studio admin.
- **Sistemi toccati**: CNPADC portal, Ordine portal, insurer.
- **Tempo**: A few hours/year.
- **Natura**: ~95% rule-based.

#### Sviluppo dello studio
- **Cosa**: The strategic layer, chronically starved of time: pricing revision, service portfolio evolution (compliance→advisory shift), specialization choices, digital tooling adoption, alliances (reti, aggregazioni, STP), acquisition of other studios' portfolios (a live M&A market), succession planning of the studio itself.
- **Trigger / Frequenza**: Sporadic; forced by events (retirement, margin squeeze).
- **Scadenza**: None — hence the starvation.
- **Input**: Studio economics, market signals.
- **Output**: Decisions and (rarely written) strategy.
- **Chi**: Titolare/partners.
- **Sistemi toccati**: —
- **Tempo**: Whatever is left, i.e. almost none.
- **Natura**: Pure judgment. The promise "automation frees time for this" is the profession's core hope and the product's core pitch.

---

### Automation notes for this area

- **The scadenzario is the keystone**: it is the natural orchestration layer for any agent — the work queue, the SLA tracker, and the audit trail in one. Owning or deeply integrating with it beats automating any single adempimento.
- Recurring pattern: **expiry watchdogs** (deleghe, certificati Entratel, firme digitali, PEC, RC policy, FPC crediti, rateizzazione rate) — trivially rule-based, high failure cost, universally handled today by memory and post-its.
- Antiriciclaggio and mandati are **onboarding choreography**: a single automated onboarding flow (documents → AML fascicolo → lettera d'incarico → deleghe → anagrafica) would compress the studio's most repetitive multi-system process.

---

## 09 — Relazione con il cliente

The interface layer. Every technical area depends on inputs from clients and produces outputs clients must receive, understand, and act on (mostly: pay things on time). In practice this layer — not the technical work — is where studios bleed the most time and frustration: **documents that don't arrive, F24s that don't get paid, the same question asked by thirty clients the week a norm changes**. It is also where loyalty is built: clients don't evaluate the quality of a dichiarazione (they can't); they evaluate responsiveness, clarity, and the feeling of being protected.

Channels are chaotically heterogeneous: email, WhatsApp (dominant with small clients, to studios' despair), phone, PEC, portale dello studio where adopted, and paper carried in shopping bags.

---

#### Onboarding di un nuovo cliente
- **Cosa**: The full intake choreography: knowledge meeting, service scoping and preventivo (area 08), AML adeguata verifica (area 08), raccolta documenti iniziale (atti, dichiarazioni precedenti, libri), **subentro dal precedente commercialista** (a ritualized colleague-to-colleague handover with deontological rules — the outgoing must hand over documents; the incoming sends the courtesy PEC), deleghe activation, anagrafica setup in the gestionale, scadenzario derivation.
- **Trigger / Frequenza**: Event-driven; concentrated around year boundaries (clients switch at 1/1).
- **Scadenza**: Must complete before the first deadline the studio inherits (often frighteningly soon).
- **Input**: Client documents, predecessor's records, signed mandato and deleghe.
- **Output**: A fully set-up client: anagrafica, fascicolo AML, deleghe active, storico loaded, scadenzario populated.
- **Chi**: Titolare (relationship) + segreteria (choreography).
- **Sistemi toccati**: Gestionale, Entratel (deleghe), DIRE, PEC, AML tooling.
- **Tempo**: 3–8 h spread over weeks; the predecessor-handover latency dominates.
- **Natura**: ~75% choreographed. A guided onboarding flow is one of the clearest product surfaces.

#### Raccolta documenti ricorrente (il sollecito eterno)
- **Cosa**: The profession's most universal pain: chasing clients for what each cycle needs — estratti conto, fatture estere, incassi/pagamenti confirmations for regime di cassa, rimanenze, spese detraibili for dichiarazioni, contratti nuovi. Studios run informal per-cycle checklists and escalating solleciti (email → call → "guardi che paga la sanzione lei").
- **Trigger / Frequenza**: Every cycle of every area: monthly (contabilità), annual mass-campaign (dichiarativi: the April–June document harvest).
- **Scadenza**: Derived: documents must arrive with enough lead time before each adempimento.
- **Input**: Per-client checklist of pending items (implicit, in collaboratori's heads or Excel).
- **Output**: Documents in; or documented solleciti (liability protection when the client's delay causes a miss).
- **Chi**: Collaboratore/segreteria; enormous aggregate time.
- **Sistemi toccati**: Email/WhatsApp/phone/portale studio; documents land anywhere.
- **Tempo**: Estimated 10–20% of total studio time including rework from late arrivals.
- **Natura**: ~90% rule-based (what's missing is derivable; the chase is templatable). **Arguably the single highest-ROI automation target in the profession.**

#### Comunicazione di scadenze e importi da versare
- **Cosa**: The recurring outbound ritual: telling each client what to pay and by when — F24s attached (or notice of addebito if the studio transmits with IBAN), explanation in client-comprehensible language, reminders as the date approaches, and confirmation collection ("pagato?"). Failure mode: the client who didn't pay and blames the studio.
- **Trigger / Frequenza**: Every 16th, every acconti/saldi round, per-event (IMU, bolli).
- **Scadenza**: Enough ahead of each versamento for the client to act.
- **Input**: Computed amounts (areas 01–02), client payment preference (self-pay vs addebito).
- **Output**: Notifications sent, payment confirmations tracked, quietanze archived.
- **Chi**: Collaboratore/segreteria.
- **Sistemi toccati**: Email/WhatsApp/portale, Entratel (esiti addebito), gestionale.
- **Tempo**: Hours around every deadline, portfolio-wide.
- **Natura**: ~95% rule-based. Notify → remind → confirm → verify loop: complete automation candidate.

#### Il flusso quotidiano di domande spot
- **Cosa**: The always-on stream: "posso scaricare questa cena?", "assumo o partita IVA?", "mi conviene l'auto aziendale?", "è arrivata questa PEC, che faccio?", "quanto mi costa un dipendente a 1.500 netti?". Each is small; the aggregate is a large, unbilled share of the titolare's day. Answers draw on the client's context + norm knowledge; many repeat identically across clients.
- **Trigger / Frequenza**: Daily, interrupt-driven — the primary fragmentation source of professional time.
- **Scadenza**: Perceived-urgency-driven (clients expect same-day).
- **Input**: The question + client context.
- **Output**: Quick answers (call/WhatsApp/email); occasionally escalating to a formal parere (area 04).
- **Chi**: Titolare disproportionately (clients want "il dottore").
- **Sistemi toccati**: Phone/WhatsApp/email.
- **Tempo**: 1–3 h/day of professional time, fragmented.
- **Natura**: ~60% of questions are recurrent patterns answerable from context + rules. The obvious "first-line agent" surface, with the delicate part being liability and tone.

#### Incontri periodici e revisione dell'andamento
- **Cosa**: The structured touchpoint (annual for small clients, quarterly for significant ones): reviewing the situazione contabile, imposte forecast, upcoming deadlines, and the client's plans — where cross-sell of advisory (area 04) naturally happens. Many studios do this only reactively; the evolved ones calendarize it.
- **Trigger / Frequenza**: 1–4 times/year per client, plus dichiarativi-signature meetings.
- **Scadenza**: None hard; drifts when compliance peaks eat the calendar.
- **Input**: Prepared situazione + talking points (today: assembled manually; a natural auto-generated "client brief").
- **Output**: Informed client, decisions, engagement renewals, advisory leads.
- **Chi**: Titolare.
- **Sistemi toccati**: Gestionale, Excel, meeting/call.
- **Tempo**: 1–2 h per meeting + prep.
- **Natura**: Meeting is human; **the prep pack is ~85% auto-assemblable**.

#### Circolari di studio e comunicazioni normative
- **Cosa**: Broadcasting norm changes that touch clients: the studio circolare ("Dal 1° gennaio cambia..."), segmented ideally by affected cliente type, often in practice sent to everyone. Doubles as perceived-value signaling. Sources: the daily rassegna (area 04's monitoraggio normativo).
- **Trigger / Frequenza**: On norm events; 1–4/month in active studios.
- **Scadenza**: Before the norm bites.
- **Input**: The norm analysis + client segmentation.
- **Output**: Circolare (PDF/email/portale), plus the follow-up question wave it triggers.
- **Chi**: Titolare/senior drafts (or buys from circolari services and personalizes).
- **Sistemi toccati**: Email/portale, banche dati (source material).
- **Tempo**: 2–4 h per circolare if self-written.
- **Natura**: ~70% automatable (norm-diff → affected-client matching → draft), with human editorial.

#### Supporto operativo e identità digitale del cliente
- **Cosa**: The unofficial help-desk role: activating SPID/CIE/CNS for clients, firma digitale requests, PEC setup and renewals, registering clients on INPS/AdE portals, helping with pagoPA, downloading their CU/730 precompilata — the studio as the client's digital prosthesis, especially for older imprenditori.
- **Trigger / Frequenza**: Constant trickle; spikes when a portal changes login rules.
- **Scadenza**: Per-need.
- **Input**: Client identity documents, patience.
- **Output**: Working credentials/devices; another implicit dependency on the studio.
- **Chi**: Segreteria.
- **Sistemi toccati**: SPID providers, CCIAA (firme), PEC providers, all PA portals.
- **Tempo**: 20–60 min per intervention; unbilled almost always.
- **Natura**: ~85% procedural.

#### Cessazione del rapporto e passaggio di consegne
- **Cosa**: The mirror of onboarding: formal disdetta handling (or the studio firing the client — non-payers, risk clients per AML), documenti restitution duty, handover to the successor, closing deleghe, final billing, archive retention (10 years).
- **Trigger / Frequenza**: Event-driven; year-boundary concentrated.
- **Scadenza**: Deontological promptness on handover; pending-deadline responsibility must be explicitly transferred.
- **Input**: Disdetta, successor's requests.
- **Output**: Complete handover package, deleghe revoked, archive frozen.
- **Chi**: Segreteria + titolare sign-off.
- **Sistemi toccati**: Gestionale (export), Entratel (revoca deleghe), PEC.
- **Tempo**: 2–4 h per departure.
- **Natura**: ~85% checklist-driven.

---

### Automation notes for this area

- This area is **the moat**: areas 01–03 automation is being commoditized by gestionali; the chase-communicate-confirm loops here are where studios actually drown, and they are structurally rule-based.
- Three killer loops, all shaped identically (derive what's needed → notify → escalate → confirm → record): **document collection**, **payment notification**, **deadline reminders**.
- The spot-question stream is the LLM-native surface, but it must answer **from the client's actual data** (contabilità, dichiarazioni, mandato scope) — i.e., it needs the MCPs built for areas 01–08. Liability framing (assist-the-professional vs answer-the-client) is a product decision, not a technical one.

---

## 10 — Il ritmo del tempo

How all the preceding areas land on the calendar. The profession is **rhythm-driven at three nested frequencies**: the day (interrupt-managed), the month (anchored on the 16th), and the year (two great seasons: bilanci in spring, dichiarativi in summer–autumn). Understanding these rhythms matters for automation design: load is violently non-uniform, and the studio's felt pain is not average workload but **peak workload coinciding with interrupt pressure**.

All dates are the typical regime; proroghe shift them annually.

---

### La giornata tipo

There is no single "typical day", but a stable structure with role-dependent content:

**Titolare / partner**
- **Early morning (8:00–9:30)**: the rassegna — professional press, newsletters, overnight PEC/email triage. The quiet productive window.
- **Core morning**: appointments (clients, banks, notai), review of collaborators' output, signatures (dichiarazioni, bilanci, pareri).
- **The interrupt stream**: throughout the day, the spot-question flow (area 09) — calls and WhatsApp fragmenting every planned activity. Widely reported as the #1 productivity killer.
- **Late afternoon/evening**: the deep work displaced by the day — pareri, operazioni straordinarie, contenzioso drafting — plus studio management. The profession structurally works evenings in peak season.

**Collaboratore contabile**
- Portfolio-driven: works through the assigned clients' current cycle step (registrazioni → liquidazioni → adempimento of the moment), interleaved with document chasing for their portfolio and client calls of technical nature.
- The day's shape follows the scadenzario: near the 16th, everyone is on liquidazioni/F24; in LIPE weeks, LIPE; in dichiarativi season, returns.

**Segreteria**
- Front office (phone, reception, posta/PEC smistamento), pratiche flow (area 05), deleghe/onboarding choreography, ricevute filing, appointment management, and the outbound notification loops (area 09).

Two structural facts about every studio day:
1. **PEC/email triage is the day's control loop** — atti and scadenze enter there (area 06's presidio).
2. **Nothing planned survives intact**: interrupt load means recurring mechanical work systematically slips to deadline-adjacency, amplifying peaks.

---

### Il mese tipo

The month is anchored on **il 16** (versamenti: IVA mensile, ritenute, contributi) and the **fine mese** (invii, LIPE quarters, Intrastat on the 25th):

| Window | What happens studio-wide |
|--------|--------------------------|
| **1–10** | Close the prior month's contabilità: SDI imports, registrazioni, banche, paghe data in. Document chase peaks. |
| **10–16** | Liquidazioni IVA computed and checked; F24 built, sent to clients or queued for addebito; the "quanto devo pagare?" wave; the 16th itself: transmission and payment confirmations. |
| **16–25** | Breath. Advisory work, pratiche, arretrati, meetings. Intrastat by the 25th for affected clients. |
| **25–fine** | Month-end invii (LIPE in due quarters, esterometro-autofatture by the 15th technically, bollo quarters), corrispettivi checks, and pre-positioning for next month. |

Quarterly overlay (Jan/Apr/Jul/Oct → LIPE and trimestrale liquidations; bollo FE) thickens the corresponding months.

---

### L'anno tipo

| Month | Dominant workload |
|-------|-------------------|
| **Gennaio** | Year-boundary machine: new clients onboarding (switches at 1/1), regime re-checks, dichiarazioni d'intento, Sistema TS transmission, CU preparation begins, cespiti/inventory data requests go out. |
| **Febbraio** | CU production at full speed; dichiarazione IVA annuale opens (1/2); bilancio closings begin for structured clients; LIPE Q4/28-2. |
| **Marzo** | **CU deadline (16/3)** + saldo IVA (16/3); bilancio season core: chiusure, assestamenti, draft bilanci; dichiarazione IVA continues. |
| **Aprile** | **Dichiarazione IVA (30/4)** and **assemblee di approvazione bilanci (120 gg → 30/4)**; verbali; the spring crunch. Dichiarativi campaign warm-up: document harvest letters to clients. |
| **Maggio** | Depositi bilanci (30 days from approvazione → end May); LIPE Q1 (31/5); 730/Redditi production ramps; bollo FE Q1. |
| **Giugno** | **The payment mountain: 30/6** — saldo+1° acconto imposte, diritto camerale, IMU acconto (16/6); dichiarativi in full production; client signature meetings. |
| **Luglio** | Deferred versamenti (30/7 with 0,4%); dichiarativi production continues; the pre-August push to leave things clean. |
| **Agosto** | The (partial) pause: sospensione feriale of many terms (1–31/8 for processual terms, mid-August freeze for avvisi bonari payments); studios close 2–3 weeks; 20/8 versamenti for some flows. |
| **Settembre** | Re-entry: 730 deadline (30/9), LIPE Q2 (30/9), dichiarativi resume, acconti planning conversations begin. |
| **Ottobre** | **Dichiarativi deadline (31/10): Redditi, IRAP, 770** — the year's transmission peak; ricevute/scarti presidio critical; capienza days disappear. |
| **Novembre** | **2° acconto (30/11)** with previsionale decisions (the advisory moment); LIPE Q3 (30/11); pre-chiusura/tax planning season opens (area 03/04). |
| **Dicembre** | Acconto IVA (27/12); year-end levers execution (compensi, TFM, investments); FPC credit completion panic; next-year calendar build; auguri e panettoni ai clienti. |

**Structural observations**
- Two compounding peaks: **March–June** (bilanci + IVA annuale + versamenti + dichiarativi start) and **September–November** (730/Redditi/770 + acconti). January is a hidden third (onboarding + CU + TS).
- Peak months combine maximum mechanical load with maximum client interaction (signatures, payment communications) — exactly when interrupt tolerance is lowest.
- August and late December are the only real slack — where migrations, tooling changes, and procedure work actually happen. **Product adoption windows follow the same calendar.**
- Every deadline above fans out into per-client work items weeks earlier: the scadenzario (area 08) is this table exploded across the client base.

---

### Reading the rhythm for automation

- Automation value is **peak-shaving**: anything that removes mechanical work from March–June and September–November is worth multiples of its average-load value.
- The month's 1–16 arc (close → liquidate → notify → pay → confirm) is the tightest recurring loop and the natural first end-to-end automation target.
- Seasonality implies **campaign patterns** (CU batch, document harvest, bilanci choreography, dichiarativi pipeline) — agent workflows should be modeled as campaigns over the client portfolio, not just as single-client tasks.


---

## Focus — La corsa al 20 luglio 2026: il crunch dei versamenti per le partite IVA

_Added 2026-07-06. Unlike the rest of this file, this chapter's dates were verified against live 2026 sources (D.L. 22 maggio 2026, n. 89, art. 6) — it describes a real, currently-running deadline event._

### The event

With **D.L. 89/2026**, the deadline for the **saldo imposte 2025 + primo acconto 2026** was prorogated from 30/6 to **20 luglio 2026** — without maggiorazione — for the categories that make up the bulk of every studio's client base:

- **Soggetti ISA** (imprese e professionisti with approved Indici Sintetici di Affidabilità);
- **Forfettari** and **regime di vantaggio**;
- **Soci of trasparenza entities** (artt. 5, 115, 116 TUIR — snc, sas, associazioni professionali, srl trasparenti), who inherit the proroga personally.

A second window runs to **20 agosto 2026 with +0,80%** maggiorazione. Everyone outside the perimeter (dipendenti/pensionati with 730-related payments, non-ISA companies) stayed on the ordinary 30/6 (or 30/7 +0,4%) track.

The scope of what must be paid by 20/7 is wide: **IRPEF/IRES/IRAP saldo e primo acconto, imposta sostitutiva dei forfettari, cedolare secca, IVIE/IVAFE, saldo IVA 2025** (if deferred to the redditi deadline), **contributi previdenziali INPS eccedenti il minimale, diritto camerale**.

### Why this is a studio-crushing moment

The proroga concentrates, into two working weeks of July, a workload that is *per-client* and *cannot start early* for many clients (you can't finalize imposte until the client's dichiarativo data is complete):

1. **Collect & verify inputs** — before anything can be computed, every client's source data must be *in* and *complete*: CU, fatture attive/passive, estratti conto, spese detraibili/deducibili, rimanenze, foreign-asset statements. The universal blocker is the client who hasn't sent it all (chapter 09's document chase at peak intensity): you cannot start their computation, and today you discover the gaps one client at a time, by hand. This is the least glamorous and most decisive step — it gates the whole crunch.
2. **Import & extract** — pull the numbers into a workable form: gestionale exports, the draft F24 the software already produced, the dichiarativo prints, PDFs and scans the client emailed. Trivial per document, brutal at portfolio scale, and error-prone when done by re-keying.
3. **Compute** — for every partita IVA client: finalize the quadro d'impresa/lavoro autonomo, run ISA, compute saldo + acconti, compute contributi INPS a conguaglio (gestione separata / artigiani e commercianti eccedenze), decide rateizzazione.
4. **Decide** — the two judgment moments: **acconto storico vs previsionale** (clients whose 2026 is going worse want to pay less now — a liability-sensitive call) and **ISA adeguamento**.
5. **Communicate** — every client must receive amounts, F24s, rate plans, and explanations — then actually pay ("pagato?" ping-pong; addebito mandates to verify).
6. **Absorb the panic** — the question wave peaks exactly now: "quanto pagherò?", "posso rateizzare?", "e se non pago?", "rientro nella proroga?" — multiplied across the whole portfolio, in the same days.
7. **Handle the can't-pays** — clients without liquidity need rate plans, the 20/8 +0,80% assessment, or a ravvedimento strategy — each a mini-consultation.

Cross-references: the mechanics live in chapter 02 (*Calcolo imposte, acconti e F24*, *ISA*, *Redditi PF/SP/SC*), the judgment in 04 (*tax planning*), the communication loops in 09, the orchestration in 08 (*scadenzario*). The July peak was already visible in chapter 10's anno tipo; D.L. 89/2026 made 2026's version sharper by moving the mountain to a single date.

### The most urgent minimum set — the wedge (Tier 0)

With ~14 days to 20/7, the binding constraint is not *what's valuable* but *what ships and gets adopted with zero integration time*. That collapses the priority list to the tasks that **(a) gate everything downstream** and **(b) need no live portal connection** — they run on data the studio already holds, in draft-for-approval mode, so there is nothing to authenticate and no liability transferred. Deliberately **unglamorous**: the wedge is the trivial upstream plumbing plus one calculation, because that is exactly where the two weeks are lost. Ordered by dependency, not glamour.

1. **Client-data completeness check & targeted sollecito** *(the gate)* — per client type, hold the checklist of what the dichiarativo needs (CU, fatture, estratti conto, spese detraibili/deducibili, rimanenze, RW statements), diff it against what has actually arrived, and draft a **specific** chase message ("mancano: estratto conto Q4, fattura ACME di dicembre") — not a generic reminder. This is the single highest-ROI item: it unblocks computation and it can start *today*, before any number is touched. Mostly rule-based; the only judgment is per-client checklist tailoring.
2. **Data import & extraction** — ingest gestionale exports (CSV/Excel), parse the **draft F24 / dichiarativo PDFs** the software already produced, and pull figures from client-emailed PDFs and scans (OCR for the paper ones). Turns re-keying into extract-and-confirm. Pure mechanical work, ~95% rule-based, and the enabler for everything after it — the calculator is only as fast as the numbers reaching it.
3. **Prospetto acconti & rate (the calculator)** — from the extracted figures, compute the client-ready one-pager: **saldo + primo acconto** due 20/7 (vs 20/8 +0,80%); **acconto storico** (100% of rigo RN34, split **40% now / 60% by 30/11**) beside the **previsionale** option with the risk line explicit (under-paying below the **20% tolerance** → **30% sanzione** + interessi); and the **rateizzazione plan** (up to **7 rate ending 16/12**, **4% annual interest**, per-rate amounts + F24 rateazione codes). Near-zero error risk (arithmetic, fully verifiable); replaces the per-client Excel session that eats professional hours when there are none. Decision stays human.
4. **Client communication drafter** — take the prospetto and draft the personalized "here's what/when/options, confirm me" message in the studio's tone, draft-for-approval, tracking who's been told and who confirmed. Also fields the panic wave ("rientro nella proroga? posso rateizzare?") from the client's own computed data. Attacks the interrupt load that makes the peak unbearable (chapter 09 at maximum intensity). LLM-native, zero integration.

Steps 1→4 form one dependency chain (collect → extract → compute → communicate). Shipping all four is still a small build because none needs a vendor API — see the tools table.

### Tools & integrations required

The wedge's whole de-risking move is that its tools are **document/data ingestion + a messaging channel**, *not* live portal connectors. Deeper integrations belong to the second turn, once adoption has earned the access.

| Task (Tier 0 wedge) | Tool / integration needed | Integration cost |
|---|---|---|
| Completeness check & sollecito | Per-client-type **checklist ruleset** (internal); a place to see what arrived — a watched **folder / cloud drive**, or read-only **email/PEC** access (IMAP / Gmail MCP); a **messaging channel** to send (email, WhatsApp Business API, or PEC) | Low — file/inbox read + outbound message; no fiscal portal |
| Data import & extraction | **Document-parsing/extraction** capability (structured PDF + CSV/Excel parse, **OCR** for scans) over gestionale exports and draft F24/dichiarativo prints | Low — file ingestion only; no vendor API |
| Prospetto calculator | None beyond the extracted numbers — a **rules engine** encoding the 2026 acconto/rateizzazione/proroga math (D.L. 89/2026) | None — pure computation |
| Communication drafter | LLM drafting + the same **messaging channel** as the sollecito; lightweight **status store** (sent / confirmed) | Low — shared with task 1 |

| Task (Tier 1 — second turn) | Tool / integration needed | Integration cost |
|---|---|---|
| Perimeter classifier (auto) | **Gestionale MCP** for portfolio attributes (regime, ATECO, ISA flag, participation links) — Fatture in Cloud has a usable API; most others don't (see `brainstorms/gestionali-mercato-e-api.md`) | Medium — per-vendor |
| Campaign orchestrator on scadenzario | **Gestionale/scadenzario integration** + persistent state store | Medium–High |
| F24 builder & auto-dispatch | **Entratel / Desktop Telematico** channel for F24 telematici + addebito; compensazione check vs **cassetto fiscale** (delega) | High — regulated channels, liability |
| Payment verification & late-payer recovery | **Cassetto fiscale** (quietanze/versamenti via delega) + ravvedimento rules engine | High — delega + AdE access |

### Product note

Ship the four Tier-0 Skills for 20/7 and you have the wedge: value in the acute moment with **no setup**, which earns the trust and data access that make the Tier-1 integrations sellable later — that's the flywheel. And the event is a template, not a one-off: the same chain re-fires for the **30/11 secondo acconto** (same previsionale decision), next year's saldo/acconto, and every 16-of-the-month cycle in miniature. Building for the 20 luglio 2026 crunch means building the studio's **campaign engine** — the profession's recurring shape of stress (chapter 10: value concentrates in peak-shaving). The marketing moment is equally real: commercialisti are living this pain *right now*, and "we take the 20 luglio off your back" is a pitch that needs no explanation.
