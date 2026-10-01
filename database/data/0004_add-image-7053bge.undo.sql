DELETE FROM dbo.product_images
WHERE product_id = (SELECT id FROM dbo.products WHERE item_number = '7053BGE')
  AND blob_name  = '3D7D7B20-2B8A-4815-8EC6-5B8B1763BE4C/c20ef710-01c5-4545-ac96-0976e4e11525.png'
