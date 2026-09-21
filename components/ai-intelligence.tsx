"use client";

import { useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GuidanceTools } from "@/components/guidance-tools";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export type Suggestion = FunctionReturnType<typeof api.intelligenceActions.suggestProfile>;

export function AIProfileSuggestion({ onConfirmed, draft, onDraftChange, savedSuggestion, onSuggestionChange }: {
  savedSuggestion?: Suggestion | null; onSuggestionChange?: (value: Suggestion | null) => void;
  onConfirmed: (id: Id<"profiles">) => void; draft: string; onDraftChange: (draft: string) => void;
}) {
  const suggest = useAction(api.intelligenceActions.suggestProfile);
  const create = useMutation(api.profiles.create);
  const [localSuggestion, setLocalSuggestion] = useState<Suggestion | null>(null);
  const suggestion = savedSuggestion === undefined ? localSuggestion : savedSuggestion;
  const setSuggestion = onSuggestionChange ?? setLocalSuggestion;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <div className="stack-form">
    <Label htmlFor="ai-profile-draft">What is this entry about?</Label>
    <Textarea id="ai-profile-draft" value={draft} maxLength={4000} disabled={pending}
      onChange={e => { onDraftChange(e.target.value); setSuggestion(null); }}
      placeholder="Describe your goal, situation, or question." />
    <p className="muted">AI uses this draft and your profile descriptions to suggest a context. It does not read other profiles’ memories. Nothing is assigned until you confirm.</p>
    <Button disabled={pending || draft.trim().length < 10} onClick={async () => {
      setPending(true); setError(""); setSuggestion(null);
      try { setSuggestion(await suggest({ draft })); }
      catch { setError("AI suggestions are unavailable right now. Your draft is still here. Try again later, or select or create a profile yourself."); }
      finally { setPending(false); }
    }}>{pending ? "Thinking…" : "Suggest a profile"}</Button>
    {error && <p role="alert" className="form-error">{error}</p>}
    {suggestion && <Card className="detail-card" >
      <h3>{suggestion.existingProfileId ? "Suggested existing profile" : "Suggested new profile"}</h3>
      <p>{suggestion.rationale}</p><p className="muted">Confidence: {suggestion.confidence} — an AI assessment, not a measured probability.</p>
      <form className="stack-form" onSubmit={async e => {
        e.preventDefault(); const data = new FormData(e.currentTarget); setPending(true); setError("");
        try {
          const id = suggestion.existingProfileId ?? await create({ name: String(data.get("name")), description: String(data.get("description")), role: String(data.get("role")), industry: String(data.get("industry")) });
          setSuggestion({...suggestion, existingProfileId:id});
          onConfirmed(id);
        } catch { setError("Could not confirm this profile. Check the details and try again."); }
        finally { setPending(false); }
      }}>
        {suggestion.existingProfileId ? <strong>{suggestion.name}</strong> : <>
          <Label htmlFor="suggested-name">Profile name</Label><Input id="suggested-name" name="name" value={suggestion.name} onChange={e=>setSuggestion({...suggestion,name:e.target.value})} maxLength={80} required />
          <Label htmlFor="suggested-description">Description</Label><Textarea id="suggested-description" name="description" value={suggestion.description} onChange={e=>setSuggestion({...suggestion,description:e.target.value})} maxLength={2000} />
          <Label htmlFor="suggested-role">Role (optional)</Label><Input id="suggested-role" name="role" value={suggestion.role} onChange={e=>setSuggestion({...suggestion,role:e.target.value})} maxLength={120} />
          <Label htmlFor="suggested-industry">Industry (optional)</Label><Input id="suggested-industry" name="industry" value={suggestion.industry} onChange={e=>setSuggestion({...suggestion,industry:e.target.value})} maxLength={120} />
        </>}
        <Button type="submit" disabled={pending}>{suggestion.existingProfileId ? "Confirm this profile" : "Confirm and create this profile"}</Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setSuggestion(null)}>Discard suggestion</Button>
      </form>
    </Card>}
  </div>;
}

export function AIGuidance({ objectiveId }: { objectiveId: Id<"objectives"> }) {
  const submissionLock = useRef(false);
  const [openId, setOpenId] = useState<Id<"aiGuidance"> | null>(null);
  const responses = useQuery(api.intelligence.list, { objectiveId });
  const request = useMutation(api.intelligence.requestGuidance);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<{ requestId: string; question: string } | null>(null);
  const working = pending || responses?.some(r => r.status === "pending");
  return <section className="ai-guidance" aria-label="AI guidance">
    <Card className="detail-card"><h2>Think it through with Life Maxim</h2>
      <p>Use this entry, its confirmed profile, and up to 12 recent memories from that profile. No internet research or other profile history is included.</p>
      <form className="stack-form" onSubmit={async e => {
        e.preventDefault(); if (submissionLock.current || working || responses === undefined) return;
        submissionLock.current = true; setPending(true); setError("");
        const attempt = retry?.question === question ? retry : { requestId: crypto.randomUUID(), question };
        setRetry(attempt);
        try { await request({ objectiveId, ...attempt }); setQuestion(""); setRetry(null); }
        catch { setError("Could not request guidance. Check your connection or wait before retrying; AI usage limits may apply."); }
        finally { submissionLock.current = false; setPending(false); }
      }}>
        <Label htmlFor="guidance-question">What would you like help with? (optional)</Label>
        <Textarea id="guidance-question" value={question} maxLength={2000} disabled={working}
          onChange={e => setQuestion(e.target.value)} placeholder="Leave blank for an initial understanding and useful next steps." />
        <Button disabled={working || responses === undefined}>{working ? "Generating AI Guidance" : "Get AI Guidance"}</Button>
      </form>
      <p className="muted">AI suggestions can be wrong. Review assumptions before acting. Asking for guidance shares this context with the AI provider through Convex; it does not authorize any action.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Card>
    {responses?.map(run => <Card className="guidance-summary-card" key={run._id}>
      <div className="guidance-summary-copy"><strong>{run.question || "AI Guidance"}</strong><p>{run.result?.understanding || (run.status === "pending" ? "Generating AI Guidance…" : run.error || "Guidance unavailable.")}</p><small>{run.status} · {new Date(run._creationTime).toLocaleString()}</small></div>
      <Button type="button" variant="outline" onClick={()=>setOpenId(run._id)}>Open Card</Button>
    </Card>)}
    <Dialog open={openId !== null} onOpenChange={open=>{if(!open)setOpenId(null);}}><DialogContent className="guidance-detail-dialog"><DialogHeader><DialogTitle>AI Guidance</DialogTitle><DialogDescription>Full guidance for this entry. Review assumptions before acting.</DialogDescription></DialogHeader>
    {responses?.filter(run=>run._id===openId).map(run => <div className="guidance-detail-body" key={run._id}>
      <p className="muted">AI guidance · {run.model} · {new Date(run._creationTime).toLocaleString()}</p>
      {run.question && <p><strong>Your question:</strong> {run.question}</p>}
      {run.status === "pending" && <p role="status">Considering your selected context… You can leave and return while this finishes.</p>}
      {run.status === "failed" && <p role="alert">{run.error} Submit a new request above to retry.</p>}
      {run.result && <>
        <h3>My understanding</h3><p className="preserve-lines">{run.result.understanding}</p>
        <h3>Guidance</h3><p className="preserve-lines">{run.result.response}</p>
        {([["Assumptions to check", run.result.assumptions], ["Questions to clarify", run.result.questions], ["Suggested next steps", run.result.nextSteps]] as const).map(([title, items]) => items.length > 0 && <div key={title}><h3>{title}</h3><ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}
        <p className="muted">Based on this profile and {run.memoryIds.length} confirmed memories at generation time. Nothing has been added to your plan or memory automatically.</p>
        <GuidanceTools guidanceId={run._id}/>
      </>}
    </div>)}
    </DialogContent></Dialog>
  </section>;
}
