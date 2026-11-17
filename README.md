# Salmon Song

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Bungsuu11jore7/salmon-song/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Bungsuu11jore7/salmon-song/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Swim home. Leap the falls. Dodge the heron.**

A river-run arcade game. You are a salmon swimming upstream through
three named rivers — Gentle Creek, The Rapids, and The Falls — to reach
the spawning grounds. The current never stops pushing you back, swimming
drains your stamina, and the river is full of rocks, herons and bears.

## How to play

- **Goal:** reach the spawning grounds at the end of river 3. Lose all
  3 lives and the river wins.
- **Mouse steers** — the salmon follows your pointer with a lag.
- **SPACE or Click — LEAP:** arc over rocks and falls, and snatch flies
  out of the air. Costs a little stamina.
- **S / Down (hold) — DIVE:** sink deep to dodge a heron's strike.
- **Eat flies** to refill stamina; **rest in calm eddies** (pale rings)
  to recover faster.
- **Herons** telegraph with a shadow and ripples — dive or swim away.
  **Bears** swipe at the banks in river 3 — keep to mid-river.
- **P** pause · **M** mute · **R** restart · **Enter / Click** start.

Score = distance swum + flies eaten + a time bonus for finishing fast.
Your best score is shown on the results screen.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

No build step, no network, no libraries: plain static files under
`game/`, all art drawn on canvas and all sound synthesized with WebAudio.
Screenshots are deterministic renders of the game itself
(`game/src/shots.js`, `?shot=start|play|rapids|end`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=6wtj6288&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
