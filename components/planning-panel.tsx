"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PlanningPanel({ objectiveId }: { objectiveId: Id<"objectives"> }) {
  const data = useQuery(api.planning.list, { objectiveId });
  const request = useMutation(api.planning.request);
  const [scenario, setScenario] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<{ requestId: string; scenario: string } | null>(null);
  const working = pending || Boolean(data?.proposals.some(p => p.status === "pending"));
  return <section className="stack-form" aria-label="Decision support and planning">
    <Card className="detail-card"><h2>Compare your options. Choose your next steps.</h2>
      <p>Terra considers this entry, its selected profile, up to 12 confirmed memories and up to 6 saved research sources. Proposals are advice—not predictions or automatic actions.</p>
      <form className="stack-form" onSubmit={async event => {
        event.preventDefault(); setPending(true); setError("");
        const input = retry?.scenario === scenario ? retry : { requestId: crypto.randomUUID(), scenario };
        setRetry(input);
        try { await request({ objectiveId, ...input }); setRetry(null); }
        catch { setError("Could not request a proposal. Check your connection or usage limits and retry."); }
        finally { setPending(false); }
      }}>
        <Label htmlFor="plan-scenario">What options or scenario would you like to explore? (optional)</Label>
        <Textarea id="plan-scenario" maxLength={2000} value={scenario} onChange={event => setScenario(event.target.value)} disabled={working} />
        <p className="muted">Submitting shares the selected context with OpenRouter. No tasks are created until you review and accept them below.</p>
        <Button disabled={working || !data}>{working ? "Preparing proposal…" : "Compare options and propose a plan"}</Button>
        {error ? <p role="alert" className="form-error">{error}</p> : null}
      </form>
    </Card>
    {!data ? <p role="status">Loading proposals…</p> : null}
    {data?.proposals.map(run => <Card key={run._id} className="detail-card">
      <p className="muted">{run.model} · {run.status} · {new Date(run._creationTime).toLocaleString()}</p>
      {run.scenario ? <p><strong>Your scenario:</strong> {run.scenario}</p> : null}
      {run.status === "pending" ? <p role="status">Considering options and evidence. You may leave and return.</p> : null}
      {run.status === "failed" ? <p role="alert">{run.error}</p> : null}
      {run.result ? <>
        <h3>Decision overview</h3><p className="preserve-lines">{run.result.summary}</p>
        {run.result.options.map((option, index) => <div key={index} className="detail-card"><h4>{option.name}</h4><p><strong>Benefits:</strong> {option.benefits}</p><p><strong>Tradeoffs:</strong> {option.tradeoffs}</p></div>)}
        <h4>Assumptions to check</h4><ul>{run.result.assumptions.map((text, index) => <li key={index}>{text}</li>)}</ul>
        <h4>Uncertainties</h4><ul>{run.result.uncertainties.map((text, index) => <li key={index}>{text}</li>)}</ul>
        <h4>Referenced evidence</h4>
        <p>References are model-selected supporting material, not independent verification. Check the source before relying on a claim.</p>
        {run.result.sourceIds.length ? <ul>{run.result.sourceIds.map(id => {
          const source = data.sources.find(s => s._id === id);
          return <li key={id}>{source ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} · retrieved {new Date(source.retrievedAt).toLocaleDateString()}</a> : "Source no longer available"}</li>;
        })}</ul> : <p>No source-backed claims identified. Gather research or clarify the context before acting.</p>}
        {run.status === "ready" ? <PlanEditor key={run._id} run={run} /> : run.status === "accepted" ? <p role="status">Accepted: {run.acceptedTaskIds?.length ?? 0} tasks added. See your task list below.</p> : null}
      </> : null}
    </Card>)}
  </section>;
}

function PlanEditor({ run }: { run: Doc<"planProposals"> }) {
  const [steps, setSteps] = useState(() => run.result!.steps.map(step => ({ ...step, dependsOn: [...step.dependsOn] })));
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const accept = useMutation(api.planning.accept);
  return <form className="stack-form" onSubmit={async event => {
    event.preventDefault(); setPending(true); setError("");
    try { await accept({ id: run._id, steps }); }
    catch { setError("Could not accept this plan. Check the task titles, dependencies and task limit, then retry."); }
    finally { setPending(false); }
  }}>
    <h3>Review and edit proposed tasks</h3>
    <p>Dependencies may reference earlier steps only. Nothing is saved to your task list until you accept.</p>
    {steps.map((step, index) => <fieldset key={index} disabled={pending} className="detail-card">
      <legend>Step {index + 1}</legend>
      <Label htmlFor={`step-${run._id}-${index}`}>Task title</Label>
      <Input id={`step-${run._id}-${index}`} required maxLength={240} value={step.title} onChange={event => setSteps(current => current.map((value, position) => position === index ? { ...value, title: event.target.value } : value))} />
      {index > 0 ? <><p>Complete after:</p>{steps.slice(0, index).map((earlier, dependency) => <label key={dependency} className="flex items-center gap-2">
        <input type="checkbox" checked={step.dependsOn.includes(dependency)} onChange={event => setSteps(current => current.map((value, position) => position !== index ? value : { ...value, dependsOn: event.target.checked ? [...value.dependsOn, dependency] : value.dependsOn.filter(d => d !== dependency) }))} />
        Step {dependency + 1}: {earlier.title}
      </label>)}</> : <p>No dependency</p>}
    </fieldset>)}
    <Button disabled={pending} type="submit">{pending ? "Adding reviewed tasks…" : `Accept these ${steps.length} tasks and dependencies`}</Button>
    {error ? <p role="alert" className="form-error">{error}</p> : null}
  </form>;
}
