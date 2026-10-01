import { z } from 'zod';

import type { HouseholdGateway } from '@/features/households/application/household-gateway';

const createHouseholdSchema = z.object({
  name: z.string().trim().min(2, 'Aile adı en az 2 karakter olmalıdır.').max(80),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Para birimi 3 harf olmalıdır.'),
});
const invitationCodeSchema = z.string().trim().min(16, 'Davet kodunu eksiksiz girin.').max(32);

export const createHouseholdService = (gateway: HouseholdGateway) => ({
  findMine: (userId: string) => gateway.findMine(z.string().uuid().parse(userId)),
  create: (name: string, currency = 'TRY') => {
    const input = createHouseholdSchema.parse({ name, currency });
    return gateway.create(input.name, input.currency);
  },
  createInvitation: (householdId: string) => gateway.createInvitation(z.string().uuid().parse(householdId)),
  acceptInvitation: (code: string) => gateway.acceptInvitation(invitationCodeSchema.parse(code)),
});
