# VoltEdge — Backend API

A Node.js + Express REST API for the VoltEdge electronics store. It manages
products and orders, recomputes order totals server-side, and serves the static
frontend.

## Requirements

- Node.js ≥ 18

## Install & run

```bash
cd server
npm install
npm start        # starts on http://localhost:3000
# or: npm run dev   (auto-restart on file changes)
```

The server requires a PostgreSQL database (see **Database** below). On boot it
applies the schema automatically; seed the catalog with `npm run seed`.

Once running:

- Storefront: <http://localhost:3000/>
- API base:   <http://localhost:3000/api>
- Health:     <http://localhost:3000/api/health>

## Database (PostgreSQL)

Data is persisted in **PostgreSQL**. All data access goes through `src/store.js`,
which queries the DB via a shared connection pool (`src/db/pool.js`).

### Schema

Five tables (`src/db/schema.sql`):

- **products** — catalog (price/stock/specs as JSONB), with `updated_at` trigger.
- **product_images** — many images per product (`ON DELETE CASCADE`), ordered by `position`.
- **customers** — deduplicated by unique `email`; upserted on each order.
- **orders** — public order id as PK, a **shipping snapshot**, and server-computed amounts.
- **order_items** — line items per order with **snapshotted** product name/price.

### Configuration

Connection settings come from the environment — either a single `DATABASE_URL`
or discrete vars:

```bash
# Option A
export DATABASE_URL=postgres://user:pass@localhost:5432/voltedge
# Option B
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres PGDATABASE=voltedge
```

### First-time setup

```bash
createdb voltedge          # create the database
npm run db:setup           # apply schema (migrate) + load catalog (seed)
npm start                  # migrations also run automatically on boot
```

- `npm run migrate` — apply `schema.sql` (idempotent).
- `npm run seed` — reset product tables and load the catalog + a placeholder image per product.

> **Running Postgres in the dev sandbox:** a helper is provided at
> `scripts/pg-start.sh` (initialises and starts a local PG 15 cluster and
> creates the `voltedge` database).

## API reference

### Products

| Method | Path | Description | Success |
|--------|------|-------------|---------|
| GET    | `/api/products`      | List all products | 200 |
| GET    | `/api/products/:id`  | Get one product | 200 / 404 |
| POST   | `/api/products`      | Create a product | 201 |
| PUT    | `/api/products/:id`  | Update a product (partial allowed) | 200 / 404 |
| DELETE | `/api/products/:id`  | Delete a product | 204 / 404 |

**Product body** (POST requires `name`, `price`, `stock`):

```json
{
  "name": "Example Gadget",
  "brand": "Example",
  "category": "Accessories",
  "price": 49.99,
  "stock": 10,
  "emoji": "📦",
  "rating": 4.5,
  "description": "…",
  "specs": { "Weight": "300 g" }
}
```

### Orders

| Method | Path | Description | Success |
|--------|------|-------------|---------|
| POST   | `/api/orders`     | Place an order | 201 |
| GET    | `/api/orders`     | List all orders | 200 |
| GET    | `/api/orders/:id` | Get one order | 200 / 404 |

**Order body:**

```json
{
  "customer": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "555-123-4567",
    "address": "1 Main St",
    "city": "Metropolis",
    "postal": "12345",
    "country": "USA"
  },
  "items": [
    { "id": 7, "qty": 2 },
    { "id": 9, "qty": 1 }
  ]
}
```

Server-side behaviour when placing an order:

- Validates the customer fields and item quantities.
- Checks each item against **real product stock** (returns `409` if insufficient).
- **Recomputes totals on the server** — subtotal, shipping (free over $100,
  otherwise $9.99), 8% estimated tax, and total. Client-supplied amounts are
  never trusted.
- Persists the order and **decrements stock**.

## Error responses

Errors are JSON: `{ "error": "…", "details": [ … ] }`.

- `400` — validation failed / invalid JSON
- `404` — resource not found
- `409` — order rejected (e.g. insufficient stock)
- `500` — internal error
