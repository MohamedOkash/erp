-- ============================================================================
-- Migration 0017: Multilingual Reference Data (Work Categories, Crew Templates, Units)
-- Adds name_en, name_ur, symbol_en, symbol_ur, description_en, description_ur
-- Populates 100% authentic English, Arabic, and Urdu data
-- ============================================================================

-- 1. Alter work_categories table
ALTER TABLE work_categories
ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
ADD COLUMN IF NOT EXISTS name_ur VARCHAR(255);

-- 2. Alter crew_templates table
ALTER TABLE crew_templates
ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
ADD COLUMN IF NOT EXISTS name_ur VARCHAR(255),
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ur TEXT;

-- 3. Alter units table
ALTER TABLE units
ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
ADD COLUMN IF NOT EXISTS name_ur VARCHAR(255),
ADD COLUMN IF NOT EXISTS symbol_en VARCHAR(50),
ADD COLUMN IF NOT EXISTS symbol_ur VARCHAR(50);

-- ============================================================================
-- 4. Update work_categories with Multilingual Translations
-- ============================================================================

UPDATE work_categories SET
  name_en = 'Plastering & Rendering Works',
  name_ur = 'پلاسٹر اور لیسائی کے کام'
WHERE code = 'DEPT-PLASTER' OR name LIKE '%محارة%' OR name LIKE '%لياسة%';

UPDATE work_categories SET
  name_en = 'Painting & Coating Works',
  name_ur = 'رنگ و روغن اور پینٹ کے کام'
WHERE code = 'DEPT-PAINT' OR name LIKE '%دهان%';

UPDATE work_categories SET
  name_en = 'Gypsum Board & Suspended Ceilings',
  name_ur = 'جپسم بورڈ اور سیلنگ کے کام'
WHERE code = 'DEPT-GYPSUM' OR name LIKE '%جبس%';

UPDATE work_categories SET
  name_en = 'Ceramic & Porcelain Tiling',
  name_ur = 'سیرامک اور ٹائلنگ کے کام'
WHERE code = 'DEPT-CERAMIC' OR name LIKE '%سيراميك%';

UPDATE work_categories SET
  name_en = 'Luxury Porcelain Flooring',
  name_ur = 'اعلیٰ درجے کا پورسلین کا کام'
WHERE code = 'DEPT-PORCELAIN' OR name LIKE '%بورسلين%';

UPDATE work_categories SET
  name_en = 'Marble & Granite Works',
  name_ur = 'سنگ مرمر اور گرینائٹ کے کام'
WHERE code = 'DEPT-MARBLE' OR name LIKE '%رخام%';

UPDATE work_categories SET
  name_en = 'Masonry & Block Works',
  name_ur = 'بلاکس اور چنائی کے کام'
WHERE code = 'DEPT-BLOCK' OR name LIKE '%بلوك%' OR name LIKE '%مباني%';

UPDATE work_categories SET
  name_en = 'Carpentry & Joinery Works',
  name_ur = 'بڑھئی اور لکڑی کے کام'
WHERE code = 'DEPT-WOOD' OR name LIKE '%نجار%';

UPDATE work_categories SET
  name_en = 'Aluminum & Cladding Works',
  name_ur = 'ایلومینیم اور فساڈ کے کام'
WHERE code = 'DEPT-ALUM' OR name LIKE '%ألومنيوم%' OR name LIKE '%المنيوم%';

UPDATE work_categories SET
  name_en = 'Electrical Installations & MEP',
  name_ur = 'بجلی کی تنصیبات اور کام'
WHERE code = 'DEPT-ELEC' OR name LIKE '%كهرب%';

UPDATE work_categories SET
  name_en = 'Plumbing & Drainage Works',
  name_ur = 'پلمبنگ اور نکاسی آب کے کام'
WHERE code = 'DEPT-PLUMB' OR name LIKE '%سباك%' OR name LIKE '%صحي%';

UPDATE work_categories SET
  name_en = 'HVAC & Ventilation Works',
  name_ur = 'ایئر کنڈیشننگ اور وینٹیلیشن'
WHERE code = 'DEPT-HVAC' OR name LIKE '%تكييف%';

UPDATE work_categories SET
  name_en = 'Thermal & Waterproofing Insulation',
  name_ur = 'واٹر پروفنگ اور انسولیشن'
WHERE code = 'DEPT-INSUL' OR name LIKE '%عزل%';

UPDATE work_categories SET
  name_en = 'Fair-Face Concrete & Architectural Plaster',
  name_ur = 'فیئر فیس کنکریٹ اور فنکارانہ لیسائی'
WHERE code = 'DEPT-FAIR' OR name LIKE '%خرسانة%';

UPDATE work_categories SET
  name_en = 'Epoxy & Industrial Flooring',
  name_ur = 'ایپوکسی اور صنعتی فرش کے کام'
WHERE code = 'DEPT-EPOXY' OR name LIKE '%إيبوكسي%' OR name LIKE '%ايبوكسي%';

-- Fallback for any remaining categories
UPDATE work_categories SET
  name_en = COALESCE(name_en, name),
  name_ur = COALESCE(name_ur, name)
WHERE name_en IS NULL OR name_ur IS NULL;

-- ============================================================================
-- 5. Update crew_templates with Multilingual Translations
-- ============================================================================

UPDATE crew_templates SET
  name_en = 'Crew A (2 Craftsmen + 1 Helper)',
  name_ur = 'ٹیم اے (2 کاریگر + 1 مددگار)',
  description_en = 'Standard field crew consisting of 2 skilled craftsmen supported by 1 helper',
  description_ur = 'معیاری میدانی ٹیم جو 2 ہنرمند کاریگروں اور 1 مددگار مزدور پر مشتمل ہے'
WHERE code = 'CREW_A';

UPDATE crew_templates SET
  name_en = 'Crew B (1 Craftsman + 1 Helper)',
  name_ur = 'ٹیم بی (1 کاریگر + 1 مددگار)',
  description_en = 'Standard field crew consisting of 1 skilled craftsman supported by 1 helper',
  description_ur = 'معیاری میدانی ٹیم جو 1 ہنرمند کاریگر اور 1 مددگار مزدور پر مشتمل ہے'
WHERE code = 'CREW_B';

-- Fallback for any remaining crew templates
UPDATE crew_templates SET
  name_en = COALESCE(name_en, name),
  name_ur = COALESCE(name_ur, name),
  description_en = COALESCE(description_en, description),
  description_ur = COALESCE(description_ur, description)
WHERE name_en IS NULL OR name_ur IS NULL;

-- ============================================================================
-- 6. Update units with Multilingual Translations
-- ============================================================================

UPDATE units SET
  name_en = 'Square Meter',
  name_ur = 'مربع میٹر',
  symbol_en = 'm²',
  symbol_ur = 'م²'
WHERE name LIKE '%مربع%' OR symbol IN ('م2', 'م²', 'sqm');

UPDATE units SET
  name_en = 'Linear Meter',
  name_ur = 'طولی میٹر',
  symbol_en = 'l.m',
  symbol_ur = 'م.ط'
WHERE name LIKE '%طولي%' OR symbol IN ('م.ط', 'lm');

UPDATE units SET
  name_en = 'Piece / Item',
  name_ur = 'عدد / ٹکڑا',
  symbol_en = 'pcs',
  symbol_ur = 'عدد'
WHERE name LIKE '%عدد%' OR symbol IN ('عدد', 'pc', 'pcs');

UPDATE units SET
  name_en = 'Cubic Meter',
  name_ur = 'مکعب میٹر',
  symbol_en = 'm³',
  symbol_ur = 'م³'
WHERE name LIKE '%مكعب%' OR symbol IN ('م3', 'm³');

UPDATE units SET
  name_en = 'Point / Outlet',
  name_ur = 'پوائنٹ / آؤٹ لیٹ',
  symbol_en = 'pt',
  symbol_ur = 'پوائنٹ'
WHERE name LIKE '%نقطة%' OR symbol IN ('نقطة', 'pt');

-- Fallback for any remaining units
UPDATE units SET
  name_en = COALESCE(name_en, name),
  name_ur = COALESCE(name_ur, name),
  symbol_en = COALESCE(symbol_en, symbol),
  symbol_ur = COALESCE(symbol_ur, symbol)
WHERE name_en IS NULL OR name_ur IS NULL OR symbol_en IS NULL OR symbol_ur IS NULL;
