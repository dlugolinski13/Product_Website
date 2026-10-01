SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM dbo.product_groups  WHERE code         = 'AUTO' AND name   = 'Automotive')
         AND EXISTS (SELECT 1 FROM dbo.product_classes WHERE class_number = 1      AND detail = 'Automotive')
        THEN 1
        ELSE 0
    END AS ok
