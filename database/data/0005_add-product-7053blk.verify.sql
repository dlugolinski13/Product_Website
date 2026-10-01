SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM dbo.products
            WHERE id                = '0D18B5DB-CFF2-4415-BDAC-47C4A6F6F1D0'
              AND item_number       = '7053BLK'
              AND upc               = '071897705316'
              AND name              = 'RUBBER QUEEN UNIVERSAL FLOOR MATS, 4 PIECE SET, CARPET, BLACK'
              AND description       = 'CARMAT,4PC,CARPETED,BLK'
              AND shipping_method   = 'Delivered'
              AND group_code        = 'AUTO'
              AND class_number      = 1
              AND terms_id          IS NULL
              AND pack_amount       = 4
              AND pack_unit         IS NULL
              AND cases_per_pack    IS NULL
              AND case_weight       = 14.70
              AND case_length       = 26.00
              AND case_width        = 17.00
              AND case_height       = 3.00
              AND company_price     = 8.00
              AND retail_price      = 49.99
              AND comments          = 'EX:CHINA 5703.90.0000 M2,KG'
              AND customer_comments = 'NO INTERNET SALES UNLESS CUSTOMER TAKES ALL QUANTITY SPECIAL PRICE'
              AND activation_date   IS NULL
              AND is_active         = 1
        )
        AND EXISTS (
            SELECT 1 FROM dbo.product_images
            WHERE product_id    = '0D18B5DB-CFF2-4415-BDAC-47C4A6F6F1D0'
              AND blob_name     = '0D18B5DB-CFF2-4415-BDAC-47C4A6F6F1D0/0d87e0ab-4ff3-455e-b22b-cd3e2b7d911d.jpeg'
              AND display_order = 0
        )
        THEN 1
        ELSE 0
    END AS ok
