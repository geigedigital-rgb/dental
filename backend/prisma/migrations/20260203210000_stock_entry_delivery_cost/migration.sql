-- Add optional delivery cost to stock entry (for financial accounting)
ALTER TABLE "StockEntry" ADD COLUMN "deliveryCost" DECIMAL(12,4) NOT NULL DEFAULT 0;
