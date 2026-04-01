const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // If webhook secret is set, verify signature
        if (webhookSecret) {
            const rawBody = await getRawBody(req);
            event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        } else {
            event = req.body;
        }
    } catch (err) {
        console.error('Webhook signature error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const customerName   = session.metadata?.customer_name || 'Not provided';
        const orderSummary   = session.metadata?.order_summary  || 'See Stripe dashboard';
        const shipping       = session.shipping_details;
        const email          = session.customer_details?.email || 'Not provided';
        const phone          = session.customer_details?.phone || 'Not provided';
        const amountTotal    = `£${(session.amount_total / 100).toFixed(2)}`;

        const addressLines = shipping?.address
            ? [
                shipping.address.line1,
                shipping.address.line2,
                shipping.address.city,
                shipping.address.state,
                shipping.address.postal_code,
                shipping.address.country,
              ].filter(Boolean).join(', ')
            : 'Not provided';

        const shippingName = shipping?.name || customerName;

        // Send email via Resend (if configured) or log
        if (process.env.RESEND_API_KEY) {
            await sendEmail({
                to: 'khanjannat.2005@gmail.com',
                subject: `New Satr Order — ${amountTotal}`,
                html: `
                    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #4a3326;">
                        <h2 style="font-size: 1.8rem; border-bottom: 2px solid #4a3326; padding-bottom: 10px;">New Order Received 🎉</h2>
                        
                        <h3 style="color: #7a6855;">Customer Details</h3>
                        <p><strong>Name:</strong> ${shippingName}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                        <p><strong>Delivery Address:</strong> ${addressLines}</p>

                        <h3 style="color: #7a6855; margin-top: 1.5rem;">Order Details</h3>
                        <p><strong>Items:</strong> ${orderSummary}</p>
                        <p><strong>Total Paid:</strong> ${amountTotal}</p>
                        <p><strong>Stripe Session:</strong> ${session.id}</p>

                        <p style="margin-top: 2rem; font-size: 0.85rem; color: #a89a89;">
                            You can also view this order in your <a href="https://dashboard.stripe.com/payments" style="color: #4a3326;">Stripe Dashboard</a>.
                        </p>
                    </div>
                `
            });
        }

        console.log(`✅ Order completed: ${orderSummary} | ${amountTotal} | ${addressLines}`);
    }

    res.status(200).json({ received: true });
};

async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

async function sendEmail({ to, subject, html }) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'Satr Orders <orders@satr.co.uk>',
            to,
            subject,
            html,
        }),
    });
    if (!response.ok) {
        const err = await response.text();
        console.error('Email send failed:', err);
    }
}
