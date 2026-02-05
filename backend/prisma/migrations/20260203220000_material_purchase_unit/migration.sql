-- Ед. закупки и коэффициент перевода в ед. учета (списания)
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "purchaseUnit" TEXT;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "purchaseUnitRatio" DECIMAL(12,4) NOT NULL DEFAULT 1;
COMMENT ON COLUMN "Material"."unit" IS 'Ед. учета (списания): как выдаём врачу';
COMMENT ON COLUMN "Material"."purchaseUnit" IS 'Ед. закупки: как приходит в накладной';
COMMENT ON COLUMN "Material"."purchaseUnitRatio" IS 'Сколько ед. учета в 1 ед. закупки (напр. 50 для коробки 50 карпул)';
