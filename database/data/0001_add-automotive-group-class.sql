-- Adds the AUTO product group and class 1 (Automotive). Requested by agent/mupmuoqh-data-add-automotive-group-class.

IF NOT EXISTS (SELECT 1 FROM dbo.product_groups WHERE code = 'AUTO')
    INSERT INTO dbo.product_groups (code, name) VALUES ('AUTO', 'Automotive')

IF NOT EXISTS (SELECT 1 FROM dbo.product_classes WHERE class_number = 1)
    INSERT INTO dbo.product_classes (class_number, detail) VALUES (1, 'Automotive')
