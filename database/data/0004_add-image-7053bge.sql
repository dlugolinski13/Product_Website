-- Adds image for product 7053BGE (Rubber Queen Universal Floor Mats, Beige). Requested by agent/mupy4bbj-data-add-image-7053bge.

IF NOT EXISTS (
    SELECT 1 FROM dbo.product_images
    WHERE product_id = (SELECT id FROM dbo.products WHERE item_number = '7053BGE')
      AND blob_name  = '3D7D7B20-2B8A-4815-8EC6-5B8B1763BE4C/c20ef710-01c5-4545-ac96-0976e4e11525.png'
)
    INSERT INTO dbo.product_images (product_id, blob_name, display_order)
    VALUES (
        (SELECT id FROM dbo.products WHERE item_number = '7053BGE'),
        '3D7D7B20-2B8A-4815-8EC6-5B8B1763BE4C/c20ef710-01c5-4545-ac96-0976e4e11525.png',
        0
    )
