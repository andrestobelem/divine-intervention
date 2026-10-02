# Divine Intervention

A tiny playable Three.js prototype, built with TypeScript, Vite, and Bun. The scene has no external 3D assets: the sanctuary, altar, and pilgrim are assembled from Three.js geometry so you can start changing the world right away.

Released under the MIT License. See [LICENSE](./LICENSE).

## Get started

Install [Bun](https://bun.sh), then run:

```sh
bun install
bun run dev
```

Open the local URL printed by Vite. Create a production build with `bun run build`, or preview one with `bun run preview`.

## Controls

- **W A S D** or **arrow keys** — move
- **Space** — jump
- **E** — offer a prayer when you reach the altar

## Project map

```text
src/
  game/
    player.ts   # playable pilgrim
    scene.ts    # sanctuary, altar, lighting, and ambient details
  main.ts       # render loop, camera, input, and game state
  style.css     # menus, HUD, and responsive layout
```

The project is intentionally small and asset-free. Add systems or split modules as the game takes shape.
