ALTER TABLE dbo.users ADD phone NVARCHAR(30) NULL;
GO
CREATE TABLE dbo.notifications (
  id          INT              NOT NULL IDENTITY CONSTRAINT PK_notifications PRIMARY KEY,
  message     NVARCHAR(500)    NOT NULL,
  created_by  UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_notifications_created_by REFERENCES dbo.users (id),
  created_at  DATETIME2        NOT NULL CONSTRAINT DF_notifications_created_at DEFAULT SYSUTCDATETIME(),
  is_active   BIT              NOT NULL CONSTRAINT DF_notifications_is_active DEFAULT 1
);
