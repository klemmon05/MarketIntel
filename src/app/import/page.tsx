"use client";

import { useMemo, useState, useTransition } from "react";
import { runImport } from "@/actions/core";
import { importPayloadSchema } from "@/lib/importSchema";

const sample = `{
  "report_date": "2026-02-23",
  "sponsors": [{"name":"EQT","portfolio_companies":[{"name":"ExampleCo","sector":"Industrial","geography":"US","signals":[{"signal_type":"LEADERSHIP_CHANGE","observed_fact":"CFO departed; interim appointed.","first_seen_at":"2026-02-22","last_seen_at":"2026-02-23","confidence_flags":["verifiable_source"],"source":{"url":"https://example.com","title":"Press release","publisher":"Business Wire","published_at":"2026-02-22"}}],"triggers":[{"trigger_type":"EARLY_INTERVENTION","title":"Finance leadership turnover suggests stabilization work","hypothesis_text":"Leadership changes can precede transformation PMO buildup.","confidence_score":3.8,"quiet_window":true,"linked_signal_indexes":[0]}]}]}]
}`;

export default function ImportPage() {
  const [raw, setRaw] = useState(sample);
  const [result, setResult] = useState<any>(null);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => {
    try {
      const obj = JSON.parse(raw);
      return importPayloadSchema.parse(obj);
    } catch {
      return null;
    }
  }, [raw]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Import JSON</h1>
      <textarea className="input min-h-72 font-mono text-xs" value={raw} onChange={(e) => setRaw(e.target.value)} />
      {!preview && <p className="text-sm text-red-600">Invalid JSON payload; must match import contract.</p>}
      {preview && <div className="card text-sm"><p>Preview: {preview.sponsors.length} sponsor(s)</p></div>}
      <button disabled={!preview || pending} className="btn" onClick={() => startTransition(async () => setResult(await runImport(raw)))}>Confirm Import</button>
      {result && <pre className="card overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
