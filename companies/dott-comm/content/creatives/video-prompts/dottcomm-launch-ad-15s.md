---
title: DottComm launch ad — 15s social video prompt
status: active
owner: pvalfre
updated: 2026-07-07
tags: [creatives, ads, video-prompt, launch, social, text-to-video]
---

# DottComm launch ad — 15s social video prompt

A ready-to-use text-to-video prompt for DottComm's launch advertisement. Story:
an overwhelmed *dottore commercialista* buried in paperwork turns to his PC and,
thanks to the solution, the chaos resolves into calm order around him —
impossible-to-solve becoming solved. 15 seconds, vertical 9:16, music only (no
voiceover, no on-screen text except the final logo card).

Closing card is a single lockup: **DottComm logo · "for" · Claude logo** on a
cool abstract background — signalling DottComm is a plugin built *for* Claude,
not a standalone agent.

## Master prompt (paste this)

> **Cinematic 15-second social advertisement. No on-screen text, no dialogue, no voiceover — music only. Vertical 9:16, 4K, photorealistic live-action, shot on a full-frame cinema camera with a 35mm lens, shallow depth of field, natural warm office light with soft window backlight, gentle film grain, high dynamic range, realistic skin texture and micro-expressions. One continuous story with a single decisive turn: from impossible-to-solve chaos to calm, effortless mastery. NOT animated, NOT cartoon, NOT CGI characters — a real human being.**
>
> **Subject:** a real Italian *dottore commercialista* (chartered accountant), a man in his late 40s, rumpled white dress shirt with sleeves pushed up and a loosened tie, glasses, light stubble, a tired but likeable, expressive face. He stays seated at his desk the entire time — the world changes around him, he does not perform tricks.
>
> **Seconds 0–6 — OVERWHELM (handheld, slightly claustrophobic, cool desaturated color):** He sits at a cramped desk buried under towering stacks of folders, tax forms, receipts and sticky notes. A phone rings, a printer keeps spitting pages, papers slide and topple. The camera pushes slowly in as the clutter seems to close around him. He rubs his temples, exhales, shoulders sinking — a man quietly drowning, hopelessly behind. Hold one beat on his defeated face lit by the cold glow of an old screen.
>
> **Seconds 6–8 — THE TURN (the single pivot):** His eyes flick to the laptop. He straightens, rests his hands on the keyboard, and begins to type. A soft warm light blooms from the screen across his face. The ringing softens; the room stills. His expression shifts — exhaustion melting into quiet, dawning wonder.
>
> **Seconds 8–13 — THE RESOLUTION (locked-off elegant frame, time-lapse magic, in-camera photoreal):** As he keeps typing, calm and focused, the chaos organizes itself around him as if by an invisible hand. In smooth accelerated motion the toppling stacks lift and settle into neat aligned rows; scattered receipts glide into tidy piles; the paper avalanche reverses into order; the printer falls quiet. Cool tones warm into rich golden light; the desaturated room saturates into something bright, clean and calm. He is still simply sitting at the PC, unhurried, faintly smiling — surrounded now by order instead of chaos. The transformation is the hero, not the man. His feeling: relief, control, quiet triumph — everything solved, effortlessly.
>
> **Seconds 13–15 — LOGO CARD:** Gentle cut to an elegant, premium closing frame set against a cool abstract background — soft flowing gradients and subtle geometric light patterns, deep blues and warm accent tones, gently drifting, tasteful and modern, out of focus enough to never distract. Centered on it, a single clean horizontal lockup reads as one line: the DottComm logo [IMAGE img2], then the lowercase word "for", then the Claude logo [IMAGE img1] — signalling DottComm is built for Claude. The lockup is crisp and perfectly centered with generous negative space; the background drifts slowly while the logos hold rock-steady for the final beat.
>
> **Music (one continuous track, no lyrics, no voiceover):** an ironic, cheerful, bouncy jingle. In the overwhelm it is light and comedic with a touch of playful "poor guy" whimsy — plucky pizzicato strings, a walking tuba or bassoon bassline. The instant the screen glows and the room begins to resolve, it swells into a warm, joyful, feel-good hook — bright ukulele, glockenspiel, soft handclaps, major key, uplifting. It resolves cleanly on the logo card with one final satisfying chime. Music leads throughout; any sound effects stay subtle and never overpower it.
>
> **Overall:** feel-good, premium, cinematic, shareable. A clear, satisfying before/after: impossible → solved. Photoreal from first frame to the logo card. Absolutely no text, captions or overlays anywhere except the final logo card.

## Beat sheet

| Time | Beat | Look | Feeling |
|------|------|------|---------|
| 0–6s | Overwhelm | Cool, desaturated, cramped, slow push-in, paper avalanche | Drowning, hopeless |
| 6–8s | The turn | Warm glow blooms from laptop, room stills | Exhaustion → wonder |
| 8–13s | Resolution | Locked frame, golden warm light, chaos self-organizes into order | Relief, quiet triumph |
| 13–15s | Logo card | Cool abstract bg · **DottComm** · "for" · **Claude** | Calm, premium |

## Production notes

1. **Build the closing card in the edit, not the model.** Text-to-video models
   can't reliably place real logo files or render the clean word "for" without
   garbling letterforms. Generate **seconds 0–13** (the live-action story) with
   this prompt, then composite the closing card yourself as a clean ~2s graphic:
   the cool abstract background (you can even render that background *from* the
   model as a silent loop), with the real DottComm logo, the word "for", and the
   Claude logo crisply on top. The `[IMAGE img2 / img1]` tags are placeholders
   for that composite unless your specific tool has explicit image-input slots.
2. **If your model supports a start frame,** feed it a still of a real cluttered
   accountant's desk to lock the photoreal look and stop it drifting toward CGI.

## Assets referenced

- `img2` — DottComm logo (closing card, left of "for")
- `img1` — Claude logo (closing card, right of "for")
- Domain for reference in comms: `dottcomm.dev`
