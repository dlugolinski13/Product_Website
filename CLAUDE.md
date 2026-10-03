# Product ordering site — project brief

## What this is
A Vue.js site with three roles:
- **Admin**: manages the product catalog — only admins can reach the Upload Product page (`/upload-product`, gated in both the router and the API)
- **Salesperson**: manages an assigned set of customers from the Account page (view/reassign which salesperson a customer has)
- **Customer**: logs in, views current products, places and reloads orders, manages their own account, sees their assigned salesperson

## Stack decisions
- **Frontend**: Vue 3 + Vite, state in Pinia (`src/stores/cart.js` is the cart store)
- **Backend**: Azure Functions (Node.js) — lives in an `/api` folder alongside the Vue app
- **Hosting**: Azure Static Web Apps — hosts the built Vue frontend and the `/api` functions together as one resource, deploys automatically via GitHub Actions on push to `main`
- **Database**: Azure SQL Database (T-SQL)
- **Image storage**: Azure Blob Storage — product images are uploaded to a blob container by the API, not linked from arbitrary external URLs; the database stores only the blob name and the API resolves it to a URL on read
- **Auth**: Custom JWT-based auth. A `users` table stores email/password hash/role (`admin`, `salesperson`, or `customer`). The API issues a JWT on login carrying `sub`/`role`/`email`; the frontend decodes that payload for display (`src/auth.js`'s `user` computed — decode only, no signature check) to show/hide role-gated nav links and pages; the API re-checks role on every role-restricted request via `requireRole` (see `api/src/lib/auth.js`). The frontend must send the JWT as `X-Authorization: Bearer <token>`, not the standard `Authorization` header — Azure Static Web Apps overwrites `Authorization` on managed Functions requests with its own token.
- **Frontend structure**: `vue-router` with hash history (deep links work on Static Web Apps without fallback config). `src/api.js` wraps `fetch` to `/api` and sends the JWT as `X-Authorization`; `src/auth.js` holds the token (a ref persisted to localStorage) and the decoded `user`. Routes needing a token set `meta: { requiresAuth: true }`; `/upload-product` additionally sets `meta: { requiresAdmin: true }`, enforced in `router.js`'s `requireAuth` guard (redirects non-admins to `/products`). Most views log out and redirect to `/login?redirect=…` on a 401.
  - Pages: `/` Home, `/products` + `/products/:id` Products/detail (add to cart), `/cart` Cart, `/account` Account (profile summary, salesperson info or customer-management table depending on role, links to **Edit profile** and **Order history** — these are intentionally not top-level nav tabs), `/account/edit` Edit Profile (the actual form), `/orders` Order History, `/upload-product` Upload Product (admin only).
  - `App.vue`'s header puts the logged-in user's email with a Sign out link beneath it in the upper-right corner, with an Account link next to that block; Upload Product only appears in the nav for admins.
- **Sample data**: `database/seed.sql` (idempotent, run after `schema.sql`) inserts four Champion luggage sets copied from the Mazel catalog, plus the `LUGG` group, class 12 and COLLECT/Net 30 terms they reference.
- **Repo**: GitHub, opened in VS Code

## Testing & CI
- **Test runner**: Vitest for both the frontend (`vitest.config.js`, jsdom environment, `@vue/test-utils`, tests under `src/`) and the API (`api/vitest.config.js`, node environment, tests under `api/test/`, mirroring `api/src/`).
- **API test files must never live under `api/src/`.** `api/package.json`'s `"main": "src/functions/*.js"` tells Azure Functions which files to load as routes, and it's a glob — `*.js` matches `login.test.js` just as much as `login.js`. This actually happened: test files were briefly added under `api/src/functions/`, the Functions host tried to load them too, they `import` from `vitest` (a devDependency not present in the production install), and that one failing `require` aborted registration of *every* route — the whole API 404'd, not just the tested ones. Fixed by moving all API tests to `api/test/` (`api/test/functions/`, `api/test/lib/`, `api/test/testUtils/`), well outside anything Azure's `main` glob can reach.
- **API module system**: `/api` is CommonJS (`require`/`module.exports`). It was briefly switched to ESM (`"type": "module"`) to work around the `vi.mock()` limitation below, which also shipped to production at the same time as the test-file-glob bug above and made ESM look like the cause when the real cause was the glob — reverted back to CJS regardless, since it's the form already proven to work and there's no reason to reintroduce the risk. Do not add `"type": "module"` to `api/package.json`.
- **Mocking CJS dependencies in tests**: `vi.mock()` does not reliably intercept `require()` calls made from inside a CommonJS module (it only reliably catches the test file's own direct imports), so API tests use `api/test/testUtils/mockRequire.js` instead — it swaps entries in Node's real `require.cache` for the target module's dependencies before requiring it via `createRequire(import.meta.url)`, then restores the cache. See any `api/test/**/*.test.js` for the pattern (`loadWithMocks(nodeRequire, { '<specifier>': <fakeExports> }, '<path to the src file>')`).
- **Testing Azure Functions handlers**: `@azure/functions` is mocked (via the same `loadWithMocks` helper) so `app.http(name, { handler })` just records the handler in a `Map` instead of registering with the real runtime; tests pull the handler out of that map and invoke it directly with a fake `request`/`context`. See `api/test/functions/*.test.js`.
- **Coverage gate**: both Vitest configs enforce an 85% threshold (lines/functions/branches/statements) via `coverage.thresholds`; `npm run test:coverage` fails the build below that. Run at both the repo root and in `/api`.
- **CI**: `.github/workflows/ci.yml` runs on every push and on PRs into `main`/`dev_branch` — separate from `azure-static-web-apps-*.yml`, which only builds+deploys (no tests) on push/PR to `main`. Two jobs, frontend and API, each `npm ci` + build/test with coverage. **This did not catch the glob bug** — CI never actually deploys or exercises Azure's `main` glob, it only runs Vitest, so a production-only failure mode like this one can pass CI and still break the live site. Worth remembering when something works in CI but not in production.

## Data model

Products reference two lookup tables (`product_groups`, `product_classes`) so the four-letter group code + name and the class number + detail stay consistent across products instead of being retyped. Terms and conditions (freight terms, payment terms, FOB point) also live in their own lookup table since the same terms are usually reused across many products. Product images live in their own `product_images` table (one product → many images), ordered by `display_order` for display, since a product can have more than one photo.

```sql
CREATE TABLE users (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  email NVARCHAR(255) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,
  role NVARCHAR(20) NOT NULL CHECK (role IN ('admin','salesperson','customer')),
  full_name NVARCHAR(200),
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  salesperson_id UNIQUEIDENTIFIER NULL,  -- self-reference: the customer's assigned salesperson
  address_line1 NVARCHAR(200) NULL,
  address_line2 NVARCHAR(200) NULL,
  city NVARCHAR(100) NULL,
  state NVARCHAR(100) NULL,
  postal_code NVARCHAR(20) NULL,
  country NVARCHAR(100) NULL
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
  cases_per_pack INT,            -- ⚠️ confirm direction: may need to be packs_per_case instead
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
```

Order carryover (copying items from a past order into a new one) needs no extra schema — it's app logic: read `order_items` from a chosen past `order_id` and let the customer pick which lines to bring into a new draft order.

## Environment setup steps
1. Create the GitHub repo (e.g. `product-ordering-site`) with a Node `.gitignore`.
2. Scaffold Vue 3 with Vite: `npm create vite@latest -- --template vue`, commit, push.
3. Add an `/api` folder using Azure Functions Core Tools (`func init`), one function per route (products, orders, etc). Static Web Apps auto-detects this as the backend.
4. In the Azure portal, create a SQL Database (Basic or Serverless tier) + SQL Server. Note the connection string, add your local IP to the firewall.
5. In the Azure portal, create a Static Web App linked to the GitHub repo — this auto-adds a GitHub Actions workflow that builds/deploys on every push to `main`.
6. Add the SQL connection string as an application setting on the Static Web App (never commit it to git).
7. In VS Code, install the Azure Static Web Apps and Azure Functions extensions to run (`swa start`) and debug locally.

## Open questions to confirm
- `cases_per_pack`: does a pack contain multiple cases, or does a case contain multiple packs? Field may need renaming to `packs_per_case`.
- `customer_comments`: assumed to be an admin-entered note shown to customers (not a customer-submitted review) — confirm.
- Exact role/permission rules beyond what's built (admin manages products, salespersons manage their assigned customers) still need to be defined for edge cases.
- **Production migration needed**: `database/schema.sql` now widens the `users.role` CHECK constraint to allow `salesperson`. The migration is idempotent and safe to re-run, but it has to actually be run against the production database (Azure portal Query editor or Azure Data Studio) — it does not happen automatically on deploy. Until it's run, inserting a `salesperson` row will fail against the live constraint even though the application code already expects that role to exist.
- `database/schema.sql` had drifted out of sync with the live schema before this change (missing the `salesperson_id`/address columns that `api/src/functions/account.js` already queries) — it's been caught up here, but it's worth periodically diffing this file against the real deployed schema so it stays trustworthy as the source of truth.
