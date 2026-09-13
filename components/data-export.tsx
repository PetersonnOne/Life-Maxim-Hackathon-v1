"use client";
import { useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { exportTables } from "@/convex/exportContracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DataExport() {
  const convex = useConvex();
  const generation = useRef(0);
  const running = useRef(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => () => { generation.current++; running.current = false; }, []);

  async function download() {
    if (!confirmed || running.current) return;
    running.current = true;
    const token = ++generation.current;
    setPending(true); setError("");
    const startedAt = new Date().toISOString();
    const records: Partial<Record<(typeof exportTables)[number], unknown[]>> = {};
    let count = 0; let bytes = 0; let owner: string | undefined;
    try {
      for (const table of exportTables) {
        let cursor: string | null = null;
        const rows: unknown[] = []; records[table] = rows;
        for (let pageNumber = 0; ; pageNumber++) {
          if (pageNumber >= 1000) throw new Error("Export exceeded its page limit. No partial file was downloaded.");
          const result: FunctionReturnType<typeof api.dataExport.page> = await convex.query(api.dataExport.page, {
            table, paginationOpts: { cursor, numItems: 20, maximumRowsRead: 20, maximumBytesRead: 1_000_000 },
          });
          if (generation.current !== token) return;
          for (const row of result.page) {
            owner ??= row.ownerId;
            if (row.ownerId !== owner) throw new Error("The signed-in account changed. Export cancelled; please retry.");
          }
          count += result.page.length;
          bytes += new TextEncoder().encode(JSON.stringify(result.page)).length;
          if (count > 10_000 || bytes > 16_000_000) throw new Error("This account exceeds the browser export limit (10,000 records / 16 MB). No partial file was downloaded.");
          rows.push(...result.page);
          setStatus(`Preparing ${table}: ${count} records collected…`);
          if (result.isDone) break;
          if (result.continueCursor === cursor) throw new Error("Export could not advance. Please retry; no partial file was downloaded.");
          cursor = result.continueCursor;
        }
      }
      const blob = new Blob([JSON.stringify({
        format: "life-maxim-application-records", version: 1, startedAt, finishedAt: new Date().toISOString(),
        scope: "Account-owned application records only. Excludes login credentials, auth records, raw Agent component history, external-provider copies and backups. Not a point-in-time snapshot or restorable backup.",
        records,
      })], { type: "application/json" });
      if (generation.current !== token) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `life-maxim-export-${startedAt.slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`Download requested: ${count} records. Check your browser’s downloads and store the file securely.`);
    } catch (cause) {
      if (generation.current === token) { setStatus(""); setError(cause instanceof Error ? cause.message : "Export failed. Please retry."); }
    } finally {
      if (generation.current === token) { running.current = false; setPending(false); }
    }
  }
  return <Card className="detail-card stack-form">
    <h2>Your account data</h2>
    <p>Download saved application records across <strong>all your profiles</strong>, including archived profiles, entries, memories, tasks, AI guidance, research, plans and mail. The profile filter does not limit this export.</p>
    <p>This private JSON file excludes login credentials, raw AI conversation history and provider-side copies. It is not a restorable backup. Avoid editing while exporting: pages are read separately, not as one snapshot. Limit: 10,000 records or 16 MB.</p>
    <label><input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)}/> I understand the download contains private information and will keep it secure.</label>
    <Button disabled={!confirmed || pending} onClick={() => void download()}>{pending ? "Preparing export…" : "Download my application data"}</Button>
    {pending && <Button variant="outline" onClick={() => { generation.current++; running.current = false; setPending(false); setStatus("Export cancelled. No file was downloaded."); }}>Cancel export</Button>}
    <p role="status" aria-live="polite">{status}</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <p>Account deletion and retention settings are not yet available. <Link href="/privacy">Read the data-handling summary.</Link></p>
  </Card>;
}
