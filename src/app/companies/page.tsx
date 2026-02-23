import { createCompany } from "@/actions/core";
import { Page } from "@/components/page";
import { prisma } from "@/lib/prisma";

export default async function CompaniesPage() {
  const [sponsors, companies] = await Promise.all([
    prisma.sponsor.findMany({ orderBy: { name: "asc" } }),
    prisma.portfolioCompany.findMany({ include: { sponsor: true, signals: true, triggerHypotheses: true }, orderBy: { createdAt: "desc" } })
  ]);
  return (
    <Page title="Portfolio Companies">
      <form action={createCompany} className="card grid gap-3 md:grid-cols-5">
        <select name="sponsorId" className="input">{sponsors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input className="input" name="name" placeholder="Company name" required />
        <input className="input" name="sector" placeholder="Sector" />
        <input className="input" name="geography" placeholder="Geography" />
        <button className="btn">Add Company</button>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {companies.map(c => <div key={c.id} className="card"><p className="font-medium">{c.name}</p><p className="text-xs text-slate-500">{c.sponsor.name} · {c.sector ?? "-"} · {c.geography ?? "-"}</p><p className="mt-2 text-sm">Signals: {c.signals.length} · Triggers: {c.triggerHypotheses.length}</p></div>)}
      </div>
    </Page>
  );
}
