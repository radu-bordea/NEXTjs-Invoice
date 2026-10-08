import { z } from "zod";

export const companyProfileSchema = z.object({
  name: z.string().min(1, "nameRequired"),
  orgNr: z.string().regex(/^\d{9}$/, "orgNrInvalid"),
  address: z.string().min(1, "addressRequired"),
  phone: z
    .string()
    .min(1, "phoneRequired")
    .regex(/^\+?[0-9\s]{7,15}$/, "phoneInvalid"),
  email: z.email("emailInvalid"),
  mvaRegisteredFrom: z.string().optional().nullable(),
  defaultCurrency: z.literal("NOK").default("NOK"),
  ibanOrAccount: z.string().min(1, "accountRequired"),
  bic: z.string().optional(),
  bankName: z.string().min(1, "bankNameRequired"),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;