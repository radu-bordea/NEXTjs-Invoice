"use client";

import { useActionState, useState, useEffect } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  saveCompanyProfile,
  type SaveCompanyProfileState,
} from "@/actions/company.actions";
import type { CompanyProfile } from "@/app/generated/prisma/client";

const initialState: SaveCompanyProfileState = { success: false };

/**
 * Displays the company profile as read-only, with an Edit button
 * that switches to the editable form. If no profile exists yet,
 * skips straight to the form since there's nothing to view.
 *
 * @param profile - the existing profile, or null if none saved yet
 */
export function CompanyProfileForm({
  profile,
}: {
  profile: CompanyProfile | null;
}) {
  const t = useTranslations("CompanyProfile");
  const format = useFormatter();
  const [isEditing, setIsEditing] = useState(profile === null);

  const [state, formAction, isPending] = useActionState(
    saveCompanyProfile,
    initialState,
  );

  // After a successful save, drop back into read-only view. Runs
  // only when `state` actually changes (i.e. right after a new
  // submission completes) — not on every re-render, which is what
  // caused clicking "Edit" to immediately bounce back to view mode.
  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state]);

  if (!isEditing && profile) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border p-6 space-y-4">
          <ViewRow label={t("companyName")} value={profile.name} />
          <ViewRow label={t("orgNr")} value={profile.orgNr} />
          <ViewRow label={t("address")} value={profile.address} />
          <ViewRow label={t("phone")} value={profile.phone} />
          <ViewRow label={t("email")} value={profile.email} />
          <ViewRow
            label={t("mvaFrom")}
            value={
              profile.mvaRegisteredFrom
                ? format.dateTime(new Date(profile.mvaRegisteredFrom), {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : t("notRegistered")
            }
          />
          <ViewRow label={t("account")} value={profile.ibanOrAccount} />
          <ViewRow label={t("bic")} value={profile.bic || "—"} />
          <ViewRow label={t("bankName")} value={profile.bankName} />
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors cursor-pointer"
        >
          {t("edit")}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label={t("companyName")}
        name="name"
        required
        defaultValue={state.submittedValues?.name ?? profile?.name}
        error={state.errors?.name}
      />
      <Field
        label={t("orgNr")}
        name="orgNr"
        required
        defaultValue={state.submittedValues?.orgNr ?? profile?.orgNr}
        error={state.errors?.orgNr}
      />
      <Field
        label={t("address")}
        name="address"
        required
        defaultValue={state.submittedValues?.address ?? profile?.address}
        error={state.errors?.address}
      />
      <Field
        label={t("phone")}
        name="phone"
        required
        defaultValue={state.submittedValues?.phone ?? profile?.phone}
        error={state.errors?.phone}
      />
      <Field
        label={t("email")}
        name="email"
        type="email"
        required
        defaultValue={state.submittedValues?.email ?? profile?.email}
        error={state.errors?.email}
      />
      <Field
        label={t("mvaFromHint")}
        name="mvaRegisteredFrom"
        type="date"
        defaultValue={
          state.submittedValues?.mvaRegisteredFrom ??
          (profile?.mvaRegisteredFrom
            ? new Date(profile.mvaRegisteredFrom).toISOString().split("T")[0]
            : "")
        }
        error={state.errors?.mvaRegisteredFrom}
      />

      <input type="hidden" name="defaultCurrency" value="NOK" />

      <Field
        label={t("account")}
        name="ibanOrAccount"
        required
        defaultValue={
          state.submittedValues?.ibanOrAccount ?? profile?.ibanOrAccount
        }
        error={state.errors?.ibanOrAccount}
      />
      <Field
        label={t("bicOptional")}
        name="bic"
        defaultValue={state.submittedValues?.bic ?? profile?.bic ?? ""}
        error={state.errors?.bic}
      />
      <Field
        label={t("bankName")}
        name="bankName"
        required
        defaultValue={state.submittedValues?.bankName ?? profile?.bankName}
        error={state.errors?.bankName}
      />

      {state.message && (
        <p
          className={
            state.success ? "text-sm text-green-700" : "text-sm text-red-600"
          }
        >
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? t("saving") : t("save")}
        </button>

        {profile && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-full font-medium px-6 py-3 border hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Read-only label/value row used in the view mode.
 */
function ViewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-base">{value || "—"}</p>
    </div>
  );
}

/**
 * Reusable labeled text input with inline Zod error display and an
 * asterisk next to the label when the field is required, so the
 * user knows before submitting — not only after a failed validation.
 */
function Field({
  label,
  name,
  type = "text",
  defaultValue,
  error,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  error?: string[];
  required?: boolean;
}) {
  const te = useTranslations("Errors");

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="w-full px-4 py-2 border rounded-lg"
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">
          {te.has(error[0]) ? te(error[0]) : error[0]}
        </p>
      )}
    </div>
  );
}
