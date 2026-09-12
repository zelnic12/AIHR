// ---- Midtrans payment notifications (webhook) ----
// PUBLIC (no auth): Midtrans calls this server-to-server. Authenticity is
// verified via the SHA512 signature key, NOT by any session. We always respond
// 200 quickly so Midtrans doesn't retry-storm; internal failures are logged.
import { Router } from "express";
import * as store from "../store.js";
import { verifySignature, mapTransactionStatus, isPaymentEnabled } from "../payment/midtrans.js";

const router = Router();

// POST /api/payments/midtrans-notification
router.post("/midtrans-notification", async (req, res) => {
  const payload = req.body || {};
  // Respond 200 no matter what (after best-effort processing) to avoid retries.
  try {
    if (!isPaymentEnabled()) {
      console.warn("Midtrans notification received but gateway is not configured — ignoring.");
      return res.status(200).json({ received: true });
    }

    // 1) Verify authenticity before trusting anything in the payload.
    if (!verifySignature(payload)) {
      console.warn(`Midtrans notification REJECTED (bad signature) for order_id=${payload.order_id}`);
      // 200 so Midtrans doesn't retry an already-rejected notification.
      return res.status(200).json({ received: true, verified: false });
    }

    const orderId = payload.order_id;
    const { paymentStatus, orderStatus } = mapTransactionStatus(
      payload.transaction_status,
      payload.fraud_status
    );

    // 2) Apply to the order.
    const result = await store.applyPaymentNotification(orderId, {
      paymentStatus,
      orderStatus,
      txnId: payload.transaction_id || null,
    });

    if (!result.updated) {
      console.warn(`Midtrans notification for unknown order_id=${orderId} (transaction_status=${payload.transaction_status})`);
    } else {
      console.log(`Midtrans notification applied: order=${orderId} txn_status=${payload.transaction_status} → payment=${paymentStatus}${orderStatus ? `, order=${orderStatus}` : ""}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // Log for debugging but still 200 so Midtrans stops retrying.
    console.error("Error processing Midtrans notification:", err?.message || err);
    return res.status(200).json({ received: true });
  }
});

export default router;
