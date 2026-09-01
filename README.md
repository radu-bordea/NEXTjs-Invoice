# start the project
- npx create-next-app@latest nextjs-invoice --typescript --tailwind --app --src-dir=false --import-alias "@/*"
- cd nextjs-invoice

# libraries
- npm install @clerk/nextjs @prisma/client zod react-hook-form @hookform/resolvers
- npm install -D prisma
- npm install @react-pdf/renderer
- npm install lucide-react
- npm install sonner

# files
- find app -type f

# prisma
- npm install prisma @prisma/client
- npx prisma init
- npx prisma db push
- npx prisma generate


# test
- npm run build && npm run start