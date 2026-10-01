SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM dbo.products
            WHERE item_number        = '7053BGE'
              AND upc                = '071897705330'
              AND name               = 'RUBBER QUEEN UNIVERSAL FLOOR MATS, 4 PIECE SET, CARPET, BEIGE'
              AND shipping_method    = 'Delivered'
              AND group_code         = 'AUTO'
              AND class_number       = 1
              AND terms_id           = (SELECT id FROM dbo.terms_and_conditions WHERE freight_terms = 'COLLECT' AND fob_point = 'Solon, OH')
              AND pack_amount        = 4
              AND pack_unit          IS NULL
              AND cases_per_pack     IS NULL
              AND case_weight        = 14.40
              AND case_length        = 27.00
              AND case_width         = 18.00
              AND case_height        = 3.00
              AND company_price      = 8.00
              AND retail_price       = 49.99
              AND comments           = 'EX:CHINA 5703.90.0000 M2,KG'
              AND customer_comments  = 'NO INTERNET SALES UNLESS CUSTOMER TAKES ALL QUANTITY SPECIAL PRICE'
              AND activation_date    IS NULL
              AND description        IS NULL
              AND is_active          = 1
        )
        THEN 1
        ELSE 0
    END AS ok
