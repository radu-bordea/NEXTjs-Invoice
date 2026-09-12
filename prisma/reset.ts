import "dotenv/config"
import prisma from "../lib/prisma"

async function main() {
  await prisma.workLogItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.companyProfile.deleteMany()
  console.log("Database cleared.")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })