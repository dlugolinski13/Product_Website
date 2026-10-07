CREATE TABLE dbo.salesperson_customers (
  salesperson_id UNIQUEIDENTIFIER NOT NULL,
  customer_id    UNIQUEIDENTIFIER NOT NULL,
  assigned_at    DATETIME2        NOT NULL CONSTRAINT DF_salesperson_customers_assigned_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_salesperson_customers PRIMARY KEY (salesperson_id, customer_id),
  CONSTRAINT FK_salesperson_customers_salesperson FOREIGN KEY (salesperson_id) REFERENCES dbo.users (id),
  CONSTRAINT FK_salesperson_customers_customer    FOREIGN KEY (customer_id)    REFERENCES dbo.users (id)
);
GO
CREATE INDEX IX_salesperson_customers_customer ON dbo.salesperson_customers (customer_id);
