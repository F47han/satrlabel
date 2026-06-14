import Stripe from "stripe";
import { buffer } from "micro";

// Fail fast if environment variables are missing
if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// In production, replace this with a database table of processed session IDs
const processedSessions = new Set();

async function fulfillOrder(session) {
  const sessionId = session.id;
  const email = session.customer_details?.email;
  const phone = session.customer_details?.phone;
  const shipping = session.shipping_details?.address;
  const items = JSON.parse(session.metadata?.cart_summary || "[]");

  console.log("--- New Order ---");
  console.log("Session ID:", sessionId);
  console.log("Email:", email);
  console.log("Phone:", phone);
  console.log("Shipping address:", shipping);
  console.log("Items ordered:", items);

  // ---- Plug in your real logic below ----
  // await sendConfirmationEmail(email, items, shipping);
  // await saveOrderToDatabase(sessionId, items, shipping, email, phone);
  // await notifyFulfillmentTeam(sessionId, items, shipping);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  // Verify the webhook signature
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Route event types
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // Idempotency check — skip if already processed
        if (processedSessions.has(session.id)) {
          console.log("Duplicate event received, skipping:", session.id);
          break;
        }

        await fulfillOrder(session);
        processedSessions.add(session.id);
        console.log("Order fulfilled successfully:", session.id);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        console.log("Checkout session expired:", session.id);
        // await releaseReservedStock(session.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        const reason = intent.last_payment_error?.message || "Unknown reason";
        console.warn("Payment failed:", intent.id, "Reason:", reason);
        // await notifyCustomerOfFailure(intent.id);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }
  } catch (err) {
    // Returning 500 tells Stripe to retry the webhook — important for fulfillment failures
    console.error("Error processing webhook event:", err.message);
    return res.status(500).send("Internal fulfillment error");
  }

  return res.status(200).send("OK");
}