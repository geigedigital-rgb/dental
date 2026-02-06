-- AlterTable
ALTER TABLE "WriteOff" ADD COLUMN "materialLotId" TEXT;

-- AddForeignKey
ALTER TABLE "WriteOff" ADD CONSTRAINT "WriteOff_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "MaterialLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
