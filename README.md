# Divine Intervention

A short, asset-free Three.js adventure prototype built with TypeScript, Vite, and Bun. In **Milagros prestados**, you are a pilgrim who can move growth between plants: one gains exactly what the other gives. Exchanges can be reversed. Explore one continuous sanctuary garden, restore a bridge, choose between two routes with a shared growth budget, and uncover what the roots are feeding beneath the stones.

The target experience is 10–15 minutes; that duration has not yet been measured with players. The project uses procedural geometry and Web Audio, with no external game assets or added audio dependencies.

Released under the MIT License. See [LICENSE](./LICENSE).

## Get started

Install [Bun](https://bun.sh), then run:

```sh
bun install
bun run dev
```

Create a production build with `bun run build`, run the project's test command with `bun run test`, or preview a build with `bun run preview`.

## Controls

- **W A S D** or **arrow keys** — move
- **Click a donor plant, then a receiver plant** — select a growth transfer
- **Hold E** — transfer growth
- **X** — swap donor and receiver
- **Escape** — clear the selection
- **Z** — undo a transfer and return to a safe position
- **R** — restart the whole sanctuary
- **Sound button** — mute or restore sound

There is no jump.

## Project map

```text
src/
  game/
    audio.ts    # synthesized ambience, transfer tone, and progress/reveal chords
    growth.ts   # conserved growth, capacities, transfer history, and undo
    level.ts    # plants, growth budgets, surfaces, and interaction range
    navigation.ts # collision and gradual living surfaces
    player.ts   # playable pilgrim
    scene.ts    # sanctuary and garden
  main.ts       # render loop, camera, input, and game state
  style.css    # menus, HUD, and responsive layout
docs/
  design.md     # concept, controls, scope, audio, and playtest goals
```

The audio starts only after the player selects **Enter**, in response to a user action required by browsers. The game remains playable when Web Audio is unavailable.

The prototype's design and playtest goals are documented in [docs/design.md](./docs/design.md). A human playtest is still needed to validate the target duration and clarity of the growth-transfer rule.
