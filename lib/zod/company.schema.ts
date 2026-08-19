import { z } from "zod";

export const companyProfileSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  orgNr: z.string().regex(/^\d{9}$/, "Org.nr must be exactly 9 digits"),
  address: z.string().min(1, "Address is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(
      /^\+?[0-9\s]{7,15}$/,
      "Phone must contain only numbers, spaces, and an optional leading +",
    ),
  email: z.email("Invalid email address"),
  mvaRegisteredFrom: z.string().optional().nullable(),
  defaultCurrency: z.enum(["NOK", "EUR", "USD"]).default("NOK"),
  ibanOrAccount: z.string().min(1, "IBAN or account number is required"),
  bic: z.string().optional(),
  bankName: z.string().min(1, "Bank name is required"),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
