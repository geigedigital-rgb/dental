-- System settings (key-value for inventory options)
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- Expiry date on receipt line (for FEFO)
ALTER TABLE "StockEntryItem" ADD COLUMN "expiryDate" TIMESTAMP(3);

-- Material lots for FIFO/FEFO (each purchase = lot with price and remaining qty)
CREATE TABLE "MaterialLot" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "stockEntryId" TEXT,
    "stockEntryItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialLot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MaterialLot_materialId_idx" ON "MaterialLot"("materialId");
CREATE INDEX "MaterialLot_materialId_receivedAt_idx" ON "MaterialLot"("materialId", "receivedAt");
CREATE INDEX "MaterialLot_materialId_expiryDate_idx" ON "MaterialLot"("materialId", "expiryDate");

ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_stockEntryItemId_fkey" FOREIGN KEY ("stockEntryItemId") REFERENCES "StockEntryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
