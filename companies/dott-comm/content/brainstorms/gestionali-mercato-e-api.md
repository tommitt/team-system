---
title: Gestionali per studi commercialisti in Italia — mercato e API
status: draft
owner: ttassi
updated: 2026-07-06
tags: [mcp, gestionali, api, ricerca, esplorazione]
---

# Gestionali per studi commercialisti in Italia — mercato e API

> Brainstorm — exploratory, not a decision. When this resolves, capture the
> outcome as an ADR in `decisions/` and fold it into `knowledge/`.

## Problem / question

Quali gestionali usano di più gli studi di commercialisti in Italia, e quali
espongono API raggiungibili da terzi? Risponde alla open question già presente
in [`catalogo-skills-tools.md`](catalogo-skills-tools.md) ("API dei gestionali:
TeamSystem/Zucchetti/Profis espongono API utilizzabili da terzi?"), rilevante
per decidere T2/T3.

Metodo: ricerca con fan-out di ricerche web + verifica avversariale a 3 voti per
claim (uno scarto per claim con ≥2/3 voti di refutazione). Diversi numeri
inizialmente promettenti sono stati scartati in verifica — vedi sotto.

## Cosa sappiamo con confidenza alta

**Non esiste una fonte pubblica con percentuali di quota di mercato per
gestionale.** Né CNDCEC, né ANC, né AssoSoftware, né system integrator
indipendenti pubblicano una classifica. Vari numeri che sembravano solidi si
sono rivelati marketing auto-riferito o aneddoti da forum spacciati per
tendenza — vedi "Claim scartati" sotto.

Segnali di dimensione (non di quota di mercato) verificati su fonte primaria:

- **TeamSystem**: 2,5M+ clienti attivi (2024, +20% YoY), fatturato €1 mld
  (+19% YoY) — Data Manager, mag. 2025, corroborato da fonti multiple
  indipendenti (Il Sole 24 Ore, Industria Italiana). Gruppo cresciuto per
  acquisizioni: Danea Soft (2012), MadBit Entertainment/Fatture in Cloud
  (51% nel 2015, **fusa per incorporazione diretta in TeamSystem S.p.A. nel
  2025** — non più controllata, è TeamSystem), Euroconference (dal 1989),
  Microntel, Euroges.
- **Zucchetti**: sondaggio "Osservatorio Professionisti 2025" su 1.000+ studi
  commercialisti e consulenti del lavoro — comunicato Zucchetti, dic. 2024.
  31% prevede di aumentare gli investimenti in software nei prossimi 12 mesi
  (+7pp vs sondaggio precedente); 81% riconosce potenziale positivo dell'AI.
  Nessun dato di quota di mercato per prodotto nel comunicato.
- **Fatture in Cloud**: 500.000+ aziende clienti in Italia —
  developers.fattureincloud.it.
- Nessun articolo comparativo trovato (pitv.it, lucasammarco.com) riporta
  percentuali di adozione verificabili — confermato via fetch diretto ripetuto.

## API pubbliche per gestionale

| Gestionale | API pubbliche | Dettaglio |
|---|---|---|
| **Fatture in Cloud** (gruppo TeamSystem) | ✅ Sì | `developers.fattureincloud.it` — API v2 REST documentate, SDK ufficiali, guide, roadmap pubblica, community GitHub Discussions. Il candidato più "MCP-friendly" trovato. |
| **TeamSystem** (Studio, ViaLibera, Digital Box) | ⚠️ Incerto | Portale `development.teamsystem.com` esiste ma contenuto non accessibile/renderizzato pubblicamente in questa ricerca — da verificare con richiesta diretta/account partner. |
| **Zucchetti** (Ago/Infinity) | ❌ No per lo studio | API pubbliche via portale "Servizi-IT" (`help.zucchetti.it/.../api-pubbliche`, stile OpenAPI, console su serviziit.zucchetti.it) coprono l'**infrastruttura IT/hosting** Zucchetti, non il gestionale per studi commercialisti. Nessuna API pubblica trovata per Ago/Infinity specificamente. |
| **Passepartout** (Mexal) | ❌ Non trovate | Integratori terzi esistono (bindCommerce per e-commerce) ma il meccanismo tecnico non è dichiarato pubblicamente — probabile file/DB, non API REST documentata. |
| **Sistemi** (STUDIO) | ❌ No | Solo sync calendario (Exchange/Office365/Google) ed export verso Excel/Power BI. Nessun developer program. |
| Wolters Kluwer, Buffetti, Namirial, Datalog | ❓ Non approfondito | Nessuna documentazione pubblica di API trovata in questo giro di ricerca; servirebbe una ricerca dedicata. |

## Claim scartati in verifica (per trasparenza)

- "TeamSystem leader europeo" → è linguaggio dei comunicati stampa propri di
  TeamSystem, non una valutazione indipendente.
- "Zucchetti Mago: 11.000 aziende / 40.000 utenti giornalieri" → il numero
  risale a una pagina di un singolo rivenditore locale (sit-web.it), non a
  Zucchetti corporate o a un sondaggio; inoltre Mago è un ERP per PMI
  manifatturiere, non il gestionale da studio (quello è Ago/Infinity).
- Vari commenti da forum del 2017 ("non conosco nessuno che usa TeamSystem",
  "il pacchetto costa 1.500€/anno in più", "molti consigliano Passepartout")
  → aneddoti isolati (spesso un solo utente) presentati come tendenza
  generale; scartati per overreach, non perché falsi in sé.

## MCP già esistenti

- [`aringad/fattureincloud-mcp`](https://github.com/aringad/fattureincloud-mcp)
  — server MCP open source (MIT) già funzionante per Fatture in Cloud. 23 tool:
  gestione fatture/note di credito/proforme (crea, aggiorna, duplica, elimina,
  invio SDI, conversione proforma→fattura), clienti/fornitori, centri di
  costo/ricavo, dashboard finanziaria annuale (fatturato, incassato,
  scaduto, margini), PDF. Autenticazione con token personale + company ID,
  chiamate dirette all'API (nessun intermediario, credenziali locali). 17
  star, 2 release (v2.0.0, mag. 2026), 39 test con copertura ≥80%. Manca
  volutamente la marcatura pagamenti (limite dell'API sui conti). Conferma
  che Fatture in Cloud è il gestionale più maturo per un'integrazione MCP —
  da valutare se riusare/fork invece di costruire T2 da zero.

## Open questions

- Verificare `development.teamsystem.com` con un account/richiesta diretta:
  copre Studio/ViaLibera con API scrivibili, o solo un catalogo prodotti?
- Le API "Servizi-IT" di Zucchetti hanno un endpoint dedicato per
  Ago/Infinity non emerso in questa ricerca, o sono davvero solo
  infrastruttura IT?
- Wolters Kluwer, Buffetti, Namirial, Datalog: nessuna API pubblica trovata,
  ma non è stata una ricerca esaustiva per questi vendor — da approfondire se
  emergono come gestionale prevalente in uno studio pilota.

## Leaning toward

Per T2 (recupero fatture elettroniche), **Fatture in Cloud è il primo
connettore da valutare**: unica API self-service pubblica e documentata tra i
gestionali esaminati, e con un MCP open source già esistente
([`aringad/fattureincloud-mcp`](https://github.com/aringad/fattureincloud-mcp))
da cui partire (fork/riuso) invece di costruire da zero. Per T3 (scrittura sul
gestionale di studio) nessuna API aperta è emersa: probabile necessità di
partnership diretta col vendor, il che alza sforzo/costo. La scelta finale del
primo connettore resta comunque da guidare in base a cosa usano realmente gli
studi pilota, non da assunzioni di quota di mercato — coerente con quanto già
scritto in [`catalogo-skills-tools.md`](catalogo-skills-tools.md).
