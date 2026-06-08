const crypto = require("crypto");
const {
  getWorkspaceById,
  response,
  saveWorkspace,
} = require("./_shared");

function parseStripeSignature(header = "") {
  return String(header || "")
    .split(",")
    .reduce((acc, part) => {
      const [key, value] = part.split("=");
      if (!key || !value) return acc;
      if (key === "t") acc.timestamp = value;
      if (key === "v1") acc.signatures.push(value);
      return acc;
    }, { timestamp: "", signatures: [] });
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!secret) {
    throw new Error("Stripe webhook secret is not configured.");
  }
  const parsed = parseStripeSignature(signatureHeader);
  if (!parsed.timestamp || !parsed.signatures.length) {
    throw new Error("Missing Stripe signature.");
  }
  const payload = `${parsed.timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return parsed.signatures.some((signature) => {
    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(signature, "hex");
    return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  });
}

function markBookingExpired(booking, now) {
  if (booking.status !== "held") return booking;
  if (booking.holdExpiresAt && new Date(booking.holdExpiresAt) > new Date(now)) return booking;
  return {
    ...booking,
    status: "expired",
    paymentStatus: booking.paymentStatus || "expired",
    expiredAt: now,
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed" });
    }

    const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
    const signature = event.headers?.["stripe-signature"] || event.headers?.["Stripe-Signature"] || "";
    if (!verifyStripeSignature(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
      return response(400, { error: "Webhook signature verification failed." });
    }

    const stripeEvent = JSON.parse(rawBody);
    if (stripeEvent.type !== "checkout.session.completed") {
      return response(200, { received: true, ignored: stripeEvent.type });
    }

    const session = stripeEvent.data?.object || {};
    const workspaceId = session.metadata?.workspaceId || "";
    const bookingId = session.metadata?.bookingId || "";
    const reservationCode = session.metadata?.reservationCode || "";
    if (!workspaceId || (!bookingId && !reservationCode)) {
      return response(400, { error: "Missing booking metadata." });
    }

    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return response(404, { error: "Workspace not found." });
    }

    const now = new Date().toISOString();
    let confirmedBooking = null;
    workspace.bookings = (workspace.bookings || []).map((booking) => {
      const isTarget = booking.id === bookingId || booking.reservationCode === reservationCode;
      if (!isTarget) return markBookingExpired(booking, now);
      confirmedBooking = {
        ...booking,
        status: "confirmed",
        paymentStatus: "paid",
        paidAt: now,
        confirmedAt: now,
        holdExpiresAt: null,
        stripeCheckoutSessionId: session.id || booking.stripeCheckoutSessionId || "",
        stripePaymentIntentId: session.payment_intent || booking.stripePaymentIntentId || "",
        stripePaymentAmount: Number(session.amount_total || 0) / 100,
        stripePaymentCurrency: String(session.currency || "eur").toUpperCase(),
        stripeAccountId: stripeEvent.account || booking.stripeAccountId || "",
        notes: booking.notes || "Paid via Stripe checkout.",
      };
      return confirmedBooking;
    });

    if (!confirmedBooking) {
      return response(404, { error: "Booking not found." });
    }

    workspace.bookingIntents = (workspace.bookingIntents || []).map((intent) => {
      if (intent.bookingId !== confirmedBooking.id && intent.reservationCode !== confirmedBooking.reservationCode) {
        return intent;
      }
      return {
        ...intent,
        stage: "confirmed",
        status: "confirmed",
        paymentStatus: "paid",
        paidAt: now,
        updatedAt: now,
      };
    });

    const saved = await saveWorkspace(workspace);
    return response(200, {
      received: true,
      reservationCode: confirmedBooking.reservationCode,
      workspaceId: saved.id,
    });
  } catch (error) {
    console.error("stripe-webhook failed", error);
    return response(500, { error: error instanceof Error ? error.message : "Failed to process Stripe webhook" });
  }
};
