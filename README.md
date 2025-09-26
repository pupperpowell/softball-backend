# softball-backend

This is an application that serves as a source of truth for Ultimate Softball Simulator. It is the "game engine", a collection of functions that act on data like players, teams, and so on.

The engine powers every single game run on Ultimate Softball Simulator. All live games are exposed through a single WebSocket at once, and clients observe specific games by subscribe()ing to the unique ID of their game.

Even though the game engine could simulate many thousands of complete games per second, games are deliberately slowed down to a speed that is realistic to follow.

Advantages of this:

- It allows for real-time interactivity in games (manager decisions, cheering, etc.)
- Impossible to accidentally log statistics for games that haven't happened yet

Disadvantages:

- All live games must be stored in system memory

While we _could_ generate the games all at once, and then feed them to clients piece by piece, this prevents any real-time interactivity with the game, which we plan to add (albeit in small ways) in the future.

https://bun.com/docs/api/websockets

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
