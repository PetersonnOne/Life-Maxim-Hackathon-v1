"use client";
/* Generated private images use expiring Convex URLs; avoid a public image optimizer cache. */
/* eslint-disable @next/next/no-img-element */
import { lazy, Suspense, useRef, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { HelpCircle, Mic, WandSparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { TRANSFORM_LABELS, type TransformationKind } from "@/convex/transformationContracts";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Textarea } from "./ui/textarea";
const VoiceDiscussion = lazy(() => import("./interactive-mode").then(m => ({ default: m.InteractiveSession })));
const tips: Record<TransformationKind, string> = {
  article: "Turn this guidance into an article with an introduction, key sections and conclusion.",
  meeting: "Create a brief, discussion points, open questions and proposed actions—not invented meeting minutes.",
  business: "Organize the guidance into priorities, constraints, risks and practical work notes.",
  mp3: "Summarize and narrate this guidance with an AI-generated voice. Maximum two minutes. Free: one attempt per UTC day.",
  infographic: "Create a visual summary using GPT-Image-2. Free: one attempt per UTC day. Review image text before use.",
  custom: "Try a social media post, business-plan draft, checklist or client proposal. Missing facts will be marked as assumptions.",
};
function message(error: unknown) { return error instanceof ConvexError && typeof error.data === "string" ? error.data : "Request failed. Your source is unchanged; check your connection and usage limits."; }
function Help({ text }: { text: string }) {
  return <TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" className="guidance-help" aria-label={text}><HelpCircle size={18}/></button></TooltipTrigger><TooltipContent className="max-w-xs z-[100]" sideOffset={6}>{text}</TooltipContent></Tooltip></TooltipProvider>;
}
function SavedTransformation({ row }: { row: Doc<"guidanceTransformations"> }) {
  const files = useQuery(api.transformations.files, { id: row._id });
  const remove = useMutation(api.transformations.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function download(url: string, extension: string) {
    setBusy(true); setError("");
    try { const response = await fetch(url); if (!response.ok) throw new Error(); const local = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = local; anchor.download = `life-maxim-${row.kind}-${row._id}.${extension}`; anchor.click(); setTimeout(() => URL.revokeObjectURL(local), 1000); }
    catch { setError("Download failed. Try again while signed in."); } finally { setBusy(false); }
  }
  const running = row.status === "pending" || row.status === "processing";
  return <article className="transformation-record"><div className="transformation-heading"><strong>{row.title || TRANSFORM_LABELS[row.kind]}</strong><small>{row.status} · {new Date(row._creationTime).toLocaleString()}</small></div>
    {running && <p role="status">Generating… You can close this card and return later.</p>}{row.error && <p role="alert">{row.error}</p>}
    {row.text && <details><summary>Read {row.kind === "mp3" ? "Narration" : row.kind === "infographic" ? "Infographic Copy" : "Content"}</summary><div className="transformation-text" tabIndex={0}>{row.text}</div></details>}
    {files?.media && row.kind === "mp3" && <><audio controls preload="none" src={files.media} aria-label="AI-generated guidance narration"/><small>AI-generated voice · {Math.ceil(row.duration ?? 0)} seconds</small></>}
    {files?.media && row.kind === "infographic" && <details><summary>View Infographic</summary><div className="infographic-preview" tabIndex={0}><img src={files.media} alt={`AI-generated infographic: ${row.title || "Guidance summary"}`}/></div></details>}
    <div className="guidance-actions">{files?.text && <Button variant="outline" size="sm" disabled={busy} onClick={() => void download(files.text!, "txt")}>Download Text</Button>}{files?.document && <Button variant="outline" size="sm" disabled={busy} onClick={() => void download(files.document!, "docx")}>Download Word</Button>}{files?.media && <Button variant="outline" size="sm" disabled={busy} onClick={() => void download(files.media!, row.kind === "mp3" ? "mp3" : "png")}>Download {row.kind === "mp3" ? "MP3" : "PNG"}</Button>}<Button variant="ghost" size="sm" disabled={busy || running} onClick={() => setConfirmDelete(true)}>Delete</Button></div>
    {confirmDelete && <div role="alert"><p>Permanently delete this transformation and its files? Original guidance stays.</p><Button disabled={busy} variant="destructive" onClick={async () => { setBusy(true); try { await remove({ id: row._id }); } catch (e) { setError(message(e)); setBusy(false); } }}>Delete Permanently</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</Button></div>}{error && <p role="alert" className="form-error">{error}</p>}
  </article>;
}
export function GuidanceTools({ guidanceId }: { guidanceId: Id<"aiGuidance"> }) {
  const request = useMutation(api.transformations.request); const discuss = useMutation(api.interactive.discussGuidance);
  const profiles = useQuery(api.profiles.list);
  const { results, status, loadMore } = usePaginatedQuery(api.transformations.list, { guidanceId }, { initialNumItems: 5 });
  const [sessionId, setSessionId] = useState<Id<"interactiveSessions"> | null>(null);
  const [choose, setChoose] = useState(false); const [kind, setKind] = useState<TransformationKind>("article");
  const [custom, setCustom] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const lock = useRef(false); const retry = useRef<{ requestId: string; kind: TransformationKind; custom: string } | null>(null);
  const running = results.some(r => r.status === "pending" || r.status === "processing");
  async function generate() {
    if (lock.current || running) return; lock.current = true; setBusy(true); setError("");
    const description = kind === "custom" ? custom.trim() : "";
    const attempt = retry.current?.kind === kind && retry.current.custom === description ? retry.current : { requestId: crypto.randomUUID(), kind, custom: description }; retry.current = attempt;
    try { await request({ guidanceId, ...attempt }); retry.current = null; setChoose(false); } catch (e) { setError(message(e)); } finally { lock.current = false; setBusy(false); }
  }
  return <section className="guidance-tools" aria-label="Guidance discussions and transformations"><h3>Saved Transformations</h3><p className="muted">Saved under this card. Review AI-generated content before sharing.</p>
    {status === "LoadingFirstPage" ? <p>Loading…</p> : !results.length ? <p>No transformations yet. Choose a format below.</p> : <div className="transformation-list">{results.map(row => <SavedTransformation key={row._id} row={row}/>)}</div>}
    {status === "CanLoadMore" && <Button variant="outline" onClick={() => loadMore(5)}>Load More</Button>}{status === "LoadingMore" && <p role="status">Loading more…</p>}{error && <p role="alert" className="form-error">{error}</p>}
    <div className="guidance-actions guidance-footer"><Button disabled={busy || !profiles} onClick={async () => { if (lock.current) return; lock.current = true; setBusy(true); setError(""); try { setSessionId(await discuss({ guidanceId })); } catch (e) { setError(message(e)); } finally { lock.current = false; setBusy(false); } }}><Mic size={16}/>Discuss with AI</Button><Button variant="outline" disabled={busy} onClick={() => setChoose(true)}><WandSparkles size={16}/>Transform To</Button><Help text="Discuss this card with GPT Live 1, or create a saved document, short MP3 or infographic. Opening a discussion does not start your microphone. Generation uses your allowance; failed attempts may count."/></div>
    <Dialog open={choose} onOpenChange={setChoose}><DialogContent className="transformation-dialog"><DialogHeader><DialogTitle>Transform Your Guidance</DialogTitle><DialogDescription>Choose a format. Only this guidance and your format request are shared with the generation provider.</DialogDescription></DialogHeader><div className="transformation-options" role="group" aria-label="Transformation format">{(Object.keys(TRANSFORM_LABELS) as TransformationKind[]).map(option => <div className="transformation-option" key={option}><Button variant={kind === option ? "default" : "outline"} aria-pressed={kind === option} disabled={busy} onClick={() => setKind(option)}>{TRANSFORM_LABELS[option]}</Button><Help text={tips[option]}/></div>)}</div><p>{tips[kind]}</p>
      {kind === "custom" && <><label htmlFor="custom-transformation">What would you like to create?</label><Textarea id="custom-transformation" value={custom} onChange={e => setCustom(e.target.value)} maxLength={1500} placeholder="Example: A LinkedIn post for small-business owners, with three practical takeaways." disabled={busy}/></>}
      <p className="muted">Text: Luna or Terra via OpenRouter. Speech: GPT-4o Mini TTS; images: GPT-Image-2 via OpenAI. Free: one MP3 and one infographic per UTC day. Premium: three each; Premium Plus: five each. Platform safety caps apply. No automatic paid retries.</p>{error && <p role="alert" className="form-error">{error}</p>}<Button disabled={busy || running || (kind === "custom" && custom.trim().length < 5)} onClick={() => void generate()}>{busy ? "Requesting…" : running ? "Generation in Progress" : "Generate & Save"}</Button>
    </DialogContent></Dialog>
    <Dialog open={sessionId !== null} onOpenChange={open => { if (!open) setSessionId(null); }}><DialogContent className="guidance-discussion-dialog"><DialogHeader><DialogTitle>Discuss with AI</DialogTitle><DialogDescription>A GPT Live 1 conversation grounded in this selected guidance. Start voice only when you’re ready.</DialogDescription></DialogHeader>{sessionId && profiles && <Suspense fallback={<p>Loading voice controls…</p>}><VoiceDiscussion key={sessionId} id={sessionId} profiles={profiles} onBack={() => setSessionId(null)} onUserMode={() => setSessionId(null)} compact/></Suspense>}</DialogContent></Dialog>
  </section>;
}
