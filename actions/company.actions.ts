"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { companyProfileSchema } from "@/lib/zod/company.schema";
import { z } from "zod";
import { revalidatePath } from "next/cache";

/**
 * Shape of the object returned by `saveCompanyProfile`.
 * Consumed by `useActionState` on the client to drive
 * inline validation messages and success feedback.
 */
export type SaveCompanyProfileState = {
  success: boolean;
  errors?: Record<string, string[] | undefined>;
  message?: string;
  submittedValues?: Record<string, string>;
};

/**
 * Fetches the logged-in user's company profile.
 *
 * Returns `null` if the user hasn't created one yet — the settings
 * page treats that as "show an empty form" rather than an error.
 *
 * @throws {Error} if there is no authenticated user
 */
export async function getCompanyProfile() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // userId is unique per profile, so findUnique (not findMany) is
  // correct — each user has exactly one CompanyProfile row.
  return prisma.companyProfile.findUnique({
    where: { userId },
  });
}

/**
 * Creates or updates the logged-in user's company profile.
 *
 * Designed to be used with React's `useActionState` hook, which is
 * why the signature takes `(previousState, formData)` instead of
 * just `(formData)` — React passes the last returned state back in
 * on every resubmission automatically.
 *
 * Flow:
 * 1. Confirm the user is authenticated.
 * 2. Pull raw string values out of the submitted FormData.
 * 3. Validate with Zod — on failure, return field-level errors
 *    without touching the database.
 * 4. On success, upsert the profile (create if missing, update
 *    if it already exists) and revalidate the settings page cache.
 *
 * @param _prevState - the previous action state (unused here, but
 *   required by useActionState's calling convention)
 * @param formData - the submitted form fields
 * @returns a {@link SaveCompanyProfileState} describing the outcome
 */

export async function saveCompanyProfile(
  _prevState: SaveCompanyProfileState,
  formData: FormData,
): Promise<SaveCompanyProfileState> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // FormData values are always strings or null — never numbers,
  // booleans, or undefined directly. We normalize a couple of
  // fields below so they match what our Zod schema expects.
  const raw = {
    name: formData.get("name"),
    orgNr: formData.get("orgNr"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    // Empty string -> null, matching Zod's .optional().nullable()
    mvaRegisteredFrom: formData.get("mvaRegisteredFrom") || null,
    defaultCurrency: formData.get("defaultCurrency") || "NOK",
    ibanOrAccount: formData.get("ibanOrAccount"),
    // Empty string -> undefined, matching Zod's plain .optional()
    bic: formData.get("bic") || undefined,
    bankName: formData.get("bankName"),
  };

  const parsed = companyProfileSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "Please fix the errors below.",
      submittedValues: {
        name: String(raw.name ?? ""),
        orgNr: String(raw.orgNr ?? ""),
        address: String(raw.address ?? ""),
        phone: String(raw.phone ?? ""),
        email: String(raw.email ?? ""),
        mvaRegisteredFrom: String(raw.mvaRegisteredFrom ?? ""),
        defaultCurrency: String(raw.defaultCurrency ?? "NOK"),
        ibanOrAccount: String(raw.ibanOrAccount ?? ""),
        bic: String(raw.bic ?? ""),
        bankName: String(raw.bankName ?? ""),
      },
    };
  }

  const data = parsed.data;

  // upsert: update the existing row if this user already has a
  // profile, otherwise create a new one — avoids two separate
  // create/update actions for what is conceptually one "save" step.
  await prisma.companyProfile.upsert({
    where: { userId },
    update: {
      ...data,
      // The date input gives us a string; Prisma's DateTime column
      // needs an actual Date instance.
      mvaRegisteredFrom: data.mvaRegisteredFrom
        ? new Date(data.mvaRegisteredFrom)
        : null,
    },
    create: {
      ...data,
      userId,
      mvaRegisteredFrom: data.mvaRegisteredFrom
        ? new Date(data.mvaRegisteredFrom)
        : null,
    },
  });

  // Clear Next.js's cached copy of the settings page so the next
  // render reflects the freshly saved data.
  revalidatePath("/dashboard/settings");

  return { success: true, message: "Company profile saved successfully." };
}
