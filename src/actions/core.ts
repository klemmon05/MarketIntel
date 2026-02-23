"use server";

import { ActionType, SignalType, TriggerStatus, TriggerType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { importPayloadSchema } from "@/lib/importSchema";
import { normalizeFact } from "@/lib/utils";

function getRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (!value || typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function getOptionalString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (!value || typeof value !== "string") return "";
  return value.trim();
}

function getValidEnum<T extends string>(formData: FormData, key: string, enumValues: T[]): T {
  const value = formData.get(key);
  if (!value || !enumValues.includes(value as T)) {
    throw new Error(`Invalid value for ${key}`);
  }
  return value as T;
}

function getRequiredDate(formData: FormData, key: string): Date {
  const value = formData.get(key);
  if (!value || typeof value !== "string") throw new Error(`${key} is required`);
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new Error(`Invalid date for ${key}`);
  return date;
}

export async function createSponsor(formData: FormData) {
  await prisma.sponsor.create({ data: { name: getRequiredString(formData, "name"), notes: getOptionalString(formData, "notes") } });
  revalidatePath("/sponsors");
}

export async function createCompany(formData: FormData) {
  await prisma.portfolioCompany.create({
    data: {
      name: getRequiredString(formData, "name"),
      sponsorId: getRequiredString(formData, "sponsorId"),
      sector: getOptionalString(formData, "sector"),
      geography: getOptionalString(formData, "geography")
    }
  });
  revalidatePath("/companies");
}

export async function upsertSignal(formData: FormData) {
  const portfolioCompanyId = getRequiredString(formData, "portfolioCompanyId");
  const sponsorId = getRequiredString(formData, "sponsorId");
  const observedFact = getRequiredString(formData, "observedFact");
  const signalType = getValidEnum(formData, "signalType", Object.values(SignalType));
  const normalizedFact = normalizeFact(observedFact);
  const existing = await prisma.signal.findFirst({ where: { portfolioCompanyId, signalType, normalizedFact } });

  if (existing) {
    await prisma.signal.update({
      where: { id: existing.id },
      data: { lastSeenAt: getRequiredDate(formData, "lastSeenAt") }
    });
  } else {
    await prisma.signal.create({
      data: {
        portfolioCompanyId,
        sponsorId,
        observedFact,
        normalizedFact,
        signalType,
        firstSeenAt: getRequiredDate(formData, "firstSeenAt"),
        lastSeenAt: getRequiredDate(formData, "lastSeenAt"),
        confidenceFlags: getOptionalString(formData, "confidenceFlags").split(",").map(v => v.trim()).filter(Boolean)
      }
    });
  }
  revalidatePath("/signals");
}

export async function createTrigger(formData: FormData) {
  await prisma.triggerHypothesis.create({
    data: {
      portfolioCompanyId: getRequiredString(formData, "portfolioCompanyId"),
      sponsorId: getRequiredString(formData, "sponsorId"),
      title: getRequiredString(formData, "title"),
      triggerType: getValidEnum(formData, "triggerType", Object.values(TriggerType)),
      hypothesisText: getRequiredString(formData, "hypothesisText"),
      confidenceScore: Number(formData.get("confidenceScore")),
      quietWindow: formData.get("quietWindow") === "on"
    }
  });
  revalidatePath("/triggers");
}

export async function updateTriggerStatus(formData: FormData) {
  const id = getRequiredString(formData, "id");
  const status = getValidEnum(formData, "status", Object.values(TriggerStatus));
  const note = getOptionalString(formData, "resolutionNote");

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
  const triggerId = getRequiredString(formData, "triggerId");
  await prisma.actionLog.create({
    data: {
      triggerId,
      actionType: getValidEnum(formData, "actionType", Object.values(ActionType)),
      targetPerson: getOptionalString(formData, "targetPerson"),
      targetOrg: getOptionalString(formData, "targetOrg"),
      actionNotes: getRequiredString(formData, "actionNotes"),
      outcome: getOptionalString(formData, "outcome")
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
      if (company.createdAt.getTime() === company.updatedAt.getTime()) summary.companiesCreated++;

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
