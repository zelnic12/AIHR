# VoltEdge — Electronics Store

A fast, self-contained retail electronics storefront built with plain HTML, CSS, and JavaScript — no build step and no dependencies.

## Features

- **Product catalog** — 18 products across Laptops, Phones, Audio, Gaming, Smart Home, Wearables, and Accessories, rendered dynamically.
- **Live search** by product name or category.
- **Category filters** and **sorting** (featured, price low→high, price high→low, top rated).
- **Slide-out cart** with quantity controls, remove, live subtotal, and a demo checkout.
- **Persistent cart** across reloads via `localStorage`.
- **Fully responsive** dark-theme UI.

## Project structure

| File | Purpose |
|------|---------|
| `index.html` | Page structure: header, hero, catalog, cart drawer, footer |
| `styles.css` | Styling and responsive layout |
| `script.js` | Product data plus all interactivity |

## Running locally

No build required. Open `index.html` in any modern browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```
