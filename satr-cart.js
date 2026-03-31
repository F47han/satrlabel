/**
 * Satr Cart — shared localStorage cart used on every page.
 * Include this script BEFORE any page-specific cart logic.
 */
const SatrCart = (() => {
    const KEY = 'satr_cart_v1';

    function load() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; }
        catch { return []; }
    }

    function save(items) {
        localStorage.setItem(KEY, JSON.stringify(items));
        window.dispatchEvent(new Event('satr:cart-updated'));
    }

    function addItem(productId, name, price, size) {
        const items = load();
        const idx = items.findIndex(i => i.productId === productId && i.size === size);
        if (idx > -1) {
            items[idx].quantity += 1;
        } else {
            items.push({ productId, name, price, size, quantity: 1 });
        }
        save(items);
    }

    function removeItem(productId, size) {
        save(load().filter(i => !(i.productId === productId && i.size === size)));
    }

    function updateQuantity(productId, size, qty) {
        if (qty < 1) { removeItem(productId, size); return; }
        const items = load();
        const idx = items.findIndex(i => i.productId === productId && i.size === size);
        if (idx > -1) { items[idx].quantity = qty; save(items); }
    }

    function getSummary() {
        const items = load();
        const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
        return {
            items,
            itemCount: items.reduce((s, i) => s + i.quantity, 0),
            subtotal,
            subtotalFormatted: '£' + (subtotal / 100).toFixed(2)
        };
    }

    function clear() { save([]); }

    return { addItem, removeItem, updateQuantity, getSummary, clear };
})();
