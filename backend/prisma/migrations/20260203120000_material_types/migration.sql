-- CreateTable MaterialType (классификация: тип материала)
CREATE TABLE "MaterialType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialType_parentId_idx" ON "MaterialType"("parentId");

-- AddForeignKey (self-relation)
ALTER TABLE "MaterialType" ADD CONSTRAINT "MaterialType_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MaterialType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add materialTypeId to Material (nullable first)
ALTER TABLE "Material" ADD COLUMN "materialTypeId" TEXT;

-- Insert default type for existing data
INSERT INTO "MaterialType" ("id", "name", "sortOrder", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Прочее', 999, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Assign all existing materials to default type
UPDATE "Material" SET "materialTypeId" = (SELECT "id" FROM "MaterialType" WHERE "name" = 'Прочее' LIMIT 1);

-- Make materialTypeId required
ALTER TABLE "Material" ALTER COLUMN "materialTypeId" SET NOT NULL;

-- Drop category
ALTER TABLE "Material" DROP COLUMN "category";

-- Add FK
ALTER TABLE "Material" ADD CONSTRAINT "Material_materialTypeId_fkey" FOREIGN KEY ("materialTypeId") REFERENCES "MaterialType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
