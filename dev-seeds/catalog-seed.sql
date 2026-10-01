-- Dummy buyer/supplier profiles and catalog/master data for local testing (snake_case columns)
USE SupplierDb;
GO
IF NOT EXISTS (SELECT 1 FROM supplier.supplier_business_profile WHERE id = 'e2222222-2222-4222-8222-222222222201')
BEGIN
  INSERT INTO supplier.supplier_business_profile
  (id, organization_id, organization_name, snid, email, phone, country, address_line1, address_line2, city, state, pin_code,
   industry, business_type, employee_count, annual_turnover, currency, year_established, website, description, status, comment,
   date_created, date_updated, created_by, updated_by, is_active)
  VALUES
  ('e2222222-2222-4222-8222-222222222201', 'a2222222-2222-4222-8222-222222222222', 'Gulf Foods Supplier', 'SN00000000003',
   'supplier.admin@sila.test', '971500000002', 'UAE', 'Al Quoz Industrial', 'Warehouse 4', 'Dubai', 'Dubai', '00000',
   'Food & Beverage', 'Trading', 120, 2500000, 'AED', 2012, 'https://gulffoods.example', 'Demo supplier for SILA testing', 'Approved', NULL,
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM supplier.supplier_catalog WHERE id = 'f2222222-2222-4222-8222-222222222301')
BEGIN
  INSERT INTO supplier.supplier_catalog
  (id, supplier_id, catalog_name, description, price, currency, unit_of_measure, segment, segment_title, family, family_title,
   commodity, commodity_title, class, class_title, catalog_type, is_punch_out, punch_out_url,
   date_created, date_updated, created_by, updated_by, is_active)
  VALUES
  ('f2222222-2222-4222-8222-222222222301', 'e2222222-2222-4222-8222-222222222201', 'Olive Oil Extra Virgin 5L',
   'Premium Spanish extra virgin olive oil, 5 litre tin', 185.00, 'AED', 'TIN', 50000000, 'Food Beverage and Tobacco Products',
   50101700, 'Oils and Cooking Fats', 50101716, 'Olive oil', 50101700, 'Cooking Oils', 'Material', 0, NULL,
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1),
  ('f2222222-2222-4222-8222-222222222302', 'e2222222-2222-4222-8222-222222222201', 'Basmati Rice 10kg',
   'Aged basmati rice, 10kg sack', 62.50, 'AED', 'BAG', 50000000, 'Food Beverage and Tobacco Products',
   50181900, 'Grains and Cereals', 50181902, 'Rice', 50181900, 'Grains', 'Material', 0, NULL,
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1),
  ('f2222222-2222-4222-8222-222222222303', 'e2222222-2222-4222-8222-222222222201', 'Chicken Breast Chilled kg',
   'Fresh chilled chicken breast', 28.75, 'AED', 'KG', 50000000, 'Food Beverage and Tobacco Products',
   50111500, 'Meat and Poultry', 50111513, 'Chicken', 50111500, 'Poultry', 'Material', 0, NULL,
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1),
  ('f2222222-2222-4222-8222-222222222304', 'e2222222-2222-4222-8222-222222222201', 'Housekeeping Cleaning Kit',
   'Multi-surface cleaning kit for guest rooms', 95.00, 'AED', 'KIT', 47000000, 'Cleaning Equipment and Supplies',
   47131800, 'Cleaning and janitorial supplies', 47131805, 'Cleaning kits', 47131800, 'Janitorial', 'Material', 0, NULL,
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1),
  ('f2222222-2222-4222-8222-222222222305', 'e2222222-2222-4222-8222-222222222201', 'Mineral Water 330ml Case',
   'Still mineral water 330ml x 24', 18.00, 'AED', 'CS', 50000000, 'Food Beverage and Tobacco Products',
   50202300, 'Non Alcoholic Beverages', 50202301, 'Water', 50202300, 'Beverages', 'Material', 0, NULL,
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1);
END
GO

USE BuyerSystemDB;
GO
IF NOT EXISTS (SELECT 1 FROM buyersystem.buyer_business_profile WHERE id = 'e1111111-1111-4111-8111-111111111101')
BEGIN
  INSERT INTO buyersystem.buyer_business_profile
  (id, organization_id, organization_name, snid, email, phone, country, address_line1, address_line2, city, state, pin_code,
   industry, business_type, employee_count, annual_turnover, currency, year_established, website, description, status, comment,
   date_created, date_updated, created_by, updated_by, is_active)
  VALUES
  ('e1111111-1111-4111-8111-111111111101', 'a1111111-1111-4111-8111-111111111111', 'Five Hotels Buyer', 'SN00000000002',
   'buyer.admin@sila.test', '971500000001', 'UAE', 'Palm Jumeirah', 'Building A', 'Dubai', 'Dubai', '00000',
   'Hospitality', 'Service', 850, 120000000, 'AED', 2007, 'https://fivehotels.example', 'Demo buyer for SILA testing', 'Approved', NULL,
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM buyersystem.item_buyer_master WHERE id = 'f1111111-1111-4111-8111-111111111301')
BEGIN
  INSERT INTO buyersystem.item_buyer_master
  (id, buyer_id, description, material_code, material_group, product_type, base_unit_of_measure, order_unit_of_measure,
   alternate_unit_of_measure, valuation_class, unit_of_measure_mapping, sub_unit, micro_unit,
   date_created, date_updated, created_by, updated_by, is_active)
  VALUES
  ('f1111111-1111-4111-8111-111111111301', 'e1111111-1111-4111-8111-111111111101', 'Olive Oil Extra Virgin 5L', 'MAT-OO-5L', 'F&B', 'Raw', 'TIN', 'TIN', 'L', '3000', '1 TIN = 5 L', 'L', 'ML',
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1),
  ('f1111111-1111-4111-8111-111111111302', 'e1111111-1111-4111-8111-111111111101', 'Basmati Rice 10kg', 'MAT-RICE-10', 'F&B', 'Raw', 'BAG', 'BAG', 'KG', '3000', '1 BAG = 10 KG', 'KG', 'G',
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1),
  ('f1111111-1111-4111-8111-111111111303', 'e1111111-1111-4111-8111-111111111101', 'Chicken Breast Chilled', 'MAT-CHK-BR', 'F&B', 'Raw', 'KG', 'KG', 'G', '3000', '1 KG = 1000 G', 'G', NULL,
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1),
  ('f1111111-1111-4111-8111-111111111304', 'e1111111-1111-4111-8111-111111111101', 'Housekeeping Cleaning Kit', 'MAT-HK-KIT', 'HK', 'Consumable', 'KIT', 'KIT', 'EA', '3000', '1 KIT = 1 EA', 'EA', NULL,
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1),
  ('f1111111-1111-4111-8111-111111111305', 'e1111111-1111-4111-8111-111111111101', 'Mineral Water 330ml Case', 'MAT-WTR-330', 'F&B', 'Beverage', 'CS', 'CS', 'BTL', '3000', '1 CS = 24 BTL', 'BTL', 'ML',
   SYSUTCDATETIME(), SYSUTCDATETIME(), 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 'DF78056A-1097-430C-B29A-0CC42E3ECE7B', 1);
END
GO
