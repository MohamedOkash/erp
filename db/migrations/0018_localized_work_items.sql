-- ============================================================================
-- Migration 0018: Localized Work Items Reference Data
-- Adds name_en, name_ur, description_en, description_ur to work_items
-- Populates 100% authentic English, Arabic, and Urdu data for all 12 core items
-- ============================================================================

-- 1. Alter work_items table
ALTER TABLE work_items
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS name_ur TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ur TEXT;

-- ============================================================================
-- 2. Update Core Work Items with Professional Translations
-- ============================================================================

-- [BLK-01] مباني حوائط بلوك أسمنتي (BLOCK WALLS)
UPDATE work_items SET
  name_en = 'Cement Block Wall Masonry',
  name_ur = 'سیمنٹ بلاک دیوار کی چنائی',
  description_en = 'Standard cement block wall construction with mortar joints and reinforcement',
  description_ur = 'مارٹر جوائنٹس اور مضبوطی کے ساتھ سیمنٹ بلاک کی معیاری تعمیر'
WHERE code = 'BLK-01' OR name LIKE '%بلوك%' OR name LIKE '%مباني%';

-- [CRM-01] تركيب سيراميك أرضيات بالمونة
UPDATE work_items SET
  name_en = 'Floor Ceramic Tile Installation with Mortar',
  name_ur = 'مارٹر کے ساتھ فرش سیرامک ٹائل کی تنصیب',
  description_en = 'High quality floor ceramic tiles installation over cement mortar bed',
  description_ur = 'سیمنٹ مارٹر پر معیاری فرش سیرامک ٹائل کی تنصیب'
WHERE code = 'CRM-01' OR name LIKE '%سيراميك أرضيات%';

-- [EPX-01] أرضيات إيبوكسي صناعية متكاملة (EPOXY SCREED)
UPDATE work_items SET
  name_en = 'Industrial Epoxy Flooring Screed & Coating',
  name_ur = 'صنعتی ایپوکسی فرش اسکریڈ اور کوٹنگ',
  description_en = 'Heavy duty industrial multi-layer epoxy flooring and screed system',
  description_ur = 'بھاری صنعتی کثیر سطحی ایپوکسی فرش اور اسکریڈ سسٹم'
WHERE code = 'EPX-01' OR name LIKE '%إيبوكسي%';

-- [GYP-01] أسقف جبس بورد مستوية (GP CEILING)
UPDATE work_items SET
  name_en = 'Flat Gypsum Board Suspended Ceilings',
  name_ur = 'ہموار جپسم بورڈ معلق چھتیں',
  description_en = 'Suspended flat moisture/fire resistant gypsum board ceilings',
  description_ur = 'نمی اور آگ سے محفوظ ہموار جپسم بورڈ معلق چھتیں'
WHERE code = 'GYP-01' OR name LIKE '%أسقف جبس%';

-- [GYP-02] قواطع جدران جبس بورد (GPC)
UPDATE work_items SET
  name_en = 'Gypsum Board Partition Walls',
  name_ur = 'جپسم بورڈ پارٹیشن دیواریں',
  description_en = 'Double-sided gypsum board drywall partitions with steel framing',
  description_ur = 'اسٹیل فریم کے ساتھ دو طرفہ جپسم بورڈ پارٹیشن دیواریں'
WHERE code = 'GYP-02' OR name LIKE '%قواطع%';

-- [GYP-03] أسقف ديكورية معقدة (CEILING TUNNEL)
UPDATE work_items SET
  name_en = 'Complex Decorative Gypsum Ceilings & Tunnels',
  name_ur = 'پیچیدہ آرائشی جپسم چھتیں اور ٹنلز',
  description_en = 'Multi-level decorative recessed gypsum ceilings with light coves',
  description_ur = 'لائٹ کووز کے ساتھ ملٹی لیول آرائشی جپسم چھتیں'
WHERE code = 'GYP-03' OR name LIKE '%ديكورية%';

-- [INS-01] عزل مائي لفائف ممبرين 4 مم مع الاختبار
UPDATE work_items SET
  name_en = '4mm Membrane Waterproofing with Flood Test',
  name_ur = '4 ملی میٹر واٹر پروفنگ میمبرین مع فلڈ ٹیسٹ',
  description_en = 'Torch-applied 4mm bituminous waterproofing membrane with water tightness test',
  description_ur = 'ٹارچ کے ذریعے 4 ملی میٹر بٹومینس واٹر پروفنگ میمبرین اور ٹیسٹ'
WHERE code = 'INS-01' OR name LIKE '%عزل مائي%';

-- [MRB-01] تركيب رخام أرضيات وجلي وتلميع
UPDATE work_items SET
  name_en = 'Floor Marble Installation, Grinding & Polishing',
  name_ur = 'فرش سنگ مرمر کی تنصیب، کٹائی اور پالش',
  description_en = 'Natural marble tiles installation with diamond grinding and mirror polishing',
  description_ur = 'ڈائمنڈ کٹائی اور چمکدار پالش کے ساتھ قدرتی سنگ مرمر کی تنصیب'
WHERE code = 'MRB-01' OR name LIKE '%رخام%';

-- [PLS-01] محارة داخلية بالبؤج والأوتار والإكسسوارات
UPDATE work_items SET
  name_en = 'Interior Plastering with Screeds & Accessories',
  name_ur = 'اندرونی پلستر مع لیول پٹیاں اور لوازمات',
  description_en = 'Three-coat internal cement plastering including corner beads and fiberglass mesh',
  description_ur = 'کونوں کی پٹیوں اور فائیبر میش کے ساتھ تین تہوں کا اندرونی سیمنٹ پلستر'
WHERE code = 'PLS-01' OR name LIKE '%محارة داخلية%';

-- [PLS-02] لياسة خارجية للواجهات بالقدة والميزان
UPDATE work_items SET
  name_en = 'Exterior Facade Plastering with Screeds & Levels',
  name_ur = 'بیرونی پلستر مع اسکرینڈ اور لیولنگ',
  description_en = 'Weather-resistant exterior plastering using straightedge and vertical leveling',
  description_ur = 'اسٹریٹ ایج اور عمودی لیولنگ کے ساتھ بیرونی موسمیاتی پلستر'
WHERE code = 'PLS-02' OR name LIKE '%لياسة خارجية%' OR name LIKE '%محارة خارجية%';

-- [PNT-01] دهانات داخلية فاخرة 3 سكاكين معجون + وجهين
UPDATE work_items SET
  name_en = 'Luxury Interior Painting (3 Putty Coats + 2 Paint Coats)',
  name_ur = 'پرتعیش اندرونی پینٹنگ (3 پٹین کوٹس + 2 پینٹ کوٹس)',
  description_en = 'Premium interior emulsion finish with 3 skimming putty layers and sanding',
  description_ur = '3 پٹین کی تہوں اور رگڑائی کے ساتھ اعلی اندرونی ایمولشن فنش'
WHERE code = 'PNT-01' OR name LIKE '%دهانات داخلية%';

-- [WOD-01] تركيب أبواب خشب قشرة أرو متكاملة
UPDATE work_items SET
  name_en = 'Oak Veneer Solid Core Wooden Doors Installation',
  name_ur = 'اوک لکڑی کے ٹھوس دروازوں کی مکمل تنصیب',
  description_en = 'Complete wooden door sets installation with oak veneer, architraves and ironmongery',
  description_ur = 'اوک فریم، بارڈرز اور تالوں کے ساتھ لکڑی کے دروازوں کی تنصیب'
WHERE code = 'WOD-01' OR name LIKE '%أبواب خشب%' OR name LIKE '%نجارة%';

-- Catch-all for any other work items
UPDATE work_items SET
  name_en = COALESCE(name_en, name),
  name_ur = COALESCE(name_ur, name),
  description_en = COALESCE(description_en, description, ''),
  description_ur = COALESCE(description_ur, description, '')
WHERE name_en IS NULL OR name_ur IS NULL;
