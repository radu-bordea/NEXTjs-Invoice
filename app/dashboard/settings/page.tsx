import { getTranslations } from "next-intl/server";
import { getCompanyProfile } from "@/actions/company.actions";
import { CompanyProfileForm } from "@/components/company/CompanyProfileForm";

/**
 * Settings page - server component that fetches the current
 * profile (if any) and hands it to the client-side form component.
 */
export default async function SettingsPage() {
  const t = await getTranslations("CompanyProfile");
  const profile = await getCompanyProfile();

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <CompanyProfileForm profile={profile} />
    </main>
  );
}