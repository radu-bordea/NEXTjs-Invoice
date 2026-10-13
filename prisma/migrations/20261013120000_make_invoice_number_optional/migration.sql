-- Drafts no longer get an invoice number. A number is assigned when an
-- invoice is sent, so issued invoices form an unbroken sequence.
ALTER TABLE "Invoice" ALTER COLUMN "invoiceNumber" DROP NOT NULL;