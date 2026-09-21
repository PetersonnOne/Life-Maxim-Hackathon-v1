"use client";
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Mic, MicOff, Square, Sparkles, ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AIProfileSuggestion, AIGuidance } from "@/components/ai-intelligence";
import { ResearchPanel } from "@/components/research-panel";
import { PlanningPanel } from "@/components/planning-panel";

type Brief = { title: string; goal: string; context: string; questions: string };
const blank: Brief = { title: "", goal: "", context: "", questions: "" };
type Fragment = { id: string; speaker: "You" | "Life Maxim"; text: string; start: number; end: number };
function captionRows(fragments: Fragment[]) {
  const rows: Fragment[] = [];
  for (const fragment of fragments) {
    const last = rows.at(-1);
    if (last && last.speaker === fragment.speaker && fragment.start - last.end < 1500) { last.text += fragment.text; last.end = Math.max(last.end, fragment.end); }
    else rows.push({ ...fragment });
  }
  return rows;
}

export function InteractiveMode({ profiles, onBack, onCreateProfile }: { profiles: Doc<"profiles">[]; onBack: () => void; onCreateProfile: () => void }) {
  const [sessionId, setSessionId] = useState<Id<"interactiveSessions"> | null>(null);
  const [profileId, setProfileId] = useState<Id<"profiles"> | "">("");
  const [entryId, setEntryId] = useState<Id<"objectives"> | "">("");
  const [draft, setDraft] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const create = useMutation(api.interactive.create);
  const sessions = useQuery(api.interactive.list);
  const entries = useQuery(api.objectives.list, profileId ? { profileId } : "skip");
  if (sessionId) return <InteractiveSession key={sessionId} id={sessionId} profiles={profiles} onBack={() => setSessionId(null)} onUserMode={onBack}/>;
  return <section className="interactive-mode"><Button variant="ghost" onClick={onBack}><ArrowLeft size={16}/>User Mode</Button><div className="page-heading"><div><span className="eyebrow">THINK IT THROUGH, TOGETHER</span><h1>Interactive Mode</h1><p>A conversation first. A clear, reviewed next step after.</p></div><Mic size={36}/></div>
    <div className="interactive-grid"><Card className="detail-card"><h2>Give this conversation a context.</h2><p>Choose a profile, create one, or ask AI to suggest one. Nothing listens until you explicitly start voice.</p>
      <Label htmlFor="interactive-profile">Profile</Label><select id="interactive-profile" value={profileId} onChange={e => { setProfileId(e.target.value as Id<"profiles">); setEntryId(""); }}><option value="">Choose a profile</option>{profiles.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
      <Button variant="outline" onClick={onCreateProfile}>Create a profile</Button>
      <details><summary>Suggest a profile with AI</summary><AIProfileSuggestion draft={draft} onDraftChange={setDraft} onConfirmed={id => { setProfileId(id); setEntryId(""); }}/></details>
      {profileId && <><Label htmlFor="interactive-entry">Discussion</Label><select id="interactive-entry" value={entryId} onChange={e => setEntryId(e.target.value as Id<"objectives">)}><option value="">New discussion</option>{entries?.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}</select><p>Only this profile’s confirmed context will be shared with the voice provider.</p></>}
      <Button disabled={!profileId || pending} onClick={async () => { const p = profiles.find(p => p._id === profileId); if (!p) return; setPending(true); setError(""); try { setSessionId(await create({ profileId: p._id, expectedUpdatedAt: p.updatedAt, objectiveId: entryId || undefined })); } catch { setError("Could not create this discussion. Confirm the profile and try again."); } finally { setPending(false); } }}>{pending ? "Opening…" : "Confirm profile and open discussion"}</Button>{error && <p role="alert">{error}</p>}
    </Card><Card className="detail-card"><h2>Return to a discussion</h2><p>Saved briefs resume here; microphone recordings and live captions are not saved.</p>{sessions === undefined ? <p>Loading…</p> : sessions.length ? sessions.map(s => <Button key={s._id} variant="outline" disabled={!profiles.some(p => p._id === s.profileId && p.updatedAt === s.profileUpdatedAt)} onClick={() => setSessionId(s._id)}>{s.brief?.title || "Unfinished discussion"} · {profiles.find(p => p._id === s.profileId)?.name || "Unavailable profile"}</Button>) : <p>Your first discussion can start on the left.</p>}</Card></div>
  </section>;
}

export function InteractiveSession({ id, profiles, onBack, onUserMode, compact = false }: { id: Id<"interactiveSessions">; profiles: Doc<"profiles">[]; onBack: () => void; onUserMode: () => void; compact?: boolean }) {
  const session = useQuery(api.interactive.get, { id });
  const voice = useQuery(api.interactive.voiceState, { sessionId: id });
  const startVoice = useAction(api.liveActions.start); const stopVoice = useMutation(api.interactive.stop);
  const prepare = useAction(api.liveActions.prepareBrief); const confirm = useMutation(api.interactive.confirm);
  const [status, setStatus] = useState("Voice is off"); const [busy, setBusy] = useState(false); const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false); const [error, setError] = useState(""); const [remaining, setRemaining] = useState(300);
  const [fragments, setFragments] = useState<Fragment[]>([]); const [notes, setNotes] = useState(""); const [brief, setBrief] = useState<Brief>(blank);
  const [review, setReview] = useState(false); const [working, setWorking] = useState(false); const [delegated, setDelegated] = useState(false);
  const peer = useRef<RTCPeerConnection | null>(null); const channel = useRef<RTCDataChannel | null>(null); const media = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null); const epoch = useRef(0); const mounted = useRef(true); const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seen = useRef(new Set<string>()); const latestInput = useRef(0); const expiry = useRef(0); const connecting = useRef(false);
  const profile = profiles.find(p => p._id === session?.profileId);
  const valid = Boolean(session && profile && profile.updatedAt === session.profileUpdatedAt && !profile.archived);
  const cleanup = () => { clearTimeout(timer.current); media.current?.getTracks().forEach(t => t.stop()); media.current = null; channel.current?.close(); channel.current = null; peer.current?.close(); peer.current = null; if (audio.current) audio.current.srcObject = null; connecting.current = false; };
  const stop = async () => {
    epoch.current++; setBusy(false); setConnected(false); setMuted(false); setStatus("Stopping voice…"); connecting.current = false;
    // Stop capture immediately, but keep the transport long enough for finalization.
    media.current?.getTracks().forEach(t => { t.enabled = false; });
    if (channel.current?.readyState === "open") channel.current.send(JSON.stringify({ type: "session.close" }));
    const closingPeer = peer.current;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (peer.current === closingPeer) cleanup(); }, 3000);
    try { await stopVoice({ sessionId: id }); if (mounted.current) setStatus("Microphone off · server cleanup requested"); } catch { if (mounted.current) setError("Could not confirm server hangup. The server time limit remains scheduled; do not start another connection."); }
  };
  const stopRef = useRef(stop);
  useEffect(() => { stopRef.current = stop; });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // This is a generation counter, not a DOM ref: invalidate the latest pending start.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      epoch.current++;
      cleanup(); void stopVoice({ sessionId: id }).catch(() => {});
    };
  }, [id, stopVoice]);
  useEffect(() => { if (!valid && (connected || busy)) void stopRef.current(); }, [valid, connected, busy]);
  useEffect(() => { if (voice?.status === "closed" || voice?.status === "uncertain") { if (connected) void stopRef.current(); } }, [voice?.status, connected]);
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => { const left = Math.max(0, Math.ceil((expiry.current - Date.now()) / 1000)); setRemaining(left); if (!left || Date.now() - latestInput.current > 90000) void stopRef.current(); }, 1000);
    const hidden = () => { if (document.hidden) void stopRef.current(); };
    document.addEventListener("visibilitychange", hidden);
    hidden();
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", hidden); };
  }, [connected]);
  async function start() {
    if (connecting.current || connected || !valid || (voice && voice.status !== "closed")) return;
    cleanup();
    connecting.current = true; const generation = ++epoch.current;
    setBusy(true); setError(""); setStatus("Requesting microphone…"); setFragments([]); seen.current.clear(); setMuted(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("Use a browser supporting WebRTC over a secure connection.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== epoch.current || document.hidden) { stream.getTracks().forEach(t => t.stop()); if (mounted.current) { setBusy(false); connecting.current = false; setStatus("Voice is off"); } return; }
      media.current = stream; const pc = new RTCPeerConnection(); peer.current = pc;
      pc.ontrack = event => { if (generation === epoch.current && audio.current) { audio.current.srcObject = new MediaStream([event.track]); void audio.current.play().catch(() => setStatus("Press play below to hear the AI.")); } };
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const dc = pc.createDataChannel("oai-events"); channel.current = dc;
      dc.onmessage = event => {
        if (dc !== channel.current) return;
        let data; try { data = JSON.parse(String(event.data)); } catch { return; }
        if (data.type === "session.closed") { cleanup(); if (mounted.current) { setConnected(false); setBusy(false); setStatus("Voice ended."); } void stopVoice({ sessionId: id }).catch(() => {}); return; }
        if (generation !== epoch.current) return;
        if (data.type === "session.started") { clearTimeout(timer.current); connecting.current = false; setBusy(false); setConnected(true); setStatus("Listening · AI voice"); latestInput.current = Date.now(); }
        if (data.type === "session.delegation.created") { setDelegated(true); const delegationId = data.delegation?.id; if (typeof delegationId === "string" && !seen.current.has(delegationId)) { seen.current.add(delegationId); dc.send(JSON.stringify({ type: "session.commentary.append", event_id: crypto.randomUUID(), delegation_id: delegationId, content: guidanceDiscussion ? "No backend work has started. Stop voice and use the separate research or planning controls if needed. This discussion stays grounded in the selected guidance." : "No backend work has started. Please use Prepare brief, review it, and confirm the handoff in the interface." })); } }
        if ((data.type === "session.input_transcript.delta" || data.type === "session.output_transcript.delta") && typeof data.delta === "string" && typeof data.event_id === "string" && Number.isFinite(data.start_ms) && Number.isFinite(data.end_ms) && !seen.current.has(data.event_id)) {
          seen.current.add(data.event_id); if (data.type === "session.input_transcript.delta") latestInput.current = Date.now();
          const fragment: Fragment = { id: data.event_id, speaker: data.type === "session.input_transcript.delta" ? "You" : "Life Maxim", text: data.delta.slice(0,2000), start: data.start_ms, end: data.end_ms };
          setFragments(current => [...current, fragment].sort((a,b) => a.start - b.start).slice(-600));
        }
        if (data.type === "error") setError("A voice command was rejected. Stop and reconnect if the conversation cannot continue.");
      };
      pc.onconnectionstatechange = () => { if (pc.connectionState === "failed") { setError("Voice connection lost. Reconnect explicitly when ready."); void stopRef.current(); } };
      dc.onclose = () => { if (generation === epoch.current && mounted.current) { setConnected(false); setBusy(false); setStatus("Voice disconnected."); void stopVoice({ sessionId: id }).catch(() => {}); } };
      await pc.setLocalDescription(await pc.createOffer());
      if (pc.iceGatheringState !== "complete") await new Promise<void>((resolve, reject) => { const timeout = setTimeout(() => { pc.removeEventListener("icegatheringstatechange", check); reject(new Error("Network setup timed out.")); }, 10000); function check() { if (pc.iceGatheringState === "complete") { clearTimeout(timeout); pc.removeEventListener("icegatheringstatechange", check); resolve(); } } pc.addEventListener("icegatheringstatechange", check); check(); });
      if (generation !== epoch.current || document.hidden) { cleanup(); if (mounted.current) setBusy(false); return; }
      setStatus("Connecting securely…");
      const result = await startVoice({ sessionId: id, requestId: crypto.randomUUID(), sdp: pc.localDescription?.sdp ?? "" });
      if (generation !== epoch.current || document.hidden) { cleanup(); if (mounted.current) setBusy(false); await stopVoice({ sessionId: id }); return; }
      expiry.current = result.expiresAt; setRemaining(Math.max(0, Math.ceil((result.expiresAt - Date.now()) / 1000)));
      await pc.setRemoteDescription({ type: "answer", sdp: result.sdp });
      if (connecting.current) timer.current = setTimeout(() => { setError("Voice did not become ready. No automatic retry was made."); void stopRef.current(); }, 15000);
    } catch (e) { cleanup(); if (mounted.current && generation === epoch.current) { setBusy(false); setConnected(false); setStatus("Voice is off"); setError(e instanceof ConvexError && typeof e.data === "string" ? e.data : e instanceof DOMException && e.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access before starting voice." : "Could not connect voice. Check your connection; no automatic paid retry was made."); } void stopVoice({ sessionId: id }).catch(() => {}); }
  }
  async function prepareBrief() { await stop(); setWorking(true); setError(""); try { const transcript = fragments.map(f => `${f.speaker}: ${f.text}`).join("\n"); setBrief(await prepare({ sessionId: id, transcript: (transcript + "\nUser notes: " + notes).slice(-12000) })); setReview(true); } catch { setReview(true); setError("AI brief preparation failed. Complete the fields manually or retry later."); } finally { setWorking(false); } }
  const saved = session?.brief;
  const guidanceDiscussion = compact || Boolean(session?.guidanceId);
  return <section className="interactive-mode"><div className="interactive-toolbar"><Button variant="ghost" onClick={async () => { await stop(); onBack(); }}><ArrowLeft size={16}/>Discussions</Button><Button variant="outline" onClick={async () => { await stop(); onUserMode(); }}>Back to User Mode</Button></div>
    <div className="page-heading"><div><span className="eyebrow">INTERACTIVE MODE · {profile?.name ?? "Loading profile"}</span><h1>{guidanceDiscussion ? "Let’s Explore This Guidance" : saved?.title || "Make room for a conversation."}</h1><p>{guidanceDiscussion ? "Grounded in this selected guidance—not other cards or profile history." : "GPT Live 1 listens and clarifies. Terra and Luna handle the deeper work."}</p></div></div>
    {!valid && session && <p role="alert">This profile changed or is unavailable. Start a new discussion to confirm the current context.</p>}
    <div className="interactive-grid"><Card className="interactive-voice"><div className={connected ? "voice-orb active" : "voice-orb"}><Mic size={42}/></div><h2 aria-live="polite">{status}</h2><p>{connected ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2,"0")} remaining` : "Voice starts only with your permission."}</p>{connected && remaining <= 60 && <p role="status">One minute or less remains. Prepare your brief to continue without voice charges.</p>}
      <div className="interactive-controls"><Button disabled={busy || connected || !valid || working || Boolean(voice && voice.status !== "closed")} onClick={() => void start()}><Mic size={16}/>{busy ? "Connecting…" : saved ? "Discuss results" : "Start voice"}</Button><Button variant="outline" disabled={!connected} onClick={() => { const next = !muted; media.current?.getTracks().forEach(t => { t.enabled = !next; }); if (channel.current?.readyState === "open") channel.current.send(JSON.stringify({ type: next ? "session.input_audio.mute" : "session.input_audio.unmute", event_id: crypto.randomUUID() })); setMuted(next); }}>{muted ? <MicOff size={16}/> : <Mic size={16}/>} {muted ? "Unmute" : "Mute"}</Button><Button variant="outline" onClick={() => void stop()}><Square size={16}/>Stop voice</Button></div>
      <audio ref={audio} autoPlay controls aria-label="AI voice playback"/>
      <p className="muted">This is an AI-generated voice. Starting shares microphone audio and this profile’s context with OpenAI. Life Maxim does not save raw audio or live captions. Confirmed briefs are saved.</p><p className="muted">Five-minute limit. Your plan’s monthly voice allowance applies, plus six starts per account daily and twelve shared across this deployment. Mute still uses voice time. Stop requests server hangup; reconnecting uses a new allowance. Voice stops when this tab is hidden or after 90 seconds without user transcript activity.</p><p>Server connection: {voice?.status ?? "not started"}. Final billed usage is not measured here.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
    </Card><Card className="detail-card"><h2>Conversation notes</h2><div className="live-captions" aria-label="Live captions" tabIndex={0}>{fragments.length ? captionRows(fragments).map(f => <p key={f.id} className={f.speaker === "You" ? "caption-user" : "caption-ai"}><small>{f.speaker}</small>{f.text}</p>) : <p>Your live captions appear here. You can also type your thoughts below without starting voice.</p>}</div>
      <Label htmlFor="interactive-notes">Your notes (not saved until confirmation)</Label><Textarea id="interactive-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={6000} rows={4}/><p className="muted">Only the latest 600 caption fragments and up to 12,000 characters are used for a brief. Review it for missing details. Unsaved notes clear when you leave this discussion.</p>
      {delegated && <p role="status">The AI has suggested a handoff. No research, mail or task creation has started.</p>}
      {!saved && !guidanceDiscussion && <><Button disabled={working || !valid || (!notes.trim() && !fragments.length)} onClick={() => void prepareBrief()}><Sparkles size={16}/>{working ? "Preparing with Luna…" : "Stop voice & prepare brief"}</Button><Button variant="ghost" onClick={() => setReview(true)}>Write a brief manually</Button></>}
    </Card></div>
    {!guidanceDiscussion && (review || saved) && <Card className="detail-card"><h2>{saved ? "Confirmed brief" : "Review before the handoff"}</h2><p>Confirming saves this brief and requests one Terra guidance response through OpenRouter. It does not start internet research, send email, or create plan tasks.</p>{(["title","goal","context","questions"] as const).map(field => <div key={field}><Label htmlFor={`brief-${field}`}>{field === "context" ? "Context and constraints" : field.charAt(0).toUpperCase() + field.slice(1)}</Label>{field === "title" ? <Input id={`brief-${field}`} value={(saved || brief)[field]} readOnly={!!saved} maxLength={160} onChange={e => setBrief(b => ({ ...b, [field]: e.target.value }))}/> : <Textarea id={`brief-${field}`} value={(saved || brief)[field]} readOnly={!!saved} maxLength={field === "context" ? 3000 : 1000} onChange={e => setBrief(b => ({ ...b, [field]: e.target.value }))}/>}</div>)}{!saved && <Button disabled={working || !valid || !brief.title.trim()} onClick={async () => { await stop(); setWorking(true); setError(""); try { await confirm({ id, brief }); } catch { setError("Could not confirm the brief. It remains here; check the profile or try again later."); } finally { setWorking(false); } }}>Confirm brief & start Terra guidance</Button>}</Card>}
    {!guidanceDiscussion && saved && session?.objectiveId && <div className="interactive-results"><h2>Your working space</h2><p>Results stay here when voice is off. Research and planning below each require their own explicit request. Accepting a proposed plan is still required before tasks are created.</p><AIGuidance objectiveId={session.objectiveId}/><ResearchPanel objectiveId={session.objectiveId}/><PlanningPanel objectiveId={session.objectiveId}/></div>}
  </section>;
}
