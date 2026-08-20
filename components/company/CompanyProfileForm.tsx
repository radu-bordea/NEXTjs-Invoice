"use client";

import { useActionState, useState, useEffect } from "react";
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
          <ViewRow label="Company name" value={profile.name} />
          <ViewRow label="Org.nr" value={profile.orgNr} />
          <ViewRow label="Address" value={profile.address} />
          <ViewRow label="Phone" value={profile.phone} />
          <ViewRow label="Email" value={profile.email} />
          <ViewRow
            label="MVA registered from"
            value={
              profile.mvaRegisteredFrom
                ? new Date(profile.mvaRegisteredFrom).toLocaleDateString()
                : "Not registered"
            }
          />
          <ViewRow label="Default currency" value={profile.defaultCurrency} />
          <ViewRow
            label="IBAN / account number"
            value={profile.ibanOrAccount}
          />
          <ViewRow label="BIC/SWIFT" value={profile.bic || "—"} />
          <ViewRow label="Bank name" value={profile.bankName} />
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors cursor-pointer"
        >
          Edit profile
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label="Company name"
        name="name"
        required
        defaultValue={state.submittedValues?.name ?? profile?.name}
        error={state.errors?.name}
      />
      <Field
        label="Org.nr"
        name="orgNr"
        required
        defaultValue={state.submittedValues?.orgNr ?? profile?.orgNr}
        error={state.errors?.orgNr}
      />
      <Field
        label="Address"
        name="address"
        required
        defaultValue={state.submittedValues?.address ?? profile?.address}
        error={state.errors?.address}
      />
      <Field
        label="Phone"
        name="phone"
        required
        defaultValue={state.submittedValues?.phone ?? profile?.phone}
        error={state.errors?.phone}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        defaultValue={state.submittedValues?.email ?? profile?.email}
        error={state.errors?.email}
      />
      <Field
        label="MVA registered from (leave empty if not yet registered)"
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

      <div>
        <label className="block text-sm font-medium mb-1">
          Default currency
        </label>
        <select
          name="defaultCurrency"
          defaultValue={
            state.submittedValues?.defaultCurrency ??
            profile?.defaultCurrency ??
            "NOK"
          }
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="NOK">NOK</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
        </select>
      </div>

      <Field
        label="IBAN / account number"
        name="ibanOrAccount"
        required
        defaultValue={
          state.submittedValues?.ibanOrAccount ?? profile?.ibanOrAccount
        }
        error={state.errors?.ibanOrAccount}
      />
      <Field
        label="BIC/SWIFT (optional)"
        name="bic"
        defaultValue={state.submittedValues?.bic ?? profile?.bic ?? ""}
        error={state.errors?.bic}
      />
      <Field
        label="Bank name"
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
          {isPending ? "Saving..." : "Save profile"}
        </button>

        {profile && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-full font-medium px-6 py-3 border hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
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
      {error && <p className="text-sm text-red-600 mt-1">{error[0]}</p>}
    </div>
  );
}
