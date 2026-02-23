import Link from "next/link";
import { TriggerStatus, TriggerType } from "@prisma/client";
import { createTrigger, updateTriggerStatus } from "@/actions/core";
import { Page } from "@/components/page";
import { prisma } from "@/lib/prisma";

export default async function TriggersPage() {
  const [companies, triggers] = await Promise.all([
    prisma.portfolioCompany.findMany({ include: { sponsor: true }, orderBy: { name: "asc" } }),
    prisma.triggerHypothesis.findMany({ include: { sponsor: true, portfolioCompany: true }, orderBy: { updatedAt: "desc" } })
  ]);

  return (
    <Page title="Triggers">
      <form action={createTrigger} className="card grid gap-2 md:grid-cols-5">
        <select name="portfolioCompanyId" className="input">{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="sponsorId" className="input">{companies.map(c => <option key={c.id} value={c.sponsorId}>{c.sponsor.name}</option>)}</select>
        <select name="triggerType" className="input">{Object.values(TriggerType).map(t => <option key={t}>{t}</option>)}</select>
        <input name="title" className="input" placeholder="Trigger title" required />
        <input type="number" min="1" max="5" step="0.1" name="confidenceScore" className="input" required />
        <textarea name="hypothesisText" className="input md:col-span-4" placeholder="Hypothesis" required />
        <label className="text-sm"><input type="checkbox" name="quietWindow" className="mr-2" />Quiet window</label>
        <button className="btn">Create Trigger</button>
      </form>

      <div className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead><tr><th className="p-2 text-left">Title</th><th className="p-2 text-left">Company</th><th className="p-2 text-left">Status</th><th className="p-2">Bulk status</th></tr></thead>
          <tbody>
            {triggers.map(t => <tr key={t.id} className="border-t"><td className="p-2"><Link className="underline" href={`/triggers/${t.id}`}>{t.title}</Link></td><td className="p-2">{t.portfolioCompany.name}</td><td className="p-2">{t.status}</td><td className="p-2"><form action={updateTriggerStatus} className="flex gap-2"><input type="hidden" name="id" value={t.id} /><select name="status" className="input">{Object.values(TriggerStatus).map(s => <option key={s} selected={s===t.status}>{s}</option>)}</select><button className="btn" type="submit">Update</button></form></td></tr>)}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
