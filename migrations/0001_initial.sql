PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Administrator', 'Editor')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS meeting_requests (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_type TEXT NOT NULL,
  interested_products TEXT NOT NULL DEFAULT '[]',
  other_product TEXT NOT NULL DEFAULT '',
  estimated_monthly_quantity TEXT NOT NULL DEFAULT '',
  preferred_meeting_at TEXT NOT NULL DEFAULT '',
  additional_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Meeting Scheduled', 'In Progress', 'Completed', 'Cancelled')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_created ON meeting_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status ON meeting_requests(status);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_id TEXT REFERENCES product_categories(id) ON DELETE SET NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  image_key TEXT,
  alt_ar TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  is_visible INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_visible_order ON products(is_visible, sort_order);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_key TEXT,
  alt_ar TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  is_visible INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  question_ar TEXT NOT NULL,
  question_en TEXT NOT NULL,
  answer_ar TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_content (
  content_key TEXT PRIMARY KEY,
  value_ar TEXT NOT NULL DEFAULT '',
  value_en TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  value_ar TEXT NOT NULL DEFAULT '',
  value_en TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  alt_ar TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO product_categories (id, slug, name_ar, name_en, sort_order) VALUES
  ('cat-frozen-whole-chicken', 'frozen-whole-chicken', 'دجاج كامل مجمد', 'Frozen Whole Chicken', 1),
  ('cat-chicken-breast', 'chicken-breast', 'صدور الدجاج', 'Chicken Breast', 2),
  ('cat-chicken-tender', 'chicken-tender', 'تندر / فيليه الدجاج', 'Chicken Tender', 3),
  ('cat-table-eggs', 'table-eggs', 'بيض المائدة', 'Table Eggs', 4),
  ('cat-special-cuts', 'special-cuts', 'قطع خاصة', 'Special Cuts', 5);

INSERT OR IGNORE INTO products (id, slug, category_id, name_ar, name_en, description_ar, description_en, is_visible, sort_order) VALUES
  ('prd-frozen-whole-chicken', 'frozen-whole-chicken', 'cat-frozen-whole-chicken', 'دجاج كامل مجمد', 'Frozen Whole Chicken', 'فئة مرنة للمطابخ وخدمات الطعام.', 'A flexible category for kitchens and foodservice.', 1, 1),
  ('prd-chicken-breast', 'chicken-breast', 'cat-chicken-breast', 'صدور الدجاج', 'Chicken Breast', 'خيار متعدد الاستخدامات لقوائم الطعام.', 'A versatile staple for a wide range of menus.', 1, 2),
  ('prd-chicken-tender', 'chicken-tender', 'cat-chicken-tender', 'تندر / فيليه الدجاج', 'Chicken Tender', 'خيار عملي لمطابخ الأعمال.', 'A convenient poultry option for commercial kitchens.', 1, 3),
  ('prd-table-eggs', 'table-eggs', 'cat-table-eggs', 'بيض المائدة', 'Table Eggs', 'فئة أساسية لخدمات الطعام وقطاع التجزئة.', 'A staple category for foodservice and retail.', 1, 4),
  ('prd-special-cuts', 'special-cuts', 'cat-special-cuts', 'قطع خاصة', 'Special Cuts', 'ناقشوا القطع المفضلة ومتطلبات التوريد.', 'Discuss your preferred cuts and supply requirements.', 1, 5);

INSERT OR IGNORE INTO faqs (id, question_en, question_ar, answer_en, answer_ar, is_published, sort_order) VALUES
  ('faq-1', 'What products does Wafrat Al Reef supply?', 'ما هي المنتجات التي تقوم وفرة الريف بتوريدها؟', 'We supply a variety of poultry products, including frozen chicken, chicken breast, chicken tender, table eggs, and other poultry products.', 'نقوم بتوريد مجموعة متنوعة من منتجات الدواجن تشمل الدجاج المجمد، صدور الدجاج، الفيليه (التندر)، بيض المائدة، وغيرها من منتجات الدواجن.', 1, 1),
  ('faq-2', 'Which businesses do you serve?', 'ما هي القطاعات التي تخدمها الشركة؟', 'We serve restaurants, hotels, supermarkets, wholesalers, and businesses looking for bulk poultry supplies.', 'نخدم المطاعم، الفنادق، السوبرماركت، تجار الجملة، والشركات التي تبحث عن توريد منتجات الدواجن بكميات كبيرة.', 1, 2),
  ('faq-3', 'Do you deliver across Qatar?', 'هل تقومون بالتوصيل لكافة مناطق قطر؟', 'Wafrat Al Reef aims to serve customers across the State of Qatar. Contact our team to discuss delivery arrangements for your location.', 'تهدف وفرة الريف إلى خدمة العملاء في مختلف مناطق دولة قطر. تواصل مع فريقنا لمناقشة ترتيبات التوصيل الخاصة بموقعك.', 1, 3),
  ('faq-4', 'Do you offer different brands and product options?', 'هل توفرون علامات تجارية وخيارات متعددة؟', 'Yes. We work with a wide range of brands and suppliers, allowing us to offer flexible product options based on our customers'' needs.', 'نعم، نتعامل مع شبكة واسعة من العلامات التجارية والموردين مما يتيح لنا تقديم خيارات مرنة وفقاً لاحتياجات عملائنا.', 1, 4),
  ('faq-5', 'How can I know your prices?', 'كيف يمكنني معرفة الأسعار؟', 'Our pricing depends on the products, quantities, and supply requirements. Request a meeting so our team can understand your needs and discuss suitable options.', 'تعتمد أسعارنا على نوع المنتجات والكميات ومتطلبات التوريد. يمكنك طلب اجتماع ليتعرف فريقنا على احتياجاتك ومناقشة الخيارات المناسبة.', 1, 5),
  ('faq-6', 'Can I request bulk quantities?', 'هل يمكنني طلب كميات كبيرة؟', 'Yes. We work with businesses that require regular or bulk poultry supplies. Share your estimated quantities with our team so we can understand your requirements.', 'نعم، نعمل مع الشركات التي تتطلب إمدادات منتظمة أو كميات كبيرة. شاركنا الكميات التقديرية ليفهم فريقنا متطلباتك بشكل دقيق.', 1, 6),
  ('faq-7', 'How can I become a business partner?', 'كيف يمكنني البدء بشراكة تجارية معكم؟', 'Simply submit the Request a Meeting form. Our team will contact you to discuss your business requirements and potential cooperation.', 'ببساطة قم بتعبئة نموذج «طلب اجتماع»، وسيتواصل معك فريقنا لمناقشة متطلبات أعمالكم وبحث سبل التعاون.', 1, 7),
  ('faq-8', 'How do I contact Wafrat Al Reef?', 'كيف يمكنني التواصل مع وفرة الريف؟', 'You can reach us by phone or email, or submit a meeting request through our website.', 'يمكنك التواصل معنا عبر الهاتف أو البريد الإلكتروني، أو تقديم طلب اجتماع من خلال الموقع الإلكتروني.', 1, 8);

INSERT OR IGNORE INTO cms_content (content_key, value_ar, value_en) VALUES
  ('vision', 'أن نكون الخيار الأول والأكثر موثوقية في قطاع توريد وتوزيع منتجات الدواجن في دولة قطر من خلال تقديم حلول توريد متكاملة تجمع بين الجودة والوفرة والتوفير والاعتمادية، والمساهمة في دعم نمو قطاع الأغذية والضيافة.', 'To become the first choice and most trusted partner in Qatar''s poultry supply and distribution sector by delivering integrated supply solutions that combine quality, abundance, savings, and reliability, while contributing to the growth of the food and hospitality industry.'),
  ('mission', 'نلتزم في وفرة الريف بتوفير وتوريد مجموعة متنوعة من منتجات الدواجن وفق معايير عالية من الجودة مع الحرص على استمرارية الإمداد، والأسعار التنافسية، وسرعة الاستجابة لاحتياجات عملائنا. ونعمل على بناء شراكات تجارية طويلة الأمد مع المطاعم والفنادق والسوبرماركت وتجار الجملة، من خلال فهم احتياجاتهم وتقديم حلول توريد مرنة وموثوقة تدعم نجاح أعمالهم.', 'At Wafrat Al Reef, we are committed to supplying a diverse range of poultry products in accordance with high quality standards, while ensuring consistent supply, competitive pricing, and prompt responses to our customers'' needs. We strive to build long-term business partnerships with restaurants, hotels, supermarkets, and wholesalers by understanding their requirements and providing flexible, reliable supply solutions that support their business success.'),
  ('hero_tagline', 'علامات تجارية أكثر، خيارات أوسع، وقيمة أفضل.', 'More Brands. More Choices. Better Value.'),
  ('home_intro', 'وفرة الريف شريك لتوريد وتوزيع منتجات الدواجن للشركات، ويساعد المطاعم والفنادق والسوبرماركت وتجار الجملة وفرق التموين في توفير المنتجات والكميات التي تحتاجها أعمالهم.', 'Wafrat Al Reef is a B2B poultry supply and distribution partner, helping restaurants, hotels, supermarkets, wholesalers and foodservice teams source the products and quantities they need.'),
  ('value_1_title', 'الجودة', 'Quality'), ('value_1_description', 'الالتزام بجودة المنتجات ومعايير سلامة الغذاء.', 'Commitment to product quality and food safety standards.'),
  ('value_2_title', 'الثقة', 'Trust'), ('value_2_description', 'بناء علاقات تجارية قائمة على المصداقية والشفافية.', 'Building business relationships based on credibility and transparency.'),
  ('value_3_title', 'الاعتمادية', 'Reliability'), ('value_3_description', 'الالتزام بالتوريد في المواعيد المحددة واستمرارية الإمداد.', 'Ensuring timely deliveries and consistent supply.'),
  ('value_4_title', 'الشراكة', 'Partnership'), ('value_4_description', 'فهم احتياجات العملاء والعمل على نجاح أعمالهم.', 'Understanding our customers'' needs and contributing to their business success.'),
  ('value_5_title', 'الوفرة', 'Abundance'), ('value_5_description', 'توفير خيارات متنوعة تلبي احتياجات مختلف قطاعات السوق بالكميات المطلوبة.', 'Offering a wide variety of options to meet the needs and quantity requirements of different market sectors.'),
  ('value_6_title', 'التوفير', 'Savings'), ('value_6_description', 'مقارنة بالخيارات الأخرى في السوق، تعمل وفرة الريف على تقليل تكاليف أعمالكم.', 'Compared with other available market options, Wafrat Al Reef works to help reduce your business costs.');

INSERT OR IGNORE INTO site_settings (setting_key, value_ar, value_en) VALUES
  ('company_name', 'وفرة الريف', 'Wafrat Al Reef'),
  ('address', 'المنطقة 25، شارع 220، مبنى رقم 113، قطر', 'Zone 25, Street 220, Building No. 113, Qatar'),
  ('phone', '+974 33220608', '+974 33220608'),
  ('email', 'info@wafratalreef.com', 'info@wafratalreef.com'),
  ('instagram', '@wafrat_alreef', '@wafrat_alreef'),
  ('instagram_url', 'https://www.instagram.com/wafrat_alreef/', 'https://www.instagram.com/wafrat_alreef/'),
  ('default_language', 'en', 'en'),
  ('seo_title', 'وفرة الريف | توريد منتجات الدواجن للأعمال', 'Wafrat Al Reef | Poultry Supply & Distribution'),
  ('seo_description', 'شريككم لتوريد وتوزيع منتجات الدواجن للأعمال في قطر. خيارات متنوعة وتوريد مرن وقيمة تنافسية.', 'Your B2B poultry supply and distribution partner in Qatar. Diverse product options, flexible supply and competitive value.');
