SELECT
  CASE WHEN
    EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.users') AND name = 'phone')
    AND OBJECT_ID('dbo.notifications') IS NOT NULL
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'id')
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'message')
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'created_by')
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'created_at')
    AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.notifications') AND name = 'is_active')
  THEN 1 ELSE 0 END AS ok;
