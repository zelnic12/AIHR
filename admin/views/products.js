// Products view: full CRUD + stock management.
import { api } from "../components/api.js";
import { money, esc, stockStatus } from "../components/format.js";
import { dataTable } from "../components/dataTable.js";
import { openModal, confirmDialog } from "../components/modal.js";
import { toast } from "../components/toast.js";

async function reload(root) { return renderProducts(root); }

// Product add/edit form inside a modal.
function productForm(root, product = null) {
  const isEdit = !!product;
  const p = product || {};
  const specsText = p.specs ? Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join("\n") : "";

  openModal({
    title: isEdit ? `Edit — ${p.name}` : "Add product",
    bodyHTML: `
      <form id="prodForm">
        <div class="form-grid">
          <div class="form-field full"><label>Name *</label><input name="name" value="${esc(p.name || "")}" required /></div>
          <div class="form-field"><label>Brand</label><input name="brand" value="${esc(p.brand || "")}" /></div>
          <div class="form-field"><label>Category</label><input name="category" value="${esc(p.category || "")}" /></div>
          <div class="form-field"><label>Price *</label><input name="price" type="number" step="0.01" min="0" value="${p.price ?? ""}" required /></div>
          <div class="form-field"><label>Stock *</label><input name="stock" type="number" min="0" step="1" value="${p.stock ?? ""}" required /></div>
          <div class="form-field"><label>Rating</label><input name="rating" type="number" min="0" max="5" step="0.1" value="${p.rating ?? ""}" /></div>
          <div class="form-field"><label>Emoji</label><input name="emoji" value="${esc(p.emoji || "")}" /></div>
          <div class="form-field full"><label>Description</label><textarea name="description">${esc(p.description || "")}</textarea></div>
          <div class="form-field full"><label>Specs (one per line — "Key: Value")</label><textarea name="specs">${esc(specsText)}</textarea></div>
        </div>
        <p class="form-error" id="prodErr" hidden></p>
      </form>`,
    footHTML: `
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="prodSave">${isEdit ? "Save changes" : "Create product"}</button>`,
    onMount(overlay, close) {
      overlay.querySelector("#prodSave").addEventListener("click", async () => {
        const form = overlay.querySelector("#prodForm");
        const err = overlay.querySelector("#prodErr");
        const fd = new FormData(form);

        // Parse specs textarea into an object.
        const specs = {};
        String(fd.get("specs") || "").split("\n").forEach(line => {
          const idx = line.indexOf(":");
          if (idx > 0) specs[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        });

        const payload = {
          name: String(fd.get("name") || "").trim(),
          brand: String(fd.get("brand") || "").trim(),
          category: String(fd.get("category") || "").trim() || undefined,
          price: Number(fd.get("price")),
          stock: parseInt(fd.get("stock"), 10),
          emoji: String(fd.get("emoji") || "").trim() || undefined,
          description: String(fd.get("description") || "").trim(),
          specs,
        };
        const ratingRaw = fd.get("rating");
        if (ratingRaw !== "" && ratingRaw != null) payload.rating = Number(ratingRaw);

        // Client-side sanity checks (server also validates).
        if (payload.name.length < 2 || Number.isNaN(payload.price) || payload.price < 0 || !Number.isInteger(payload.stock) || payload.stock < 0) {
          err.textContent = "Name (2+ chars), a non-negative price, and a whole-number stock are required.";
          err.hidden = false;
          return;
        }

        try {
          if (isEdit) {
            await api.updateProduct(p.id, payload);
            toast("Product updated", "success");
          } else {
            await api.createProduct(payload);
            toast("Product created", "success");
          }
          close();
          reload(root);
        } catch (e) {
          err.textContent = e.message;
          err.hidden = false;
        }
      });
    },
  });
}

// Quick inline stock adjust modal.
function stockForm(root, product) {
  openModal({
    title: `Adjust stock — ${product.name}`,
    bodyHTML: `
      <div class="form-field">
        <label>Current stock: <strong>${product.stock}</strong>. Set new stock level:</label>
        <input id="newStock" type="number" min="0" step="1" value="${product.stock}" />
      </div>
      <p class="form-error" id="stockErr" hidden></p>`,
    footHTML: `
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="stockSave">Update stock</button>`,
    onMount(overlay, close) {
      overlay.querySelector("#stockSave").addEventListener("click", async () => {
        const val = parseInt(overlay.querySelector("#newStock").value, 10);
        const err = overlay.querySelector("#stockErr");
        if (!Number.isInteger(val) || val < 0) {
          err.textContent = "Stock must be a whole number ≥ 0."; err.hidden = false; return;
        }
        try {
          await api.updateProduct(product.id, { stock: val });
          toast("Stock updated", "success");
          close();
          reload(root);
        } catch (e) { err.textContent = e.message; err.hidden = false; }
      });
    },
  });
}

export async function renderProducts(root) {
  root.innerHTML = `<p class="admin-status">Loading products…</p>`;
  let products;
  try {
    products = await api.listProducts();
  } catch (err) {
    root.innerHTML = `<p class="admin-status error">${esc(err.message)}</p>`;
    return;
  }

  const table = dataTable({
    columns: [
      { key: "emoji", label: "", render: r => `<span style="font-size:1.3rem">${esc(r.emoji)}</span>` },
      { key: "name", label: "Name", render: r => `<strong>${esc(r.name)}</strong><br><span style="color:var(--muted);font-size:.8rem">${esc(r.brand)}</span>` },
      { key: "category", label: "Category" },
      { key: "price", label: "Price", num: true, render: r => money(r.price) },
      { key: "stock", label: "Stock", num: true, render: r => {
          const s = stockStatus(r.stock);
          return `<span class="stock-badge ${s.className}">${r.stock}</span>`;
      }},
      { key: "actions", label: "", render: r => `
        <div class="row-actions">
          <button class="icon-action" data-act="stock" data-id="${r.id}">Stock</button>
          <button class="icon-action" data-act="edit" data-id="${r.id}">Edit</button>
          <button class="icon-action danger" data-act="delete" data-id="${r.id}">Delete</button>
        </div>` },
    ],
    rows: products,
    rowKey: r => r.id,
    empty: "No products yet.",
  });

  root.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h2>Products (${products.length})</h2>
        <button class="btn btn-primary btn-sm" id="addProductBtn">+ Add product</button>
      </div>
      ${table}
    </div>`;

  root.querySelector("#addProductBtn").addEventListener("click", () => productForm(root, null));

  const byId = new Map(products.map(p => [String(p.id), p]));
  root.querySelectorAll("[data-act]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const product = byId.get(btn.dataset.id);
      const act = btn.dataset.act;
      if (act === "edit") productForm(root, product);
      else if (act === "stock") stockForm(root, product);
      else if (act === "delete") {
        const ok = await confirmDialog({
          title: "Delete product",
          message: `Delete "${product.name}"? This cannot be undone.`,
          confirmText: "Delete", danger: true,
        });
        if (!ok) return;
        try {
          await api.deleteProduct(product.id);
          toast("Product deleted", "success");
          reload(root);
        } catch (e) { toast(e.message, "error"); }
      }
    });
  });
}
