"use client";
import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function message(error: unknown) { return error instanceof ConvexError && typeof error.data === "string" ? error.data : "Could not save. Please retry."; }
export function ProfileManager({ profiles, onOpen, onCreate, onArchived }: { profiles: Doc<"profiles">[]; onOpen: (id: Id<"profiles">) => void; onCreate: () => void; onArchived: (id: Id<"profiles">) => void }) {
  const [showArchived, setShowArchived] = useState(false);
  const archived = usePaginatedQuery(api.profiles.archived, showArchived ? {} : "skip", { initialNumItems: 20 });
  const [editing, setEditing] = useState<Doc<"profiles"> | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, Doc<"profiles">>>({});
  function clearEdit() {
    if (editing) setEditDrafts(current => { const next={...current}; delete next[editing._id]; return next; });
    setEditing(null);
  }
  const [archiving, setArchiving] = useState<Doc<"profiles"> | null>(null);
  const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const setArchived = useMutation(api.profiles.setArchived);
  async function changeArchive(profile: Doc<"profiles">, value: boolean) {
    setPending(true); setError("");
    try { await setArchived({ id: profile._id, expectedUpdatedAt: profile.updatedAt, archived: value, ...(value ? { confirmation } : {}) });
      if (value) onArchived(profile._id); setArchiving(null);
    } catch (error) { setError(message(error)); } finally { setPending(false); }
  }
  return <section className="stack-form" aria-label="Manage profiles">
    <div className="profiles-grid">{profiles.map(profile => <Card className="profile-card" key={profile._id}>
      <h2>{profile.name}</h2><p>{profile.description || "A dedicated context for your entries."}</p><span>{[profile.role, profile.industry].filter(Boolean).join(" · ") || "Your custom profile"}</span>
      <Button variant="outline" onClick={() => onOpen(profile._id)}>Open profile</Button>
      <Button variant="outline" onClick={() => setEditing(editDrafts[profile._id]??profile)}>Edit {profile.name}</Button>
      <Button variant="ghost" onClick={() => { setConfirmation(""); setError(""); setArchiving(profile); }}>Archive {profile.name}</Button>
    </Card>)}<button className="create-profile-card" onClick={onCreate}><strong>Create a profile</strong><span>Name a role or area of your life.</span></button></div>
    <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Hide archived profiles" : "Show archived profiles"}</Button>
    {showArchived ? <section aria-label="Archived profiles"><h2>Archived profiles</h2><p>Entries and history are retained. Restore a profile to use it for new entries and inbox checks.</p>
      {archived.results.map(profile => <Card className="detail-card" key={profile._id}><h3>{profile.name}</h3><p>{profile.description}</p><Button disabled={pending} onClick={() => void changeArchive(profile, false)}>Restore {profile.name}</Button></Card>)}
      {archived.status === "LoadingFirstPage" ? <p role="status">Loading archived profiles…</p> : !archived.results.length ? <p>No archived profiles.</p> : null}
      {archived.status === "CanLoadMore" || archived.status === "LoadingMore" ? <Button disabled={archived.status === "LoadingMore"} onClick={() => archived.loadMore(20)}>Load more archived profiles</Button> : null}
    </section> : null}
    {error && !archiving ? <p role="alert">{error}</p> : null}
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="entry-dialog"><DialogHeader><DialogTitle>Edit profile</DialogTitle><DialogDescription>Changes affect future AI context. Previously generated responses are not regenerated.</DialogDescription></DialogHeader>{editing ? <ProfileEditor profile={editing} onDraft={draft=>{setEditing(draft);setEditDrafts(current=>({...current,[draft._id]:draft}));}} onSaved={clearEdit} /> : null}</DialogContent></Dialog>
    <Dialog open={!!archiving} onOpenChange={open => { if (!open && !pending) setArchiving(null); }}><DialogContent><DialogHeader><DialogTitle>Archive {archiving?.name}?</DialogTitle><DialogDescription>This preserves entries and history, pauses inbox checks, and invalidates existing mail approvals. Messages already dispatched cannot be recalled. You can restore the profile later.</DialogDescription></DialogHeader>
      <Label htmlFor="archive-confirmation">Type the exact profile name to confirm</Label><Input id="archive-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" />
      <Button disabled={pending || confirmation !== archiving?.name} onClick={() => archiving && void changeArchive(archiving, true)}>Confirm archive</Button>
      {error ? <p role="alert">{error}</p> : null}
    </DialogContent></Dialog>
  </section>;
}
function ProfileEditor({ profile, onDraft, onSaved }: { profile: Doc<"profiles">; onDraft: (draft: Doc<"profiles">) => void; onSaved: () => void }) {
  const update = useMutation(api.profiles.update); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  return <form className="stack-form" onSubmit={async event => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setPending(true); setError("");
    try { await update({ id: profile._id, expectedUpdatedAt: profile.updatedAt, name: String(data.get("name")), description: String(data.get("description")), role: String(data.get("role")), industry: String(data.get("industry")) }); onSaved(); }
    catch (error) { setError(message(error)); } finally { setPending(false); }
  }}>
    <Label htmlFor="edit-profile-name">Name</Label><Input id="edit-profile-name" name="name" value={profile.name} onChange={e=>onDraft({...profile,name:e.target.value})} required maxLength={80} />
    <Label htmlFor="edit-profile-description">Description</Label><Textarea id="edit-profile-description" name="description" value={profile.description} onChange={e=>onDraft({...profile,description:e.target.value})} maxLength={2000} />
    <Label htmlFor="edit-profile-role">Role</Label><Input id="edit-profile-role" name="role" value={profile.role} onChange={e=>onDraft({...profile,role:e.target.value})} maxLength={120} />
    <Label htmlFor="edit-profile-industry">Industry</Label><Input id="edit-profile-industry" name="industry" value={profile.industry} onChange={e=>onDraft({...profile,industry:e.target.value})} maxLength={120} />
    <p>Saving changes also requires fresh approval for any unsent mail.</p>
    <p>Closing keeps your edits while you stay on Profiles. Leaving this page, refreshing or signing out clears them.</p>
    {error ? <p role="alert">{error} Your draft remains here. Discard it before reopening to load the latest saved revision.</p> : null}
    <Button disabled={pending}>{pending ? "Saving…" : "Save profile changes"}</Button>
    <Button type="button" variant="ghost" disabled={pending} onClick={onSaved}>Discard edit draft</Button>
  </form>;
}
