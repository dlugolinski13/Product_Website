CREATE TABLE dbo.saved_cart_items (
  user_id    UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_saved_cart_items_user    REFERENCES dbo.users(id),
  product_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_saved_cart_items_product REFERENCES dbo.products(id),
  quantity   INT              NOT NULL CONSTRAINT CK_saved_cart_items_quantity CHECK (quantity > 0),
  saved_at   DATETIME2        NOT NULL CONSTRAINT DF_saved_cart_items_saved_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_saved_cart_items PRIMARY KEY (user_id, product_id)
);
