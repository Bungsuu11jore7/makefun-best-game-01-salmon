# Salmon Song — build notes

- 2026-11-18 ~04:3x WIB: repo created. Kit RULES.txt read; vendor/makefun-game.ts
  copied verbatim (diff-verified); LICENSE copied from kit starter (MIT, SPDX first
  line); .makefun/owner.json copied byte-exact (58 bytes) from platformer entry.
- Game: river-run arcade, 3 rivers (Gentle Creek / The Rapids / The Falls),
  mouse steer + leap + dive, stamina/flies/eddies, herons (telegraphed), bears,
  rocks, falls walls. Screens: title / play / paused / win / over. WebAudio synth
  only. Canvas 2D, no libraries. Source split: config, rng, levels, world,
  render, input, audio, particles, shots, main.
- Badge pattern copied from makefun-coolest-art README (badge/best-game-01,
  handle Bungsuu11jore7, entry salmon-song); footer ref 6wtj6288.
- Fixes during verification (all re-shot + re-verified after each):
  * Headless Chrome `--headless=new` viewport is 87px shorter than the window,
    leaving a bare strip at the bottom of screenshots. Shot mode pins the
    canvas to exactly 1280x720, and screenshots are taken with `--headless=old`,
    whose viewport is exactly 1280x720. No image editing; the PNGs are raw
    browser renders.
  * Invulnerable salmon blinked fully invisible — now flickers at 0.35 alpha.
  * Leap arc could lift the salmon behind the HUD bar — leap height is now
    capped so the salmon stays below y=85; falls clearance threshold 120→80.
  * Flies drifted too slowly to ever be eaten (60/s) — now 150/s.
  * HUD fly emoji overlapped the score — now plain "FLIES n" text.
  * Run too fast (26s) and pilot died in river 2: swim speeds 150/165/175 →
    120/130/140, currents 26/52/68 → 30/55/70, leap cost 12→8, swim drain 9→6,
    fly stamina 18→22, rock gap river 1 2.6→3.2s. Pilot now picks the safest
    lane among 250/420/590 when rocks are near instead of chasing flies
    through a rock's lane; leap window scales with the river's rock speed.
- VERIFICATION (final, 2026-11-18 ~05:3x WIB):
  * `MAKEFUN_OUTPUT_DIR=out node main.ts` exit 0; dossier.json 668,056 bytes.
  * Sandbox double-run as uid 65534 (nobody): both exit 0, dossier sha256
    6a65372099d5d910a375f3649106f01d4807dbd2f5ec8b0a90318a6e33c8e69f — identical
    across both sandbox runs and the local run.
  * Plain load (no ?shot) renders the title screen, no console errors.
  * Win test (Node, same goodPilot as shots.js): seeds 1–5 ALL WIN in 38.7s,
    scores 4625–5025. Earlier failure (pilot died in river 2) was a pilot
    bug, fixed as above — game itself was always winnable (seed 2 won first).
  * Sizes: game/ 11 files, 53,685 bytes; screenshots 1280x720, 164,468 /
    99,265 / 100,356 / 94,324 bytes (all ≤256 KiB); dossier 668,056 ≤1.5 MiB.
    No http(s) strings anywhere under game/.
  * Screenshots viewed: 1-start title (gorgeous, readable), 2-play Gentle
    Creek HUD + salmon + rocks/eddies/flies, 3-rapids The Falls — salmon
    mid-leap, heron diving, falls wall + LEAP!, heron shadow + "!" telegraph,
    4-end results panel (score 2235, best, restart prompt).
