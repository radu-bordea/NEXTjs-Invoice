import Link from "next/link";

/**
 * Marketing-site footer — business identity, copyright, and legal
 * links. Shown on public pages only (homepage, pricing), not
 * inside the logged-in dashboard.
 *
 * Terms and Privacy currently link to placeholder pages — real
 * content needs to be written before Stripe subscriptions go live
 * for real users.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="max-w-4xl mx-auto px-4 py-3 text-sm text-gray-500">
        <div className="flex flex-col sm:flex-row text-center sm:justify-between gap-6">
          <div>
            <p className="font-medium text-gray-700 mb-1">
              Radu Bordea Digital Solutions
            </p>
            <p>Org.nr: 935 492 513</p>
            <p>
              {/* mailto: links correctly stay as <a> — they leave
                  the app entirely (open the user's email client),
                  so Next.js's client-side Link doesn't apply here. */}
              <a
                href="mailto:radu.bordea.dev@gmail.com"
                className="hover:text-teal-700"
              >
                radu.bordea.dev@gmail.com
              </a>
            </p>
          </div>

          <p className="sm:mt-8 text-xs text-gray-400">
            © {year} Radu Bordea Digital Solutions. All rights reserved.
          </p>

          <div className="flex flex-col gap-1 sm:items-end">
            <Link href="/pricing" className="hover:text-teal-700">
              Pricing
            </Link>
            <Link href="/terms" className="hover:text-teal-700">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-teal-700">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}