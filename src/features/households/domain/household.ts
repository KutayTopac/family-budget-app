import { z } from 'zod';

export const householdSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(80),
  baseCurrency: z.string().length(3),
  timezone: z.string().min(1),
});

export type HouseholdModel = z.infer<typeof householdSchema>;
