const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { items, customerName, address } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in cart' });
        }

        // Build line items for Stripe
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'gbp',
                product_data: {
                    name: item.name,
                    description: `Size: ${item.size}`,
                },
                unit_amount: item.price, // already in pence
            },
            quantity: item.quantity,
        }));

        // Build order summary for metadata
        const orderSummary = items.map(i => `${i.name} (Size: ${i.size}) x${i.quantity}`).join(', ');

        const origin = req.headers.origin || 'https://your-site.vercel.app';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/cart.html`,
            shipping_address_collection: {
                allowed_countries: ['GB', 'US', 'CA', 'AU', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'FR', 'DE', 'NL', 'BE', 'SE', 'NO', 'DK'],
            },
            phone_number_collection: { enabled: true },
            customer_email: undefined,
            metadata: {
                customer_name: customerName || '',
                order_summary: orderSummary.substring(0, 500),
                items_count: items.length.toString(),
            },
            payment_intent_data: {
                metadata: {
                    customer_name: customerName || '',
                    order_summary: orderSummary.substring(0, 500),
                },
                receipt_email: 'khanjannat.2005@gmail.com',
            },
        });

        return res.status(200).json({ url: session.url });

    } catch (err) {
        console.error('[Stripe Error]', err);
        return res.status(500).json({ error: err.message });
    }
};
