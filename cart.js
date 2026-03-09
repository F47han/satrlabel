// ─────────────────────────────────────────────────────────────
// SATR — Cart Engine (cart.js)
// Include this on EVERY page: <script src="cart.js"></script>
// ─────────────────────────────────────────────────────────────

const SatrCart = (() => {

  const STORAGE_KEY = 'satr_cart';

  // ── Product catalog (server-side price authority) ──────────
  // These are your canonical prices. Stripe will verify against these.
  const CATALOG = {
    'flora':  { name: 'Flora',  price: 4500 }, // in pence
    'noor':   { name: 'Noor',   price: 4500 },
    'sahara': { name: 'Sahara', price: 4500 },
    'azra':   { name: 'Azra',   price: 4500 },
    'sereen': { name: 'Sereen', price: 4500 },
    'layla':  { name: 'Layla',  price: 4500 },
    'nila':   { name: 'Nila',   price: 4500 },
    'sama':   { name: 'Sama',   price: 4500 },
  };

  // ── Read cart from localStorage ────────────────────────────
  function getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { items: [] };
      const cart = JSON.parse(raw);
      // Validate structure
      if (!Array.isArray(cart.items)) return { items: [] };
      return cart;
    } catch {
      // Corrupted data — reset gracefully
      localStorage.removeItem(STORAGE_KEY);
      return { items: [] };
    }
  }

  // ── Write cart to localStorage ─────────────────────────────
  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: cart.items,
      updatedAt: new Date().toISOString()
    }));
    // Dispatch event so any open page can react
    window.dispatchEvent(new CustomEvent('satr:cart-updated', { detail: cart }));
  }

  // ── Add item ───────────────────────────────────────────────
  function addItem(productId, size) {
    const product = CATALOG[productId];
    if (!product) {
      console.error(`[SatrCart] Unknown product: ${productId}`);
      return null;
    }
    if (!size) {
      console.error('[SatrCart] Size is required');
      return null;
    }

    const cart = getCart();
    const existingIndex = cart.items.findIndex(
      i => i.productId === productId && i.size === size
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += 1;
    } else {
      cart.items.push({
        productId,
        name: product.name,
        price: product.price,
        size,
        quantity: 1,
      });
    }

    saveCart(cart);
    return cart;
  }

  // ── Update quantity ────────────────────────────────────────
  function updateQuantity(productId, size, quantity) {
    const qty = parseInt(quantity, 10);
    const cart = getCart();

    if (qty <= 0) {
      return removeItem(productId, size);
    }

    const item = cart.items.find(
      i => i.productId === productId && i.size === size
    );
    if (item) {
      item.quantity = qty;
      saveCart(cart);
    }
    return cart;
  }

  // ── Remove item ────────────────────────────────────────────
  function removeItem(productId, size) {
    const cart = getCart();
    cart.items = cart.items.filter(
      i => !(i.productId === productId && i.size === size)
    );
    saveCart(cart);
    return cart;
  }

  // ── Clear entire cart ──────────────────────────────────────
  function clearCart() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('satr:cart-updated', { detail: { items: [] } }));
  }

  // ── Cart summary ───────────────────────────────────────────
  function getSummary() {
    const cart = getCart();
    const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal  = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    return {
      items: cart.items,
      itemCount,
      subtotal,
      subtotalFormatted: `£${(subtotal / 100).toFixed(2)}`,
    };
  }

  // ── Update cart badge in nav (call on every page) ──────────
  function refreshBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const { itemCount } = getSummary();
    badge.textContent = itemCount;
    badge.style.display = itemCount > 0 ? 'inline-flex' : 'none';
  }

  // Auto-refresh badge whenever cart changes
  window.addEventListener('satr:cart-updated', refreshBadge);
  // Refresh on load
  document.addEventListener('DOMContentLoaded', refreshBadge);

  // ── Public API ─────────────────────────────────────────────
  return { getCart, addItem, updateQuantity, removeItem, clearCart, getSummary, CATALOG };

})();
