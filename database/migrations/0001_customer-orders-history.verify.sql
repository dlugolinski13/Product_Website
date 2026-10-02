SELECT CASE
  WHEN EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'salesperson_id')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'address_line1')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'address_line2')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'city')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'state')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'postal_code')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'country')
  THEN 1 ELSE 0
END AS ok;
