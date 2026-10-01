-- Adds product 7053BGE (Rubber Queen Universal Floor Mats, Beige). Requested by agent/mupqigwt-data-add-floor-mat-7053bge.

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE item_number = '7053BGE')
    INSERT INTO dbo.products (
        item_number, upc, name, shipping_method,
        group_code, class_number,
        terms_id,
        pack_amount, pack_unit, cases_per_pack,
        case_weight, case_length, case_width, case_height,
        company_price, retail_price,
        comments, customer_comments,
        activation_date, description, is_active
    )
    VALUES (
        '7053BGE',
        '071897705330',
        'RUBBER QUEEN UNIVERSAL FLOOR MATS, 4 PIECE SET, CARPET, BEIGE',
        'Delivered',
        'AUTO',
        1,
        (SELECT id FROM dbo.terms_and_conditions WHERE freight_terms = 'COLLECT' AND fob_point = 'Solon, OH'),
        4, NULL, NULL,
        14.40, 27.00, 18.00, 3.00,
        8.00, 49.99,
        'EX:CHINA 5703.90.0000 M2,KG',
        'NO INTERNET SALES UNLESS CUSTOMER TAKES ALL QUANTITY SPECIAL PRICE',
        NULL, NULL, 1
    )
