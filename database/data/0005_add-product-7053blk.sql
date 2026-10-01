-- Adds product 7053BLK (Rubber Queen Universal Floor Mats, Black) and its image. Requested by agent/muq3mcov-data-add-product-7053blk.

DECLARE @product_id UNIQUEIDENTIFIER = '0D18B5DB-CFF2-4415-BDAC-47C4A6F6F1D0'

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE item_number = '7053BLK')
    INSERT INTO dbo.products (
        id,
        item_number, upc, name, description, shipping_method,
        group_code, class_number,
        terms_id,
        pack_amount, pack_unit, cases_per_pack,
        case_weight, case_length, case_width, case_height,
        company_price, retail_price,
        comments, customer_comments,
        activation_date, is_active
    )
    VALUES (
        @product_id,
        '7053BLK',
        '071897705316',
        'RUBBER QUEEN UNIVERSAL FLOOR MATS, 4 PIECE SET, CARPET, BLACK',
        'CARMAT,4PC,CARPETED,BLK',
        'Delivered',
        'AUTO',
        1,
        NULL,
        4, NULL, NULL,
        14.70, 26.00, 17.00, 3.00,
        8.00, 49.99,
        'EX:CHINA 5703.90.0000 M2,KG',
        'NO INTERNET SALES UNLESS CUSTOMER TAKES ALL QUANTITY SPECIAL PRICE',
        NULL, 1
    )

IF NOT EXISTS (
    SELECT 1 FROM dbo.product_images
    WHERE product_id = @product_id
      AND blob_name  = '0D18B5DB-CFF2-4415-BDAC-47C4A6F6F1D0/0d87e0ab-4ff3-455e-b22b-cd3e2b7d911d.jpeg'
)
    INSERT INTO dbo.product_images (product_id, blob_name, display_order)
    VALUES (
        @product_id,
        '0D18B5DB-CFF2-4415-BDAC-47C4A6F6F1D0/0d87e0ab-4ff3-455e-b22b-cd3e2b7d911d.jpeg',
        0
    )
