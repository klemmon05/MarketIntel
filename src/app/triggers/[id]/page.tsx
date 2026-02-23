import { ActionType, TriggerStatus } from "@prisma/client";
import { addActionLog, updateTriggerStatus } from "@/actions/core";
import { Page } from "@/components/page";
import { prisma } from "@/lib/prisma";

export default async function TriggerDetailPage({ params }: { params: { id: string } }) {
  const trigger = await prisma.triggerHypothesis.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      portfolioCompany: true,
      sponsor: true,
      triggerSignals: { include: { signal: { include: { sourceItem: true } } } },
      actionLogs: { orderBy: { createdAt: "desc" } }
    }
  });

  return (
    <Page title={trigger.title}>
      <div className="card"><p className="text-sm text-slate-600">{trigger.sponsor.name} · {trigger.portfolioCompany.name}</p><p className="mt-2">{trigger.hypothesisText}</p></div>
      <div className="card"><h2 className="mb-2 font-semibold">Linked signals</h2>{trigger.triggerSignals.map(ts => <div key={ts.signalId} className="mb-2 rounded border p-2"><p>{ts.signal.signalType}: {ts.signal.observedFact}</p><p className="text-xs text-slate-500">{ts.signal.sourceItem?.url ?? "No source link"}</p></div>)}</div>
      <div className="grid gap-4 md:grid-cols-2">
        <form action={updateTriggerStatus} className="card space-y-2"><input type="hidden" name="id" value={trigger.id} /><select className="input" name="status" defaultValue={trigger.status}>{Object.values(TriggerStatus).map(s => <option key={s}>{s}</option>)}</select><textarea className="input" name="resolutionNote" placeholder="Required when resolving" /><button className="btn">Update Status</button></form>
        <form action={addActionLog} className="card space-y-2"><input type="hidden" name="triggerId" value={trigger.id} /><select className="input" name="actionType">{Object.values(ActionType).map(a => <option key={a}>{a}</option>)}</select><input className="input" name="targetPerson" placeholder="Target person" /><input className="input" name="targetOrg" placeholder="Target org" /><textarea className="input" name="actionNotes" placeholder="Action notes" required /><button className="btn">Add Action</button></form>
      </div>
      <div className="card"><h2 className="font-semibold">Action history</h2>{trigger.actionLogs.map(a => <div key={a.id} className="border-b py-2 text-sm">{a.actionType} · {a.actionNotes}</div>)}</div>
    </Page>
  );
}
