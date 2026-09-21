"use node";
import WebSocket from "ws";
import { v } from "convex/values";
import { internalAction, env } from "./_generated/server";

// Explicit operator smoke test only. No user microphone, records, research or tools.
// At most 8 seconds of silence after start, then graceful close; 25s hard timeout.
export const probe = internalAction({ args: {}, returns: v.object({ started: v.boolean(), audioReceived: v.boolean(), transcriptReceived: v.boolean(), closed: v.boolean(), failure: v.string() }), handler: async () => {
  if (!env.OPENAI_API_KEY) return { started: false, audioReceived: false, transcriptReceived: false, closed: false, failure: "not_configured" };
  return await new Promise<{ started: boolean; audioReceived: boolean; transcriptReceived: boolean; closed: boolean; failure: string }>(resolve => {
    const result = { started: false, audioReceived: false, transcriptReceived: false, closed: false, failure: "" };
    const socket = new WebSocket("wss://api.openai.com/v1/live/sessions", { headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, handshakeTimeout: 10000 });
    let interval: ReturnType<typeof setInterval> | undefined;
    let closing: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const finish = () => { if (settled) return; settled = true; clearTimeout(timeout); clearTimeout(closing); clearInterval(interval); socket.terminate(); resolve(result); };
    const timeout = setTimeout(() => { result.failure = "probe_timeout"; finish(); }, 25000);
    socket.on("open", () => socket.send(JSON.stringify({ type: "session.start", session: { model: "gpt-live-1", store: false, delegation: { type: "client" }, instructions: "You are an AI voice. Say: Hello, Life Maxim voice is connected. Then listen quietly. Do not delegate or call tools.", audio: { format: { type: "audio/pcm", rate: 24000 } } } })));
    socket.on("message", bytes => {
      let event; try { event = JSON.parse(bytes.toString()); } catch { return; }
      if (event.type === "session.started" && !result.started) {
        result.started = true;
        interval = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "session.input_audio.append", audio: Buffer.alloc(4800).toString("base64") })); }, 100);
        closing = setTimeout(() => { clearInterval(interval); if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "session.close" })); }, 8000);
      }
      if (event.type === "session.output_audio.delta") result.audioReceived = true;
      if (event.type === "session.output_transcript.delta") result.transcriptReceived = true;
      if (event.type === "session.closed") { result.closed = true; finish(); }
      if (event.type === "error") { result.failure = event.error?.code === "insufficient_quota" ? "insufficient_quota" : "provider_event_error"; if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "session.close" })); }
    });
    socket.on("unexpected-response", (_req, response) => { result.failure = `http_${response.statusCode}`; response.resume(); finish(); });
    socket.on("error", () => { result.failure ||= "connection_error"; finish(); });
    socket.on("close", () => { if (!result.closed) result.failure ||= "closed_without_final_event"; finish(); });
  });
} });
