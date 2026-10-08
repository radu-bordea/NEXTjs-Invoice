import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="max-w-4xl mx-auto px-4 py-3 text-sm text-gray-500">
        <div className="flex flex-col sm:flex-row text-center sm:justify-between gap-6">
          <div>
            <p className="font-medium text-gray-700 mb-1">
              Radu Bordea Digital Solutions
            </p>
            <p>{t("orgNr")}: 935 492 513</p>
            <p>
              {/* mailto: stays a plain <a>: it opens the email client */}
              <a
                href="mailto:radu.bordea.dev@gmail.com"
                className="hover:text-teal-700"
              >
                radu.bordea.dev@gmail.com
              </a>
            </p>
          </div>

          <p className="sm:mt-8 text-xs text-gray-400">
            © {year} Radu Bordea Digital Solutions. {t("rights")}
          </p>

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
      </div>
    </footer>
  );
}