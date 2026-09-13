"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ResearchPanel({ objectiveId }: { objectiveId: Id<"objectives"> }) {
  const data = useQuery(api.research.list, { objectiveId });
  const request = useMutation(api.research.request);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<{ query: string; country: string; requestId: string } | null>(null);
  const working = pending || Boolean(data?.runs.some(run => run.status === "pending"));
  return <div className="stack-form">
    <Card className="detail-card"><h2>Research with sources</h2>
      <p>Search the internet through Firecrawl. Only the query and search country below are shared—not your profile or memories. Each request retrieves up to three sources.</p>
      <form className="stack-form" onSubmit={async event => {
        event.preventDefault(); setPending(true); setError("");
        const input = retry?.query === query && retry.country === country ? retry : { query, country, requestId: crypto.randomUUID() };
        setRetry(input);
        try { await request({ objectiveId, ...input }); setRetry(null); }
        catch { setError("Could not start research. Check your input or usage limit, then retry."); }
        finally { setPending(false); }
      }}>
        <Label htmlFor="research-query">What do you want to find?</Label>
        <Input id="research-query" required minLength={3} maxLength={500} value={query} onChange={e => setQuery(e.target.value)} />
        <Label htmlFor="research-country">Search country (two-letter code)</Label>
        <Input id="research-country" required minLength={2} maxLength={2} pattern="[A-Z]{2}" value={country} onChange={e => setCountry(e.target.value.toUpperCase())} aria-describedby="research-country-help" />
        <p id="research-country-help" className="muted">Choose a country for this search. This is not an assumption about where you live.</p>
        {error ? <p role="alert" className="form-error">{error}</p> : null}
        <Button disabled={working || !data}>{working ? "Research in progress…" : "Search with Firecrawl"}</Button>
      </form>
    </Card>
    {!data ? <p role="status">Loading research…</p> : data.runs.length === 0 ? <p>No research yet. Your sources will appear here.</p> : null}
    {data?.runs.map(run => <Card key={run._id} className="detail-card">
      <h3>{run.query}</h3><p className="muted">Search country: {run.country} · {run.status}</p>
      {run.status === "pending" ? <p role="status">Finding sources. You can leave and return.</p> : null}
      {run.status === "failed" ? <p role="alert">{run.error}</p> : null}
      {run.status === "ready" && !data.sources.some(source => source.runId === run._id) ? <p>No usable sources found. Try a more specific query.</p> : null}
      {data.sources.filter(source => source.runId === run._id).map((source, index) => <article key={source._id} className="detail-card">
        <h4><a href={source.url} target="_blank" rel="noopener noreferrer">[{index + 1}] {source.title}</a></h4>
        <p className="muted">Retrieved {new Date(source.retrievedAt).toLocaleString()} · {new URL(source.url).hostname}</p>
        <p>Source excerpt, not verified advice. Retrieval date is not publication date.</p>
        <details><summary>Read saved excerpt</summary><p className="preserve-lines">{source.excerpt}</p></details>
      </article>)}
    </Card>)}
  </div>;
}
