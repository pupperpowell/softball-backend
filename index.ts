/**
 * Bun WebSocket server on ws://localhost:2004/ws
 * - Every 2 seconds, broadcasts a debug message to all connected clients
 * - Uses Bun&#39;s built-in WebSocket & publish/subscribe
 * - Health endpoint: http://localhost:2004/health
 */

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: 2004,

  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade endpoint
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return undefined; // Handshake handled by Bun
      }
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    // Simple health check
    if (url.pathname === "/health") {
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }

    // Default info route
    return new Response(
      "Softball backend WebSocket server is running. Connect to ws://localhost:2004/ws",
      { headers: { "content-type": "text/plain" } },
    );
  },

  websocket: {
    // When a client connects
    open(ws) {
      // Subscribe this socket to the &#39;debug&#39; topic so it receives broadcasts
      ws.subscribe("debug");

      // Optional welcome message
      ws.send(
        JSON.stringify({
          type: "welcome",
          message: "Connected to debug stream",
          intervalMs: 2000,
        }),
      );
    },

    // Echo basic messages / handle simple commands (optional)
    message(ws, message) {
      try {
        if (typeof message === "string") {
          if (message.toLowerCase() === "ping") {
            ws.send("pong");
            return;
          }
        }
      } catch {
        // ignore parse/handler errors
      }
    },

    // Cleanup hooks if needed
    close(_ws, _code, _reason) {
      // No-op; Bun handles socket lifecycle
    },
  },
});

console.log(
  `WebSocket server listening at ws://localhost:${server.port}/ws (health: http://localhost:${server.port}/health)`,
);

// Broadcast a debug message to all subscribers every 2 seconds
function buildDebugPayload() {
  return {
    type: "debug",
    timestamp: new Date().toISOString(),
    message: "Periodic debug broadcast",
  };
}

setInterval(() => {
  const payload = buildDebugPayload();
  server.publish("debug", JSON.stringify(payload));
}, 2000);
