"use server";

import { ActionType, SignalType, TriggerStatus, TriggerType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { importPayloadSchema } from "@/lib/importSchema";
import { normalizeFact } from "@/lib/utils";

export async function createSponsor(formData: FormData) {
  await prisma.sponsor.create({ data: { name: String(formData.get("name")), notes: String(formData.get("notes") || "") } });
  revalidatePath("/sponsors");
}

export async function createCompany(formData: FormData) {
  await prisma.portfolioCompany.create({
    data: {
      name: String(formData.get("name")),
      sponsorId: String(formData.get("sponsorId")),
      sector: String(formData.get("sector") || ""),
      geography: String(formData.get("geography") || "")
    }
  });
  revalidatePath("/companies");
}

export async function upsertSignal(formData: FormData) {
  const portfolioCompanyId = String(formData.get("portfolioCompanyId"));
  const sponsorId = String(formData.get("sponsorId"));
  const observedFact = String(formData.get("observedFact"));
  const signalType = String(formData.get("signalType")) as SignalType;
  const normalizedFact = normalizeFact(observedFact);
  const existing = await prisma.signal.findFirst({ where: { portfolioCompanyId, signalType, normalizedFact } });

  if (existing) {
    await prisma.signal.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(String(formData.get("lastSeenAt"))) }
    });
  } else {
    await prisma.signal.create({
      data: {
        portfolioCompanyId,
        sponsorId,
        observedFact,
        normalizedFact,
        signalType,
        firstSeenAt: new Date(String(formData.get("firstSeenAt"))),
        lastSeenAt: new Date(String(formData.get("lastSeenAt"))),
        confidenceFlags: String(formData.get("confidenceFlags") || "").split(",").map(v => v.trim()).filter(Boolean)
      }
    });
  }
  revalidatePath("/signals");
}

export async function createTrigger(formData: FormData) {
  await prisma.triggerHypothesis.create({
    data: {
      portfolioCompanyId: String(formData.get("portfolioCompanyId")),
      sponsorId: String(formData.get("sponsorId")),
      title: String(formData.get("title")),
      triggerType: String(formData.get("triggerType")) as TriggerType,
      hypothesisText: String(formData.get("hypothesisText")),
      confidenceScore: Number(formData.get("confidenceScore")),
      quietWindow: formData.get("quietWindow") === "on"
    }
  });
  revalidatePath("/triggers");
}

export async function updateTriggerStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as TriggerStatus;
  const note = String(formData.get("resolutionNote") || "");

  if (status === "RESOLVED" && !note) throw new Error("Resolution note required");

  await prisma.$transaction(async (tx) => {
    await tx.triggerHypothesis.update({ where: { id }, data: { status } });
    if (note) {
      await tx.actionLog.create({
        data: {
          triggerId: id,
          actionType: ActionType.NOTE,
          actionNotes: note,
          targetOrg: "Internal"
        }
      });
    }
  });
  revalidatePath(`/triggers/${id}`);
  revalidatePath("/triggers");
}

export async function addActionLog(formData: FormData) {
  const triggerId = String(formData.get("triggerId"));
  await prisma.actionLog.create({
    data: {
      triggerId,
      actionType: String(formData.get("actionType")) as ActionType,
      targetPerson: String(formData.get("targetPerson") || ""),
      targetOrg: String(formData.get("targetOrg") || ""),
      actionNotes: String(formData.get("actionNotes")),
      outcome: String(formData.get("outcome") || "")
    }
  });
  revalidatePath(`/triggers/${triggerId}`);
}

export async function runImport(rawJson: string) {
  const parsed = importPayloadSchema.safeParse(JSON.parse(rawJson));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten() };
  const input = parsed.data;
  const summary = { sponsorsCreated: 0, companiesCreated: 0, signalsCreated: 0, signalsUpdated: 0, triggersCreated: 0 };

  for (const sponsorInput of input.sponsors) {
    const sponsor = await prisma.sponsor.upsert({
      where: { name: sponsorInput.name },
      update: {},
      create: { name: sponsorInput.name }
    });
    if (sponsor.createdAt.getTime() === sponsor.updatedAt.getTime()) summary.sponsorsCreated++;

    for (const companyInput of sponsorInput.portfolio_companies) {
      const company = await prisma.portfolioCompany.upsert({
        where: { sponsorId_name: { sponsorId: sponsor.id, name: companyInput.name } },
        update: { sector: companyInput.sector, geography: companyInput.geography },
        create: { sponsorId: sponsor.id, name: companyInput.name, sector: companyInput.sector, geography: companyInput.geography }
      });
      const signalIds: string[] = [];
      summary.companiesCreated++;

      for (const signalInput of companyInput.signals) {
        let sourceId: string | undefined;
        if (signalInput.source) {
          const source = await prisma.sourceItem.create({
            data: {
              url: signalInput.source.url,
              title: signalInput.source.title,
              publisher: signalInput.source.publisher,
              publishedAt: signalInput.source.published_at ? new Date(signalInput.source.published_at) : undefined
            }
          });
          sourceId = source.id;
        }

        const normalizedFact = normalizeFact(signalInput.observed_fact);
        const existingSignal = await prisma.signal.findFirst({
          where: { portfolioCompanyId: company.id, signalType: signalInput.signal_type, normalizedFact }
        });

        if (existingSignal) {
          await prisma.signal.update({ where: { id: existingSignal.id }, data: { lastSeenAt: new Date(signalInput.last_seen_at) } });
          summary.signalsUpdated++;
          signalIds.push(existingSignal.id);
        } else {
          const createdSignal = await prisma.signal.create({
            data: {
              portfolioCompanyId: company.id,
              sponsorId: sponsor.id,
              signalType: signalInput.signal_type,
              observedFact: signalInput.observed_fact,
              normalizedFact,
              confidenceFlags: signalInput.confidence_flags,
              firstSeenAt: new Date(signalInput.first_seen_at),
              lastSeenAt: new Date(signalInput.last_seen_at),
              sourceItemId: sourceId
            }
          });
          summary.signalsCreated++;
          signalIds.push(createdSignal.id);
        }
      }

      for (const triggerInput of companyInput.triggers) {
        const trigger = await prisma.triggerHypothesis.create({
          data: {
            portfolioCompanyId: company.id,
            sponsorId: sponsor.id,
            title: triggerInput.title,
            triggerType: triggerInput.trigger_type,
            hypothesisText: triggerInput.hypothesis_text,
            confidenceScore: triggerInput.confidence_score,
            quietWindow: triggerInput.quiet_window,
            sponsorIntentNotes: triggerInput.sponsor_intent_notes
          }
        });
        summary.triggersCreated++;
        await prisma.triggerSignal.createMany({
          data: triggerInput.linked_signal_indexes
            .map((index) => signalIds[index])
            .filter(Boolean)
            .map((signalId) => ({ triggerId: trigger.id, signalId })),
          skipDuplicates: true
        });
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/report");
  return { ok: true, summary };
}
