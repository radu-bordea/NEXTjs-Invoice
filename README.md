# start the project
- npx create-next-app@latest nextjs-invoice --typescript --tailwind --app --src-dir=false --import-alias "@/*"
- cd nextjs-invoice

# libraries
- npm install @clerk/nextjs @prisma/client zod react-hook-form @hookform/resolvers
- npm install -D prisma
- npm install @react-pdf/renderer
- npm install lucide-react
- npm install sonner
- npm install recharts
- npm install stripe
- npm install @clerk/localizations

# files
- find app -type f

# prisma
- npm install prisma @prisma/client
- npx prisma init
- npx prisma db push
- npx prisma generate
- npx tsx prisma/reset.ts
- npx prisma migrate dev --name add_subscription
- npx prisma migrate dev --name add_vat_rate



# test
- npm run build && npm run start

# json to add
- "dev:local": "next dev --webpack",
- "build:local": "next build --webpack"

- npx tsc --noEmit

# translation
- npm install next-intl


# nextjs-invoice — TODO

## Next up
- [ ] Block MVA rate when not registered: done for new invoices.
      Later: when a DRAFT is edited, re-read the company profile
      (mvaRegisteredFrom + vatRate guard) so drafts follow the profile.
      Never change SENT/PAID invoices. Needs: updateInvoice change,
      edit page passes `mvaRegistered` to InvoiceForm.
- [ ] PDF download links: change <Link> to <a> (invoice view, invoices list,
      reports page). Link tries client navigation and prefetches the PDF.
- [ ] Optional small label "MVA-registrert fra <date>" on view page / PDF.
- [ ] Redirect to /dashboard/invoices after login:
      NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL and
      NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL (also in Vercel, then redeploy).

## Before launch
- [ ] Buy .no domain (Domeneshop) → Vercel domain, NEXT_PUBLIC_APP_URL,
      Stripe webhook URL, Clerk URLs.
- [ ] Real email + address in lib/legal-info.ts; update Terms for trial/founding price.
- [ ] Lawyer review of Terms/Privacy; Clerk legal consent; Stripe terms consent.
- [ ] Vercel Pro ($20/mo) once commercial.
- [ ] Stripe live mode: live keys + webhook + env vars; Pro price tax-inclusive
      with 25% inclusive tax rate; MVA number in Stripe settings;
      14-day trial; optional founding price (99 NOK) for first 30 customers.
- [ ] Pricing decision (maybe ~99/mo); rethink free vs Pro split (competitor: Fakto.no).
- [ ] Resend email sending (Pro): sentAt on Invoice, "Send to client",
      assign invoice number when sent (avoids gaps from deleted drafts).
- [ ] Account deletion flow (privacy policy promises deletion within 30 days).

## Later / ideas
- [ ] Per-invoice PDF language (Option B).
- [ ] Delete drafts (soft delete), CSV export.
- [ ] Expenses/equipment overview + dashboards.
- [ ] Animations and a nicer simple landing page.
- [ ] Custom not-found / error pages.
- [ ] Show first customers: 5–10 freelancers; differentiator = hourly work log
      with MVA split before/after registration, bilingual UI/PDFs, simple UX.

## Notes
- Local dev: Windows Application Control blocks @swc/core (needed by next-intl/plugin).
  next.config.mjs sets the next-intl alias by hand instead of using the plugin.
- New JSON keys go inside their block, before its closing }.
- Restart dev server after JSON/package changes.