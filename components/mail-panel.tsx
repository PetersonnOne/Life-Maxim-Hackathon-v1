"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function MailPanel({ objectiveId, profileId }: { objectiveId: Id<"objectives">; profileId: Id<"profiles"> }) {
  const data = useQuery(api.mail.list, { objectiveId }); const createInbox = useMutation(api.mail.createInbox);
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  return <section className="stack-form" aria-label="Inbox and approvals">
    <Card className="detail-card"><h2>Your profile inbox</h2>
      <p>This inbox belongs to the selected profile. Incoming messages are untrusted text. Life Maxim never replies automatically.</p>
      <p>New mail is checked through the API about every five minutes. Checks may take longer during catch-up or provider errors. No webhook is required.</p>
      {data?.inbox?.lastPolledAt ? <p>Last successful check: {new Date(data.inbox.lastPolledAt).toLocaleString()}</p> : null}
      {data?.inbox?.pollError ? <p role="status">{data.inbox.pollError}</p> : null}
      {!data ? <p role="status">Loading inbox…</p> : !data.inbox ? <><p>Create an AgentMail inbox for this profile when you are ready to exchange mail.</p><Button disabled={pending} onClick={async () => {
        setPending(true); setError(""); try { await createInbox({ profileId }); } catch { setError("Could not request an inbox. Check your usage limit or try later."); } finally { setPending(false); }
      }}>{pending ? "Requesting inbox…" : "Create this profile’s inbox"}</Button></> : data.inbox.status === "ready" ? <p>{data.inbox.address}</p> : <p role="status">{data.inbox.error ?? "Preparing your inbox…"}</p>}
      {error ? <p role="alert">{error}</p> : null}
    </Card>
    <DraftEditor objectiveId={objectiveId} />
    {data?.drafts.map(draft => <DraftCard key={`${draft._id}-${draft.version}`} draft={draft} inboxReady={data.inbox?.status === "ready"} />)}
    <Card className="detail-card"><h3>Recent incoming mail for this profile</h3>
      <p className="muted">Shows up to 30 received messages. Messages in a sent thread are linked to its entry; other mail remains profile-wide. Attachments and HTML are not opened.</p>
      {data && data.messages.length === 0 ? <p>No received messages yet.</p> : null}
      {data?.messages.map(message => <article key={message._id} className="detail-card">
        <h4>{message.subject}</h4><p>From: {message.sender}</p>
        <p className="muted">{message.objectiveId === objectiveId ? "Reply linked to this entry" : "Profile inbox message"}</p>
        <details><summary>Read plain-text message</summary><p className="preserve-lines">{message.body}</p></details>
      </article>)}
    </Card>
  </section>;
}
function DraftEditor({ objectiveId, draft, onSaved }: { objectiveId: Id<"objectives">; draft?: Doc<"mailDrafts">; onSaved?: () => void }) {
  const save = useMutation(api.mail.saveDraft); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const prefix = draft?._id ?? "new-mail";
  return <Card className="detail-card"><h3>{draft ? "Edit draft—approval will be cleared" : "Compose a draft"}</h3>
    <form className="stack-form" onSubmit={async event => {
      event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setPending(true); setError("");
      try { await save({ objectiveId, ...(draft ? { id: draft._id, version: draft.version } : {}), to: String(values.get("to")), subject: String(values.get("subject")), body: String(values.get("body")) }); if (!draft) form.reset(); onSaved?.(); }
      catch { setError("Could not save. Check your details or reload a changed draft."); } finally { setPending(false); }
    }}>
      <Label htmlFor={`${prefix}-to`}>Recipient</Label><Input id={`${prefix}-to`} name="to" type="email" required maxLength={254} defaultValue={draft?.to} />
      <Label htmlFor={`${prefix}-subject`}>Subject</Label><Input id={`${prefix}-subject`} name="subject" required maxLength={200} defaultValue={draft?.subject} />
      <Label htmlFor={`${prefix}-body`}>Message</Label><Textarea id={`${prefix}-body`} name="body" required maxLength={10000} defaultValue={draft?.body} rows={6} />
      <p>Saving a draft does not send it. Review the saved version before approving.</p>
      <Button disabled={pending}>Save draft only</Button>{error ? <p role="alert">{error}</p> : null}
    </form>
  </Card>;
}
function DraftCard({ draft, inboxReady }: { draft: Doc<"mailDrafts">; inboxReady: boolean }) {
  const approve = useMutation(api.mail.approve); const send = useMutation(api.mail.send);
  const [editing, setEditing] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function act(kind: "approve" | "send") {
    setPending(true); setError(""); try { await (kind === "approve" ? approve : send)({ id: draft._id, version: draft.version }); }
    catch { setError("Action refused. The draft or approval may have changed or expired; review again before sending."); } finally { setPending(false); }
  }
  return <Card className="detail-card"><h3>{draft.subject}</h3><p>To: {draft.to} · Version {draft.version} · {draft.status}</p><p className="preserve-lines">{draft.body}</p>
    {draft.error ? <p role="alert">{draft.error}</p> : null}
    {draft.status === "draft" || draft.status === "approved" ? <>
      <Button variant="outline" disabled={pending} onClick={() => setEditing(!editing)}>{editing ? "Close editor" : "Edit and invalidate approval"}</Button>
      {editing ? <DraftEditor objectiveId={draft.objectiveId} draft={draft} onSaved={() => setEditing(false)} /> : <>
        <Button disabled={pending} onClick={() => void act("approve")}>Approve this exact version for 10 minutes</Button>
        {draft.status === "approved" ? <><p>This sends the displayed message to the displayed recipient through AgentMail. Approval expires {new Date(draft.approvalExpiresAt!).toLocaleTimeString()}.</p><Button disabled={pending || !inboxReady} onClick={() => void act("send")}>Send this approved message now</Button></> : null}
      </>}
    </> : null}
    {draft.status === "sent" ? <p>AgentMail accepted this message. This is not proof of final delivery.</p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </Card>;
}
