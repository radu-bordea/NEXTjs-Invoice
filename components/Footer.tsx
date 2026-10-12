import Link from "next/link";
import { useTranslations } from "next-intl";
import { LEGAL } from "@/lib/legal-info";

export function Footer() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-[#f3f8f5]">
      <div className="max-w-4xl mx-auto px-4 py-6 text-sm text-gray-500">
        <div className="flex flex-col sm:flex-row text-center sm:text-left sm:justify-between gap-6">
          <div>
            <p className="uppercase tracking-[0.25em] text-[#1f4d3f] mb-1">
              <span className="font-light">solo</span>
              <span className="font-bold">verk</span>
            </p>
            <p className="mb-2 text-xs text-gray-500">{t("tagline")}</p>
            <p className="font-medium text-gray-700">{LEGAL.name}</p>
            <p>
              {t("orgNr")}: {LEGAL.orgNr} MVA
            </p>
            <p>
              {/* mailto: stays a plain <a>: it opens the email client */}
              <a href={`mailto:${LEGAL.email}`} className="hover:text-teal-700">
                {LEGAL.email}
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-1 sm:items-end">
            <Link href="/pricing" className="hover:text-teal-700">
              {t("pricing")}
            </Link>
            <Link href="/terms" className="hover:text-teal-700">
              {t("terms")}
            </Link>
            <Link href="/privacy" className="hover:text-teal-700">
              {t("privacy")}
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {year} {LEGAL.name}. {t("rights")}
        </p>
      </div>
    </footer>
  );
}