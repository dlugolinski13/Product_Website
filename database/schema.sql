-- Product ordering site — initial schema
-- Run against the Azure SQL Database once it's provisioned (see CLAUDE.md setup step 4).

CREATE TABLE users (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  email NVARCHAR(255) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,
  role NVARCHAR(20) NOT NULL CHECK (role IN ('admin','customer')),
  full_name NVARCHAR(200),
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE product_groups (
  code CHAR(4) PRIMARY KEY,          -- four-letter abbreviation
  name NVARCHAR(100) NOT NULL        -- full group name
);

CREATE TABLE product_classes (
  class_number INT PRIMARY KEY,
  detail NVARCHAR(200) NOT NULL
);

CREATE TABLE terms_and_conditions (
  id INT IDENTITY PRIMARY KEY,
  freight_terms NVARCHAR(50) NOT NULL,   -- e.g. COLLECT, PREPAID
  payment_terms NVARCHAR(200) NOT NULL,  -- e.g. "Net 30 days with credit approval"
  fob_point NVARCHAR(200)                -- freight originating location
);

CREATE TABLE products (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  item_number NVARCHAR(50) NOT NULL UNIQUE,  -- mixed letters/numbers, customer-facing
  upc NVARCHAR(14),                          -- rendered as a scannable barcode client-side
  name NVARCHAR(200) NOT NULL,
  description NVARCHAR(MAX),
  shipping_method NVARCHAR(20) NOT NULL CHECK (shipping_method IN ('drop_ship','delivered')),
  group_code CHAR(4) NOT NULL REFERENCES product_groups(code),
  class_number INT NOT NULL REFERENCES product_classes(class_number),
  terms_id INT REFERENCES terms_and_conditions(id),
  activation_date DATE,
  pack_amount INT,               -- quantity per pack
  pack_unit NVARCHAR(50),
  cases_per_pack INT,            -- confirm direction: may need to be packs_per_case instead
  case_weight DECIMAL(10,2),     -- for shipping calculations
  case_length DECIMAL(10,2),
  case_width DECIMAL(10,2),
  case_height DECIMAL(10,2),
  company_price DECIMAL(10,2) NOT NULL,
  retail_price DECIMAL(10,2) NOT NULL,
  comments NVARCHAR(MAX),            -- internal/admin-only notes
  customer_comments NVARCHAR(MAX),   -- shown to customers
  is_active BIT NOT NULL DEFAULT 1
);

CREATE TABLE product_images (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  product_id UNIQUEIDENTIFIER NOT NULL REFERENCES products(id),
  blob_name NVARCHAR(500) NOT NULL,      -- path within the product-images blob container
  display_order INT NOT NULL DEFAULT 0   -- lowest is shown first / used as the thumbnail
);

CREATE TABLE orders (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  customer_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
  status NVARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','completed','cancelled')),
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  submitted_at DATETIME2
);

CREATE TABLE order_items (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  order_id UNIQUEIDENTIFIER NOT NULL REFERENCES orders(id),
  product_id UNIQUEIDENTIFIER NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  notes NVARCHAR(MAX)
);
