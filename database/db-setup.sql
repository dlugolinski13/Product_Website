/* One-time setup for the comm-agent's database access (production-only mode).
   Run as your admin login in your PRODUCTION database, using the Azure portal's
   Query editor or Azure Data Studio.
   Replace the password with a long random one, and put it in D:\comm-agent\.env as PROD_SQL_PASSWORD. */

-- 1) Log of applied data scripts (prevents the same script running twice)
IF OBJECT_ID('dbo.data_script_log') IS NULL
CREATE TABLE dbo.data_script_log (
  script_name NVARCHAR(260) NOT NULL PRIMARY KEY,
  sha256      CHAR(64)      NOT NULL,
  applied_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  applied_by  SYSNAME       NOT NULL DEFAULT SUSER_SNAME()
);
GO

-- 2) The agent's own login: a contained user that lives only in this database.
--    Separate from your admin login and from the login the website uses.
CREATE USER comm_agent WITH PASSWORD = 'REPLACE-with-a-long-random-password';
GO

-- 3) What it may do: read the schema and reference data, and insert/update the
--    data tables. DELETE is granted only so a NO reply can undo what was just added
--    (the agent's linter blocks DELETE everywhere except undo scripts).
--    It cannot read users, and cannot create, alter, or drop anything.
GRANT SELECT ON SCHEMA::dbo TO comm_agent;
DENY  SELECT ON dbo.users   TO comm_agent;
GRANT INSERT, UPDATE, DELETE ON dbo.products              TO comm_agent;
GRANT INSERT, UPDATE, DELETE ON dbo.product_groups        TO comm_agent;
GRANT INSERT, UPDATE, DELETE ON dbo.product_classes       TO comm_agent;
GRANT INSERT, UPDATE, DELETE ON dbo.terms_and_conditions  TO comm_agent;
GRANT INSERT, DELETE         ON dbo.data_script_log       TO comm_agent;
GRANT VIEW DEFINITION TO comm_agent;   -- lets it read keys and foreign keys
GO
