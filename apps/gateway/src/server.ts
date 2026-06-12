import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type RawData } from "ws";
import { createDefaultRegistry, loadConfig, WatchVoiceSession } from "../../../packages/core/src/index.js";

const config = loadConfig();
const registry = createDefaultRegistry(config);
const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, name: config.WATCHAGENT_PUBLIC_NAME }));
    return;
  }
  response.writeHead(404);
  response.end("not found");
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
  if (pathname !== "/watchagent/v1/" && pathname !== "/watchagent/v1") {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }
  const authorization = request.headers.authorization ?? "";
  if (authorization !== `Bearer ${config.DEVICE_AUTH_TOKEN}`) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws, request) => {
  const sessionId = randomUUID();
  const route = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
  const session = new WatchVoiceSession({
    sessionId,
    deviceId: singleHeader(request.headers["device-id"]),
    clientId: singleHeader(request.headers["client-id"]),
    route,
    registry,
    transport: {
      sendText: (text: string) => {
        if (ws.readyState === ws.OPEN) ws.send(text);
      },
      sendBinary: (data: Uint8Array) => {
        if (ws.readyState === ws.OPEN) ws.send(data, { binary: true });
      },
      close: (code?: number, reason?: string) => ws.close(code, reason)
    }
  });

  session.start().catch((error: unknown) => {
    console.error("Failed to start session", error);
    ws.close(1011, "session-start-failed");
  });

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      session.acceptAudio(toUint8Array(data));
      return;
    }
    session.handleText(data.toString()).catch((error: unknown) => {
      console.error("Session message failed", error);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "unknown error" }));
      }
    });
  });

  ws.on("close", () => {
    session.finish().catch((error: unknown) => console.error("Failed to finish session", error));
  });
});

server.listen(config.GATEWAY_PORT, () => {
  console.log(`${config.WATCHAGENT_PUBLIC_NAME} gateway listening on ws://localhost:${config.GATEWAY_PORT}/watchagent/v1`);
});

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toUint8Array(data: RawData): Uint8Array {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}
