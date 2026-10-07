ALTER TABLE dbo.notifications DROP CONSTRAINT FK_notifications_created_by;
GO
ALTER TABLE dbo.notifications DROP CONSTRAINT DF_notifications_created_at;
GO
ALTER TABLE dbo.notifications DROP CONSTRAINT DF_notifications_is_active;
GO
ALTER TABLE dbo.notifications DROP CONSTRAINT PK_notifications;
GO
DROP TABLE dbo.notifications;
GO
ALTER TABLE dbo.users DROP COLUMN phone;
