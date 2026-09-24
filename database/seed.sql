-- Sample data — four Champion luggage sets copied from the Mazel catalog (Catalog List → "Dlugolinski 09/18/26").
-- Run after schema.sql. Idempotent: every insert is guarded, so it is safe to re-run.
--
-- Assumptions to confirm (the source pages don't say):
--   * shipping_method = 'delivered' (source doesn't say whether these are drop ship)
--   * retail_price = 0.00 (source shows 0.00 and our column is NOT NULL)
--   * upc = the UPC printed on the case, taken from the Customer Comments text (the UPC field itself was blank / 0-00000-00000-0)
--   * CH251203SBLK's case UPC reads 1-94450-125309 on the source page (others are 1-99450-...) — possible typo at the source, copied as-is

IF NOT EXISTS (SELECT 1 FROM product_groups WHERE code = 'LUGG')
  INSERT INTO product_groups (code, name) VALUES ('LUGG', 'Luggage');

IF NOT EXISTS (SELECT 1 FROM product_classes WHERE class_number = 12)
  INSERT INTO product_classes (class_number, detail) VALUES (12, 'Luggage and Totes');

IF NOT EXISTS (SELECT 1 FROM terms_and_conditions WHERE freight_terms = 'COLLECT' AND fob_point = 'Solon, OH')
  INSERT INTO terms_and_conditions (freight_terms, payment_terms, fob_point)
  VALUES ('COLLECT', 'Net 30 days with credit approval', 'Solon, OH');

DECLARE @termsId INT = (SELECT TOP 1 id FROM terms_and_conditions WHERE freight_terms = 'COLLECT' AND fob_point = 'Solon, OH');

IF NOT EXISTS (SELECT 1 FROM products WHERE item_number = 'CH251183SCHC')
  INSERT INTO products (item_number, upc, name, description, shipping_method, group_code, class_number, terms_id,
    pack_amount, case_weight, case_length, case_width, case_height, company_price, retail_price, comments, customer_comments)
  VALUES ('CH251183SCHC', '199450125224', 'Champion Trailblazer 3 Piece Luggage Set - Charcoal',
    'CHAMPION TRAILBLAZER 3 PIECE LUGGAGE SET IN CHARCOAL SMALL PIECES HAVE CUP HOLDERS', 'delivered', 'LUGG', 12, @termsId,
    1, 31, 30, 13, 20, 95.00, 0.00, 'EX:CHINA 4202.12.0000 NO.,KG',
    'CONTAINS 21",25",29" DO NOT SELL TO FOLLOWING CITITRENDS,LOTLESS,TJMAXX, WINNERS,ROSS,BURLINGTON, BLOOMINGDALES,NORDSTROM AND GABES 21"UPC#1-99450-12516-3 25"UPC#1-99450-12518-7 29"UPC#1-99450-12520-0 UPC ON CASE#1-99450-125224');

IF NOT EXISTS (SELECT 1 FROM products WHERE item_number = 'CH251183SNVY')
  INSERT INTO products (item_number, upc, name, description, shipping_method, group_code, class_number, terms_id,
    pack_amount, case_weight, case_length, case_width, case_height, company_price, retail_price, comments, customer_comments)
  VALUES ('CH251183SNVY', '199450125231', 'Champion Trailblazer 3 Piece Luggage Set - Navy',
    'CHAMPION TRAILBLAZER 3 PIECE LUGGAGE SET IN NAVY SMALL PIECES HAVE CUP HOLDERS', 'delivered', 'LUGG', 12, @termsId,
    1, 31, 30, 13, 20, 95.00, 0.00, NULL,
    'CONTAINS 21",25",29" DO NOT SELL TO FOLLOWING CITITRENDS,LOTLESS,TJMAXX, WINNERS,ROSS,BURLINGTON, BLOOMINGDALES,NORDSTROM AND GABES 21"UPC#1-99450-12517-0 25"UPC#1-99450-12519-4 29"UPC#1-99450-12521-7 UPC ON CASE#1-99450-125231');

IF NOT EXISTS (SELECT 1 FROM products WHERE item_number = 'CH251203SBLK')
  INSERT INTO products (item_number, upc, name, description, shipping_method, group_code, class_number, terms_id,
    pack_amount, case_weight, case_length, case_width, case_height, company_price, retail_price, comments, customer_comments)
  VALUES ('CH251203SBLK', '194450125309', 'Champion Tracker 3 Piece Luggage Set - Black',
    'CHAMPION TRACKER 3 PIECE LUGGAGE SE IN BLACK SMALL PIECES HAVE CUP HOLDERS', 'delivered', 'LUGG', 12, @termsId,
    1, 31, 30, 13, 20, 95.00, 0.00, 'EX:CHINA 4202.12.0000 NO.,KG',
    'CONTAINS 21",25",29" DO NOT SELL TO FOLLOWING CITITRENDS,LOTLESS,TJMAXX, WINNERS,ROSS,BURLINGTON, BLOOMINGDALES,NORDSTROM AND GABES 21"UPC#1-99450-12524-8 25"UPC#1-99450-12526-2 29"UPC#1-99450-12528-6 UPC ON CASE#1-94450-125309');

IF NOT EXISTS (SELECT 1 FROM products WHERE item_number = 'CH251203SCHV')
  INSERT INTO products (item_number, upc, name, description, shipping_method, group_code, class_number, terms_id,
    pack_amount, case_weight, case_length, case_width, case_height, company_price, retail_price, comments, customer_comments)
  VALUES ('CH251203SCHV', '199450125316', 'Champion Tracker 3 Piece Luggage Set - Chive',
    'CHAMPION TRACKER 3 PIECE LUGGAGE SET IN CHIVE SMALL PIECES HAVE CUP HOLDERS', 'delivered', 'LUGG', 12, @termsId,
    1, 31, 30, 13, 20, 95.00, 0.00, NULL,
    'CONTAINS 21",25",29" DO NOT SELL TO FOLLOWING CITITRENDS,LOTLESS,TJMAXX, WINNERS,ROSS,BURLINGTON, BLOOMINGDALES,NORDSTROM AND GABES 21"UPC#1-99450-12525-5 25"UPC#1-99450-12527-9 29"UPC#1-99450-12529-3 UPC ON CASE#1-99450-125316');
