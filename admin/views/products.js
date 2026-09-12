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
          <div class="form-field"><label>Regular price *</label><input name="price" id="fPrice" type="number" step="0.01" min="0" value="${p.price ?? ""}" required /></div>
          <div class="form-field"><label>Sale price (optional)</label><input name="sale_price" id="fSalePrice" type="number" step="0.01" min="0" value="${p.salePrice ?? ""}" placeholder="Leave blank for no discount" /></div>
          <div class="form-field full"><span class="discount-hint" id="discountHint"></span></div>
          <div class="form-field"><label>Stock *</label><input name="stock" type="number" min="0" step="1" value="${p.stock ?? ""}" required /></div>
          <div class="form-field"><label>Rating</label><input name="rating" type="number" min="0" max="5" step="0.1" value="${p.rating ?? ""}" /></div>
          <div class="form-field"><label>Emoji</label><input name="emoji" value="${esc(p.emoji || "")}" /></div>
          <div class="form-field full"><label>Description</label><textarea name="description">${esc(p.description || "")}</textarea></div>
          <div class="form-field full"><label>Specs (one per line — "Key: Value")</label><textarea name="specs">${esc(specsText)}</textarea></div>
        </div>
        <p class="form-error" id="prodErr" hidden></p>
        ${isEdit ? `<div class="image-manager" id="imageManager"><label class="im-label">Product images</label><div id="imageManagerBody" class="im-body">Loading…</div></div>`
                 : `<p class="im-note">Save the product first, then reopen it to manage images.</p>`}
      </form>`,
    footHTML: `
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="prodSave">${isEdit ? "Save changes" : "Create product"}</button>`,
    onMount(overlay, close) {
      // Live discount % hint as prices change.
      const priceEl = overlay.querySelector("#fPrice");
      const saleEl = overlay.querySelector("#fSalePrice");
      const hintEl = overlay.querySelector("#discountHint");
      const updateHint = () => {
        const price = Number(priceEl.value);
        const sale = saleEl.value === "" ? null : Number(saleEl.value);
        if (sale != null && !Number.isNaN(sale) && !Number.isNaN(price) && price > 0 && sale >= 0 && sale < price) {
          const pct = Math.round((1 - sale / price) * 100);
          hintEl.innerHTML = `<span class="discount-badge">${pct}% OFF</span> Sale price active.`;
        } else if (sale != null && sale >= price && price > 0) {
          hintEl.innerHTML = `<span class="discount-warn">Sale price ≥ regular price — will be treated as no discount.</span>`;
        } else {
          hintEl.textContent = "No discount.";
        }
      };
      priceEl.addEventListener("input", updateHint);
      saleEl.addEventListener("input", updateHint);
      updateHint();

      // Image manager (edit only).
      if (isEdit) mountImageManager(overlay.querySelector("#imageManagerBody"), p.id);

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

        // Sale price: blank → null (clears any promo).
        const saleRaw = String(fd.get("sale_price") ?? "").trim();
        payload.sale_price = saleRaw === "" ? null : Number(saleRaw);

        // Client-side sanity checks (server also validates & is authoritative).
        if (payload.name.length < 2 || Number.isNaN(payload.price) || payload.price < 0 || !Number.isInteger(payload.stock) || payload.stock < 0) {
          err.textContent = "Name (2+ chars), a non-negative price, and a whole-number stock are required.";
          err.hidden = false;
          return;
        }
        if (payload.sale_price != null && (Number.isNaN(payload.sale_price) || payload.sale_price < 0)) {
          err.textContent = "Sale price must be a non-negative number, or blank.";
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

// Render an emoji-scheme url or a real uploaded image as a thumbnail.
function imageThumb(img) {
  const isEmoji = typeof img.url === "string" && img.url.startsWith("emoji:");
  return isEmoji
    ? `<span class="im-emoji">${esc(img.url.slice(6))}</span>`
    : `<img src="${esc(img.url)}" alt="${esc(img.alt || "")}" loading="lazy" />`;
}

// Image manager: upload, preview, set-main, delete. Reorder via set-main
// (promotes an image to primary). Mounted into the product edit modal.
async function mountImageManager(container, productId) {
  async function refresh() {
    let images;
    try {
      images = await api.listImages(productId);
    } catch (e) {
      container.innerHTML = `<span class="form-error">${esc(e.message)}</span>`;
      return;
    }
    const main = images[0];
    const rest = images.slice(1);

    container.innerHTML = `
      <div class="im-main">
        <div class="im-main-preview">${main ? imageThumb(main) : `<span class="im-empty">No images yet</span>`}</div>
        ${main ? `<span class="im-main-tag">Main image</span>` : ""}
      </div>
      ${rest.length ? `<div class="im-grid">${rest.map(img => `
        <div class="im-cell" data-img="${img.id}">
          <div class="im-cell-preview">${imageThumb(img)}</div>
          <div class="im-cell-actions">
            <button type="button" class="icon-action" data-main="${img.id}">Set main</button>
            <button type="button" class="icon-action danger" data-del="${img.id}">Delete</button>
          </div>
        </div>`).join("")}</div>` : ""}
      ${main && rest.length === 0 ? `<div class="im-single-actions"><button type="button" class="icon-action danger" data-del="${main.id}">Delete image</button></div>` : ""}
      <div class="im-upload">
        <input type="file" id="imgFile" accept="image/jpeg,image/png,image/webp" multiple hidden />
        <button type="button" class="btn btn-secondary btn-sm" id="imgUploadBtn">＋ Upload image</button>
        <span class="im-hint">JPG, PNG or WebP · max 5 MB</span>
        <span class="im-status" id="imgStatus"></span>
      </div>`;

    // Upload
    const fileInput = container.querySelector("#imgFile");
    container.querySelector("#imgUploadBtn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      if (!fileInput.files.length) return;
      const status = container.querySelector("#imgStatus");
      status.textContent = "Uploading…";
      try {
        await api.uploadImages(productId, fileInput.files);
        toast("Image uploaded", "success");
        refresh();
      } catch (e) {
        status.textContent = "";
        toast(e.message, "error");
      }
    });

    // Set main
    container.querySelectorAll("[data-main]").forEach(b => b.addEventListener("click", async () => {
      try { await api.setMainImage(productId, b.dataset.main); toast("Main image updated", "success"); refresh(); }
      catch (e) { toast(e.message, "error"); }
    }));

    // Delete
    container.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
      try { await api.deleteImage(productId, b.dataset.del); toast("Image deleted", "success"); refresh(); }
      catch (e) { toast(e.message, "error"); }
    }));
  }
  refresh();
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
      { key: "price", label: "Regular", num: true, render: r => money(r.price) },
      { key: "sale", label: "Sale", num: true, render: r => {
          if (r.onSale) return `<span class="sale-price">${money(r.effectivePrice)}</span> <span class="sale-off">${r.discountPercent}% OFF</span>`;
          return `<span class="muted-dash">—</span>`;
      }},
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
