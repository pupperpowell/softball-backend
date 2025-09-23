# softball-backend

This is an application that serves as a source of truth for Ultimate Softball Simulator. It is the "game engine", a collection of functions that act on data like players, teams, and so on.

The engine powers every single game run on Ultimate Softball Simulator. All games are exposed through a single WebSocket at once, and clients observe specific games by subscribe()ing to the unique ID of their game.

Even though the game engine could simulate thousands of games per second, games are deliberately slowed down to a speed that is realistic to follow.\*

\*Game.ts will need to be changed to implement this

https://bun.com/docs/api/websockets

Some questions to answer:

- ...how do you slow down a game?

---

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.17. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
