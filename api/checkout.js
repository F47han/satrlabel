// ─────────────────────────────────────────────────────────────
// SATR — Stripe Checkout Function (Vercel)
// File location: api/checkout.js
//
// Vercel will automatically serve this at: /api/checkout
// Set env vars in Vercel dashboard:
//   STRIPE_SECRET_KEY = sk_test_... or sk_live_...
//   SITE_URL          = https://your-site.vercel.app
// ─────────────────────────────────────────────────────────────

const Stripe = require('stripe');

// ── Authoritative price catalog ────────────────────────────────
// Prices in pence. NEVER trust client prices. Always charge from here.
const CATALOG = {
  'flora':  { name: 'Flora',  price: 5000 },
  'noor':   { name: 'Noor',   price: 5500 },
  'sahara': { name: 'Sahara', price: 5000 },
  'azra':   { name: 'Azra',   price: 5000 },
  'sereen': { name: 'Sereen', price: 5000 },
  'layla':  { name: 'Layla',  price: 5000 },
  'nila':   { name: 'Nila',   price: 5000 },
  'sama':   { name: 'Sama',   price: 5000 },
};

const VALID_SIZES = ['Small (52)', 'Medium (54)', 'Large (56)'];

module.exports = async function handler(req, res) {

  // ── CORS headers (needed for static HTML calling the API) ──
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── Only accept POST ───────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Parse & validate body ──────────────────────────────────
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // ── Build line items with server-side price verification ───
  const lineItems = [];

  for (const item of items) {
    const product = CATALOG[item.productId];

    if (!product) {
      return res.status(400).json({ error: `Unknown product: ${item.productId}` });
    }

    const qty = parseInt(item.quantity, 10);
    if (!qty || qty < 1 || qty > 99) {
      return res.status(400).json({ error: `Invalid quantity for ${product.name}` });
    }

    if (!item.size || !VALID_SIZES.includes(item.size)) {
      return res.status(400).json({ error: `Invalid size for ${product.name}` });
    }

    lineItems.push({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: `${product.name} Abaya`,
          description: `Size: ${item.size}`,
          metadata: {
            productId: item.productId,
            size: item.size,
          }
        },
        unit_amount: product.price, // always from server catalog
      },
      quantity: qty,
    });
  }

  // ── Create Stripe Checkout Session ────────────────────────
  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.SITE_URL}/cart.html`,
      shipping_address_collection: {
        allowed_countries: ['GB'],
      },
      metadata: {
        source: 'satr-website',
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('[Stripe Error]', err.message);
    return res.status(500).json({ error: 'Payment session could not be created' });
  }
};
