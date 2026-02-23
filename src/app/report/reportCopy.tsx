"use client";

export function ReportCopy({ markdown }: { markdown: string }) {
  return <button className="btn" onClick={() => navigator.clipboard.writeText(markdown)}>Copy as Markdown</button>;
}
