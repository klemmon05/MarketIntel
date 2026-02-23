import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Page } from "@/components/page";

export default async function DashboardPage() {
  const now = new Date();
  const [open, followed, resolved30, signals7, actions, todayTriggers] = await Promise.all([
    prisma.triggerHypothesis.count({ where: { status: "OPEN" } }),
    prisma.triggerHypothesis.count({ where: { status: "FOLLOWED_UP" } }),
    prisma.triggerHypothesis.count({ where: { status: "RESOLVED", updatedAt: { gte: subDays(now, 30) } } }),
    prisma.signal.count({ where: { createdAt: { gte: subDays(now, 7) } } }),
    prisma.actionLog.findMany({ include: { trigger: { include: { portfolioCompany: true } } }, orderBy: { actionDate: "desc" }, take: 8 }),
    prisma.triggerHypothesis.findMany({ where: { createdAt: { gte: subDays(now, 1) } }, include: { sponsor: true, portfolioCompany: true }, take: 6 })
  ]);

  return (
    <Page title="Dashboard">
      <section className="grid gap-4 md:grid-cols-4">
        {[{ label: "Open triggers", value: open }, { label: "Followed-up", value: followed }, { label: "Resolved (30d)", value: resolved30 }, { label: "New signals (7d)", value: signals7 }].map((k) => (
          <div key={k.label} className="card"><p className="text-sm text-slate-500">{k.label}</p><p className="text-2xl font-semibold">{k.value}</p></div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Today&apos;s Brief</h2>
          <div className="space-y-3">
            {todayTriggers.map((t) => <div key={t.id} className="rounded border border-slate-200 p-2"><p className="text-sm font-medium">{t.title}</p><p className="text-xs text-slate-500">{t.sponsor.name} · {t.portfolioCompany.name}</p></div>)}
            {todayTriggers.length === 0 && <p className="text-sm text-slate-500">No new triggers today.</p>}
          </div>
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Recent activity</h2>
          <div className="space-y-3">
            {actions.map((a) => <div key={a.id}><p className="text-sm">{a.actionType} · {a.trigger.portfolioCompany.name}</p><p className="text-xs text-slate-500">{a.actionNotes}</p></div>)}
          </div>
        </div>
      </section>
    </Page>
  );
}
