import { SignalType } from "@prisma/client";
import { upsertSignal } from "@/actions/core";
import { Page } from "@/components/page";
import { prisma } from "@/lib/prisma";

export default async function SignalsPage() {
  const companies = await prisma.portfolioCompany.findMany({ include: { sponsor: true }, orderBy: { name: "asc" } });
  const signals = await prisma.signal.findMany({ include: { portfolioCompany: true, sponsor: true, sourceItem: true }, orderBy: { lastSeenAt: "desc" } });

  return (
    <Page title="Signals">
      <form action={upsertSignal} className="card grid gap-2 md:grid-cols-6">
        <select name="portfolioCompanyId" className="input">{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="sponsorId" className="input">{companies.map(c => <option key={c.id} value={c.sponsorId}>{c.sponsor.name}</option>)}</select>
        <select name="signalType" className="input">{Object.values(SignalType).map(t => <option key={t} value={t}>{t}</option>)}</select>
        <input name="observedFact" className="input" placeholder="Observed fact" required />
        <input type="date" name="firstSeenAt" className="input" required />
        <input type="date" name="lastSeenAt" className="input" required />
        <input name="confidenceFlags" className="input md:col-span-5" placeholder="confidence flags comma separated" />
        <button className="btn">Save (dedupe-enabled)</button>
      </form>

      <div className="card overflow-auto">
        <table className="min-w-full text-xs">
          <thead><tr><th className="p-2 text-left">Company</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Observed Fact</th><th className="p-2 text-left">Last Seen</th></tr></thead>
          <tbody>{signals.map(s => <tr key={s.id} className="border-t"><td className="p-2">{s.portfolioCompany.name}</td><td className="p-2">{s.signalType}</td><td className="p-2">{s.observedFact}</td><td className="p-2">{s.lastSeenAt.toISOString().slice(0,10)}</td></tr>)}</tbody>
        </table>
      </div>
    </Page>
  );
}
