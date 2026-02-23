import Link from "next/link";
import { createSponsor } from "@/actions/core";
import { Page } from "@/components/page";
import { prisma } from "@/lib/prisma";

export default async function SponsorsPage() {
  const sponsors = await prisma.sponsor.findMany({ include: { companies: true, triggerHypotheses: { where: { status: "OPEN" } } }, orderBy: { name: "asc" } });
  return (
    <Page title="Sponsors">
      <form action={createSponsor} className="card grid gap-3 md:grid-cols-3">
        <input name="name" className="input" placeholder="Sponsor name" required />
        <input name="notes" className="input" placeholder="Notes" />
        <button className="btn">Create Sponsor</button>
      </form>
      <div className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-white"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Companies</th><th className="p-2 text-left">Open Triggers</th></tr></thead>
          <tbody>{sponsors.map(s => <tr key={s.id} className="border-t"><td className="p-2 font-medium"><Link href={`/report?sponsor=${s.id}`}>{s.name}</Link></td><td className="p-2">{s.companies.length}</td><td className="p-2">{s.triggerHypotheses.length}</td></tr>)}</tbody>
        </table>
      </div>
    </Page>
  );
}
