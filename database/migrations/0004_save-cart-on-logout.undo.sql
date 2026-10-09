ALTER TABLE dbo.saved_cart_items DROP CONSTRAINT FK_saved_cart_items_user;
GO
ALTER TABLE dbo.saved_cart_items DROP CONSTRAINT FK_saved_cart_items_product;
GO
ALTER TABLE dbo.saved_cart_items DROP CONSTRAINT CK_saved_cart_items_quantity;
GO
ALTER TABLE dbo.saved_cart_items DROP CONSTRAINT DF_saved_cart_items_saved_at;
GO
ALTER TABLE dbo.saved_cart_items DROP CONSTRAINT PK_saved_cart_items;
GO
DROP TABLE dbo.saved_cart_items;
