export async function GET() {
  return Response.json({
    ok: true,
    name: process.env.WATCHAGENT_PUBLIC_NAME ?? "WatchAgent",
    gatewayUrl: process.env.WATCHAGENT_GATEWAY_URL ?? "ws://localhost:8000/watchagent/v1"
  });
}
