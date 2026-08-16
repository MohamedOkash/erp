-- Migration 0007: Card Completeness - Crew Composition for Work Item Stages
-- SACODECO Finishing ERP - Control Cards Core

-- 1. إضافة تكوين الفريق (فنيين ومساعدين) لمراحل بنود الأعمال
ALTER TABLE work_item_stages 
ADD COLUMN IF NOT EXISTS crew_skilled_count INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS crew_unskilled_count INTEGER NOT NULL DEFAULT 1;

-- 2. تحديث البنود والمراحل المزروعة لتأكيد قيم الفريق (1 صنايعي + 1 مساعد كقيمة قياسية)
UPDATE work_item_stages
SET crew_skilled_count = 1,
    crew_unskilled_count = 1
WHERE crew_skilled_count IS NULL OR crew_unskilled_count IS NULL;
