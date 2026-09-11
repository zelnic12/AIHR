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

On first start, the API seeds `data/products.json` from the catalog and creates
an empty `data/orders.json`. These files (and `node_modules/`) are gitignored.

Once running:

- Storefront: <http://localhost:3000/>
- API base:   <http://localhost:3000/api>
- Health:     <http://localhost:3000/api/health>

## Data storage

Data is persisted to JSON files under `server/data/` via a small store module
(`src/store.js`). All data access goes through that module, so the storage
engine can later be swapped for a real database (Postgres, Mongo, etc.) without
changing the routers.

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
