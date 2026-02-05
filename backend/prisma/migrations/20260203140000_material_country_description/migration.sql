-- Add country and description to Material (library: маркировка, ед. изм., страна, назначение)
ALTER TABLE "Material" ADD COLUMN "country" TEXT;
ALTER TABLE "Material" ADD COLUMN "description" TEXT;
