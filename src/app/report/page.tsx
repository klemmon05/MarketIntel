import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { ReportCopy } from "./reportCopy";

export default async function ReportPage() {
  const triggers = await prisma.triggerHypothesis.findMany({ include: { sponsor: true, portfolioCompany: true, triggerSignals: { include: { signal: true } } }, orderBy: { createdAt: "desc" } });
  const byType = await prisma.signal.groupBy({ by: ["signalType"], _count: { _all: true } });

  const markdown = [
    `# Daily Transformation Trigger Summary (${format(new Date(), "yyyy-MM-dd")})`,
    `\n## Overview`,
    `- Total triggers: ${triggers.length}`,
    `- Open triggers: ${triggers.filter(t => t.status === "OPEN").length}`,
    `\n## Signal Mix`
  ];
  byType.forEach(s => markdown.push(`- ${s.signalType}: ${s._count._all}`));

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Daily report</h1>
      <div className="card">
        <h2 className="font-semibold">Overview metrics</h2>
        <p className="text-sm">Triggers: {triggers.length} · Open: {triggers.filter(t => t.status === "OPEN").length}</p>
      </div>
      <div className="card"><h2 className="mb-2 font-semibold">Signal mix</h2>{byType.map(s => <p key={s.signalType} className="text-sm">{s.signalType}: {s._count._all}</p>)}</div>
      <div className="card space-y-3">
        <h2 className="font-semibold">Triggers grouped by sponsor/company</h2>
        {triggers.map(t => <div key={t.id}><p className="font-medium">{t.sponsor.name} · {t.portfolioCompany.name}</p><p className="text-sm">{t.title}</p></div>)}
      </div>
      <ReportCopy markdown={markdown.join("\n")} />
    </main>
  );
}
