import { SignalType, TriggerType } from "@prisma/client";
import { z } from "zod";

export const importSignalSchema = z.object({
  signal_type: z.nativeEnum(SignalType),
  observed_fact: z.string().min(5),
  first_seen_at: z.string().date(),
  last_seen_at: z.string().date(),
  confidence_flags: z.array(z.string()).default([]),
  source: z.object({
    url: z.string().url(),
    title: z.string().min(1),
    publisher: z.string().optional(),
    published_at: z.string().date().optional()
  }).optional()
});

export const importTriggerSchema = z.object({
  trigger_type: z.nativeEnum(TriggerType),
  title: z.string().min(3),
  hypothesis_text: z.string().min(10),
  confidence_score: z.number().min(1).max(5),
  quiet_window: z.boolean(),
  linked_signal_indexes: z.array(z.number().int().min(0)),
  sponsor_intent_notes: z.string().optional()
});

export const importPayloadSchema = z.object({
  report_date: z.string().date(),
  sponsors: z.array(z.object({
    name: z.string().min(2),
    portfolio_companies: z.array(z.object({
      name: z.string().min(2),
      sector: z.string().optional(),
      geography: z.string().optional(),
      signals: z.array(importSignalSchema),
      triggers: z.array(importTriggerSchema)
    }))
  }))
});

export type ImportPayload = z.infer<typeof importPayloadSchema>;
