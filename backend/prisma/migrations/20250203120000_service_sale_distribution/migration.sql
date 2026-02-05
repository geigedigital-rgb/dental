-- AlterTable ServiceSale: add laborAmount, drop doctorShare/ownerShare
ALTER TABLE "ServiceSale" ADD COLUMN "laborAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ServiceSale" DROP COLUMN "doctorShare";
ALTER TABLE "ServiceSale" DROP COLUMN "ownerShare";

-- AlterTable ServiceSaleMaterialSnapshot: add assignedSaleAmount (часть общей суммы на материал)
ALTER TABLE "ServiceSaleMaterialSnapshot" ADD COLUMN "assignedSaleAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
UPDATE "ServiceSaleMaterialSnapshot" SET "assignedSaleAmount" = "totalCost";
