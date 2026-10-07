SELECT
  CASE WHEN
    OBJECT_ID('dbo.salesperson_customers', 'U') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sys.foreign_keys
      WHERE name = 'FK_salesperson_customers_salesperson'
    )
    AND EXISTS (
      SELECT 1 FROM sys.foreign_keys
      WHERE name = 'FK_salesperson_customers_customer'
    )
    AND EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'IX_salesperson_customers_customer'
    )
  THEN 1 ELSE 0 END AS ok;
