import { PrismaClient, SignalType, TriggerType, ActionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.actionLog.deleteMany();
  await prisma.triggerSignal.deleteMany();
  await prisma.triggerHypothesis.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.portfolioCompany.deleteMany();
  await prisma.sponsor.deleteMany();

  const sponsors = await Promise.all([
    prisma.sponsor.create({ data: { name: "EQT", strategyTags: ["industrial"], operatingModelTags: ["hands-on"] } }),
    prisma.sponsor.create({ data: { name: "Thoma Bravo", strategyTags: ["software"], operatingModelTags: ["functional excellence"] } })
  ]);

  for (const sponsor of sponsors) {
    for (let i = 1; i <= 3; i++) {
      const c = await prisma.portfolioCompany.create({ data: { sponsorId: sponsor.id, name: `${sponsor.name} Co ${i}`, sector: i % 2 ? "Industrial" : "Tech", geography: "US" } });
      for (let j = 1; j <= (sponsor.name === "EQT" ? 2 : 1); j++) {
        const signal = await prisma.signal.create({
          data: {
            portfolioCompanyId: c.id,
            sponsorId: sponsor.id,
            signalType: Object.values(SignalType)[(i + j) % Object.values(SignalType).length],
            observedFact: `Observed fact ${i}-${j}`,
            normalizedFact: `observed fact ${i} ${j}`,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            confidenceFlags: ["verifiable_source"]
          }
        });
        if (j === 1) {
          const trigger = await prisma.triggerHypothesis.create({
            data: {
              portfolioCompanyId: c.id,
              sponsorId: sponsor.id,
              title: `Trigger for ${c.name}`,
              triggerType: TriggerType.EARLY_INTERVENTION,
              hypothesisText: "Margin and leadership signals suggest intervention motion.",
              confidenceScore: 3.5,
              quietWindow: true
            }
          });
          await prisma.triggerSignal.create({ data: { triggerId: trigger.id, signalId: signal.id } });
          await prisma.actionLog.create({ data: { triggerId: trigger.id, actionType: ActionType.EMAIL, actionNotes: "Initial outreach", targetOrg: "Banker" } });
        }
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
