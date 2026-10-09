SELECT
  CASE WHEN
    OBJECT_ID('dbo.saved_cart_items') IS NOT NULL
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.saved_cart_items') AND name = 'user_id')
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.saved_cart_items') AND name = 'product_id')
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.saved_cart_items') AND name = 'quantity')
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.saved_cart_items') AND name = 'saved_at')
    AND EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'PK_saved_cart_items')
    AND EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_saved_cart_items_user')
    AND EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_saved_cart_items_product')
    AND EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_saved_cart_items_quantity')
    AND EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_saved_cart_items_saved_at')
  THEN 1 ELSE 0 END AS ok;
