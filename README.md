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