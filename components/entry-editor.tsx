"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function EntryEditor({ objective }: { objective: Doc<"objectives"> }) {
  // Freeze the saved revision when the editor opens; incoming subscriptions must
  // never silently change the revision against which this user's form is saved.
  const [snapshot, setSnapshot] = useState<Doc<"objectives"> | null>(null);
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" onClick={() => { setSnapshot(current => current ?? objective); setOpen(true); }}>Edit entry details</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="entry-dialog"><DialogHeader><DialogTitle>Edit entry</DialogTitle><DialogDescription>The selected profile stays unchanged. Existing AI responses and plans are snapshots; request fresh guidance after changing the context.</DialogDescription></DialogHeader>
      {snapshot ? <Editor snapshot={snapshot} onDraft={setSnapshot} onSaved={() => { setSnapshot(null); setOpen(false); }} /> : null}
    </DialogContent></Dialog></>;
}
function Editor({ snapshot, onDraft, onSaved }: { snapshot: Doc<"objectives">; onDraft: (draft: Doc<"objectives">) => void; onSaved: () => void }) {
  const update = useMutation(api.objectives.update); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  return <form className="stack-form" onSubmit={async event => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setPending(true); setError("");
    try { await update({ id: snapshot._id, expectedUpdatedAt: snapshot.updatedAt, title: String(data.get("title")), description: String(data.get("description")), desiredOutcome: String(data.get("outcome")), deadline: String(data.get("deadline")) || undefined }); onSaved(); }
    catch (error) { setError(error instanceof ConvexError && typeof error.data === "string" ? error.data : "Could not save. Please retry."); } finally { setPending(false); }
  }}>
    <Label htmlFor="edit-entry-title">Name</Label><Input id="edit-entry-title" name="title" value={snapshot.title} onChange={e=>onDraft({...snapshot,title:e.target.value})} required maxLength={160} />
    <Label htmlFor="edit-entry-description">What is on your mind?</Label><Textarea id="edit-entry-description" name="description" value={snapshot.description} onChange={e=>onDraft({...snapshot,description:e.target.value})} maxLength={10000} rows={5} />
    <Label htmlFor="edit-entry-outcome">Desired outcome</Label><Input id="edit-entry-outcome" name="outcome" value={snapshot.desiredOutcome} onChange={e=>onDraft({...snapshot,desiredOutcome:e.target.value})} maxLength={2000} />
    <Label htmlFor="edit-entry-deadline">Deadline (optional)</Label><Input id="edit-entry-deadline" name="deadline" type="date" value={snapshot.deadline??""} onChange={e=>onDraft({...snapshot,deadline:e.target.value||undefined})} />
    <p>Closing keeps this draft while the entry stays open. Leaving the entry, refreshing or signing out clears it.</p>
    {error ? <p role="alert">{error} Your draft remains here. Discard it before reopening to load the latest saved revision.</p> : null}
    <Button disabled={pending}>{pending ? "Saving…" : "Save entry changes"}</Button>
    <Button type="button" variant="ghost" disabled={pending} onClick={onSaved}>Discard edit draft</Button>
  </form>;
}
