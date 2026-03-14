import { z } from 'zod';

export const summaryResponseSchema = z.object({
  plainSummary: z.string(),
  carePathCategory: z.enum([
    'primary-care',
    'urgent-care',
    'emergency',
    'follow-up',
    'information-only',
  ]),
  questionsToAsk: z.array(z.string()),
  redFlags: z.array(z.string()),
  disclaimer: z.string(),
});

export type SummaryResponse = z.infer<typeof summaryResponseSchema>;
