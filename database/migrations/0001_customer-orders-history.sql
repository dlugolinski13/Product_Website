-- Add salesperson assignment and customer shipping/billing address to users table.
ALTER TABLE dbo.users
ADD salesperson_id UNIQUEIDENTIFIER NULL,
    address_line1   NVARCHAR(200)       NULL,
    address_line2   NVARCHAR(200)       NULL,
    city            NVARCHAR(100)       NULL,
    state           NVARCHAR(100)       NULL,
    postal_code     NVARCHAR(20)        NULL,
    country         NVARCHAR(100)       NULL;
